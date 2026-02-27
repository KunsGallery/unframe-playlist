// src/store.js
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  Timestamp,
} from "firebase/firestore";

/**
 * =========================================================
 * 1) LEVEL 시스템 (A.1)
 * =========================================================
 * - xp를 누적
 * - levelKey/level/color는 xp로 "계산"하지만
 *   성능/표시 편의를 위해 문서에도 저장(levelKey/level)
 * - Admin이 강제로 levelKey를 지정하고 싶다면
 *   (추후 Admin에서) profile에 levelOverrideKey를 넣는 방식으로 확장 가능
 */

/** ✅ 너가 준 15단계 키/색 테이블 */
export const LEVELS = [
  { level: 1, key: "user",        name: "User",        color: "#004AAD", xpMin: 0 },
  { level: 2, key: "newbie",      name: "Newbie",      color: "#1E6BFF", xpMin: 80 },
  { level: 3, key: "fan",         name: "Fan",         color: "#2F8CFF", xpMin: 180 },
  { level: 4, key: "regular",     name: "Regular",     color: "#3FA9FF", xpMin: 320 },
  { level: 5, key: "active",      name: "Active",      color: "#00BFFF", xpMin: 520 },
  { level: 6, key: "maker",       name: "Maker",       color: "#4B5DFF", xpMin: 780 },
  { level: 7, key: "explorer",    name: "Explorer",    color: "#6C63FF", xpMin: 1100 },
  { level: 8, key: "player",      name: "Player",      color: "#FF3CAC", xpMin: 1500 },
  { level: 9, key: "listener",    name: "Listener",    color: "#A855F7", xpMin: 2000 },
  { level: 10, key: "advanced",   name: "Advanced",    color: "#FF7A00", xpMin: 2700 },
  { level: 11, key: "yourpick",   name: "YourPick",    color: "#FFD600", xpMin: 3600 },
  { level: 12, key: "leader",     name: "Leader",      color: "#00E676", xpMin: 4700 },
  { level: 13, key: "influencer", name: "Influencer",  color: "#00F0FF", xpMin: 6100 },
  { level: 14, key: "star",       name: "Star",        color: "#FFC400", xpMin: 7800 },
  { level: 15, key: "trendsetter",name: "Trendsetter", color: "#FF1744", xpMin: 9800 },
];

export function getLevelInfo(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let cur = LEVELS[0];
  for (const l of LEVELS) if (safeXp >= l.xpMin) cur = l;

  const idx = LEVELS.findIndex((l) => l.key === cur.key);
  const next = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];
  const xpMin = cur.xpMin;
  const xpNext = next.xpMin;
  const denom = Math.max(1, xpNext - xpMin);
  const progressPct =
    idx === LEVELS.length - 1
      ? 100
      : Math.min(100, ((safeXp - xpMin) / denom) * 100);

  return {
    ...cur,
    xp: safeXp,
    xpMin,
    xpNext,
    progressPct,
    isMax: idx === LEVELS.length - 1,
  };
}

/**
 * =========================================================
 * 2) XP 지급 규칙(2.1~2.3)
 * =========================================================
 * - 2.1: processEvent 안에서 XP도 같이 처리
 * - 2.2: 완주/일일활동 중심(complete/daily 비중 큼)
 * - 2.3: 스팸 방지(일일 캡/곡당 1회/카드 발급 캡 등)
 *
 * ※ 이 값들은 나중에 운영하면서 쉽게 조정 가능
 */
const XP_RULES = {
  track_play_start: 1,   // 최소 XP (스팸 방지로 강하게 제한)
  track_complete: 10,    // 핵심 XP
  like_added: 2,
  share_card: 5,
  playlist_play: 3,
  daily_active: 3,       // 하루 1회만
};

const XP_CAPS = {
  // 하루에 받을 수 있는 상한 (각 타입별)
  dailyStartCap: 10,     // 재생 시작으로 얻는 XP는 하루 최대 10회만 인정
  dailyLikeCap: 20,      // like_added XP는 하루 최대 20XP까지만 인정(=10회)
  dailyShareCap: 25,     // share_card XP는 하루 최대 25XP까지만 인정(=5회)
  dailyPlaylistCap: 9,   // playlist_play XP는 하루 최대 9XP까지만 인정(=3회)
  dailyTotalCap: 60,     // 모든 XP 총합 일일 상한
};

const COOLDOWN = {
  // track_play_start: 같은 곡 start XP는 하루 1회만(연타 방지)
  startTrackPerDayOnce: true,
};

/**
 * ✅ 업적 정의(JSON 기반)
 * 이벤트 타입(권장)
 * - track_play_start
 * - track_complete (예: 90% 이상)
 * - like_added
 * - share_card
 * - playlist_play
 * - daily_active
 */
export const ACHIEVEMENTS = [
  // 1) 처음 시리즈
  {
    id: "first_listen",
    title: "첫 감상",
    desc: "처음으로 소리를 재생했습니다.",
    trigger: ["track_play_start"],
    condition: ({ has }) => !has("first_listen"),
  },
  {
    id: "first_complete",
    title: "첫 완주",
    desc: "처음으로 한 곡을 끝까지 감상했습니다.",
    trigger: ["track_complete"],
    condition: ({ has }) => !has("first_complete"),
  },
  {
    id: "first_like",
    title: "첫 좋아요",
    desc: "처음으로 좋아요를 남겼습니다.",
    trigger: ["like_added"],
    condition: ({ has }) => !has("first_like"),
  },
  {
    id: "first_share",
    title: "첫 공유",
    desc: "처음으로 아카이브 카드를 발급/공유했습니다.",
    trigger: ["share_card"],
    condition: ({ has }) => !has("first_share"),
  },

  // 2) 감상 시리즈
  {
    id: "repeat_10",
    title: "반복의 의식",
    desc: "같은 곡을 10번 이상 감상했습니다.",
    trigger: ["track_play_start"],
    condition: ({ getCounter }) => {
      return (getCounter("trackPlays.currentTrack") || 0) >= 10;
    },
  },
  {
    id: "complete_10",
    title: "10번의 완주",
    desc: "완주(90%+)를 10회 달성했습니다.",
    trigger: ["track_complete"],
    condition: ({ profile }) => (profile?.counters?.completes || 0) >= 10,
  },
  {
    id: "complete_50",
    title: "50번의 완주",
    desc: "완주(90%+)를 50회 달성했습니다.",
    trigger: ["track_complete"],
    condition: ({ profile }) => (profile?.counters?.completes || 0) >= 50,
  },

  // 3) 좋아요/공유 시리즈
  {
    id: "daily_like_5",
    title: "하루 5좋아요",
    desc: "하루에 5곡 이상 좋아요를 남겼습니다.",
    trigger: ["like_added"],
    condition: ({ profile, dateKey }) => {
      const n = profile?.counters?.dailyLikes?.[dateKey] || 0;
      return n >= 5;
    },
  },
  {
    id: "share_10",
    title: "10회 공유",
    desc: "카드를 10회 발급/공유했습니다.",
    trigger: ["share_card"],
    condition: ({ profile }) => (profile?.counters?.shares || 0) >= 10,
  },
  {
    id: "all_tracks_liked",
    title: "올 컬렉션",
    desc: "전체 곡을 좋아요 했습니다.",
    trigger: ["like_added"],
    condition: ({ event }) => {
      const total = Number(event?.totalTracks || 0);
      const liked = Number(event?.likedCount || 0);
      return total > 0 && liked >= total;
    },
  },

  // 4) 스트릭
  {
    id: "streak_7",
    title: "7일 연속 접속",
    desc: "7일 연속으로 공간에 머물렀습니다.",
    trigger: ["daily_active"],
    condition: ({ profile }) => (profile?.streak?.count || 0) >= 7,
  },
  {
    id: "streak_30",
    title: "30일 연속 접속",
    desc: "30일 연속으로 공간에 머물렀습니다.",
    trigger: ["daily_active"],
    condition: ({ profile }) => (profile?.streak?.count || 0) >= 30,
  },
  {
    id: "streak_100",
    title: "100일 동행",
    desc: "100일 연속으로 공간에 머물렀습니다.",
    trigger: ["daily_active"],
    condition: ({ profile }) => (profile?.streak?.count || 0) >= 100,
  },

  // 5) 시간대: 낮/밤 모두 감상
  {
    id: "day_and_night",
    title: "낮과 밤",
    desc: "낮과 밤 모두 감상했습니다.",
    trigger: ["track_complete", "track_play_start"],
    condition: ({ profile }) =>
      !!profile?.timeFlags?.listenedDay && !!profile?.timeFlags?.listenedNight,
  },

  // 6) 주말 감상
  {
    id: "weekend_listener",
    title: "주말의 여유",
    desc: "주말에 감상했습니다.",
    trigger: ["track_play_start", "track_complete"],
    condition: ({ profile }) => !!profile?.timeFlags?.weekend,
  },

  // 7) 플레이리스트 재생(특정 플레이리스트들 모두)
  {
    id: "playlist_trinity",
    title: "큐레이션 완주",
    desc: "OST/CEO/Director’s pick 플레이리스트를 모두 감상했습니다.",
    trigger: ["playlist_play"],
    condition: ({ profile }) => {
      const p = profile?.counters?.playlistPlays || {};
      // 🔧 네 실제 playlistKey로 교체(권장: playlist 문서에 key 필드)
      const NEED = ["ost", "ceo", "directors_pick"];
      return NEED.every((id) => (p[id] || 0) > 0);
    },
  },
];

/**
 * 날짜 키(스트릭/배치 집계용)
 */
export function getDateKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getMonthKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export function getYear(d = new Date()) {
  return d.getFullYear();
}

export function isWeekend(d = new Date()) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isNight(d = new Date()) {
  const h = d.getHours();
  return h >= 2 && h < 6;
}

export function isDaytime(d = new Date()) {
  const h = d.getHours();
  return h >= 9 && h < 18;
}

/**
 * 내부 유틸: rewards에서 id set 뽑기(string[]/object[] 모두)
 */
function getRewardIdSet(rewards) {
  if (!Array.isArray(rewards) || rewards.length === 0) return new Set();
  if (typeof rewards[0] === "string") return new Set(rewards.filter(Boolean));
  return new Set(rewards.map((r) => r?.id).filter(Boolean));
}

/**
 * ✅ 내부 유틸: dateKey 기반 “일일 카운트/XP” 필드 경로 만들기
 */
function dayField(pathPrefix, dateKey) {
  return `${pathPrefix}.${dateKey}`;
}

/**
 * =========================================================
 * 1.1 마이그레이션: rewards string[] -> object[]
 * + 누락 필드 보강(xp/level 포함)
 * =========================================================
 */
export async function migrateRewardsToObjects({ db, appId, uid }) {
  const ref = doc(db, "artifacts", appId, "users", uid, "profile", "stats");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() || {};
  const rewards = data?.rewards;

  const year = getYear();
  const month = getMonthKey();
  const fallbackUnlocked = Array.isArray(rewards) ? rewards.length : 0;

  // ✅ XP/레벨 기본값 보강
  const xp = Number(data?.xp || 0) || 0;
  const lv = getLevelInfo(xp);

  // 이미 object[]면: 누락 필드만 보강
  if (Array.isArray(rewards) && rewards.length > 0 && typeof rewards[0] === "object") {
    const currentYearUnlocked = data?.yearly?.[String(year)]?.unlocked;
    const currentMonthUnlocked = data?.monthly?.[String(month)]?.unlocked;

    await updateDoc(ref, {
      yearly: data?.yearly || {
        [String(year)]: { unlocked: currentYearUnlocked ?? fallbackUnlocked },
      },
      monthly: data?.monthly || {
        [String(month)]: { unlocked: currentMonthUnlocked ?? fallbackUnlocked },
      },

      counters: data?.counters || {
        listens: data?.listenCount || 0,
        completes: 0,
        shares: data?.shareCount || 0,
        likes: 0,
        dailyLikes: {},
        dailyXp: {},
        dailyStartXp: {},
        dailyLikeXp: {},
        dailyShareXp: {},
        dailyPlaylistXp: {},
        startTrackDay: {},     // start XP 곡당 1회 제한용
        trackPlays: {},
        trackCompletes: {},
        playlistPlays: {},
      },

      streak: data?.streak || { lastActive: null, count: 0, longest: 0 },
      timeFlags:
        data?.timeFlags || { listenedDay: false, listenedNight: false, weekend: false },

      // ✅ XP/레벨 필드 보강(기존 유지)
      xp: xp,
      levelKey: data?.levelKey || lv.key,
      level: data?.level || lv.level,
      levelUpdatedAt: data?.levelUpdatedAt || Timestamp.fromMillis(Date.now()),
    });
    return;
  }

  // string[] 또는 빈 배열이면 변환
  if (Array.isArray(rewards)) {
    const nowTs = Timestamp.fromMillis(Date.now());
    const converted = rewards
      .filter((id) => typeof id === "string" && id.trim())
      .map((id) => ({
        id,
        unlockedAt: nowTs,
        year,
        meta: { migrated: true },
      }));

    await updateDoc(ref, {
      rewards: converted,
      yearly: data?.yearly || { [String(year)]: { unlocked: converted.length } },
      monthly: data?.monthly || { [String(month)]: { unlocked: converted.length } },

      counters: data?.counters || {
        listens: data?.listenCount || 0,
        completes: 0,
        shares: data?.shareCount || 0,
        likes: 0,
        dailyLikes: {},
        dailyXp: {},
        dailyStartXp: {},
        dailyLikeXp: {},
        dailyShareXp: {},
        dailyPlaylistXp: {},
        startTrackDay: {},
        trackPlays: {},
        trackCompletes: {},
        playlistPlays: {},
      },

      streak: data?.streak || { lastActive: null, count: 0, longest: 0 },
      timeFlags:
        data?.timeFlags || { listenedDay: false, listenedNight: false, weekend: false },

      // ✅ XP/레벨 기본값
      xp: xp,
      levelKey: data?.levelKey || lv.key,
      level: data?.level || lv.level,
      levelUpdatedAt: data?.levelUpdatedAt || nowTs,
    });
  }
}

/**
 * =========================================================
 * 엔진 생성
 * =========================================================
 */
export function createAchievementEngine({ db, appId, uid }) {
  const profileRef = doc(db, "artifacts", appId, "users", uid, "profile", "stats");

  const ensureProfileDoc = async () => {
    const snap = await getDoc(profileRef);
    if (snap.exists()) return snap.data();

    const year = getYear();
    const month = getMonthKey();
    const lv = getLevelInfo(0);

    const init = {
      listenCount: 0,
      shareCount: 0,
      firstJoin: Date.now(),

      rewards: [],

      yearly: { [String(year)]: { unlocked: 0 } },
      monthly: { [String(month)]: { unlocked: 0 } },

      counters: {
        listens: 0,
        completes: 0,
        shares: 0,
        likes: 0,
        dailyLikes: {},
        dailyXp: {},
        dailyStartXp: {},
        dailyLikeXp: {},
        dailyShareXp: {},
        dailyPlaylistXp: {},
        startTrackDay: {},
        trackPlays: {},
        trackCompletes: {},
        playlistPlays: {},
      },

      streak: { lastActive: null, count: 0, longest: 0 },
      timeFlags: { listenedDay: false, listenedNight: false, weekend: false },

      profileImg: "",

      // ✅ XP/레벨
      xp: 0,
      levelKey: lv.key,
      level: lv.level,
      levelUpdatedAt: Timestamp.fromMillis(Date.now()),
    };

    await setDoc(profileRef, init, { merge: true });
    return init;
  };

  /**
   * daily_active: 하루 1회만 반영되도록 문서 기준 방어
   */
  const applyDailyActive = async () => {
    const profile = await ensureProfileDoc();
    const today = getDateKey();
    const last = profile?.streak?.lastActive;

    let nextCount = profile?.streak?.count || 0;
    let longest = profile?.streak?.longest || 0;

    if (!last) {
      nextCount = 1;
    } else if (last === today) {
      return profile;
    } else {
      const lastDate = new Date(`${last}T00:00:00`);
      const now = new Date(`${today}T00:00:00`);
      const diffDays = Math.round((now - lastDate) / 86400000);
      nextCount = diffDays === 1 ? nextCount + 1 : 1;
    }

    longest = Math.max(longest, nextCount);

    await updateDoc(profileRef, {
      "streak.lastActive": today,
      "streak.count": nextCount,
      "streak.longest": longest,
    });

    return { ...profile, streak: { lastActive: today, count: nextCount, longest } };
  };

  /**
   * ✅ XP 지급 + 레벨 갱신(2.1~2.3)
   * - 먼저 캡/쿨다운 체크 후 xpAdd 결정
   * - xp는 increment로 올리고, 다시 읽어서 레벨 계산 후 levelKey/level 업데이트
   */
  const applyXp = async ({ profile, type, dateKey, trackId, playlistKey }) => {
    const base = Number(XP_RULES[type] || 0);
    if (!base) return { xpAdded: 0 };

    const p = profile || {};
    const counters = p.counters || {};
    const todayTotalXp = Number(counters?.dailyXp?.[dateKey] || 0);

    // ✅ 일일 총합 캡
    if (todayTotalXp >= XP_CAPS.dailyTotalCap) return { xpAdded: 0 };

    let xpAdd = base;

    // ✅ 타입별 캡
    if (type === "track_play_start") {
      const todayStartXp = Number(counters?.dailyStartXp?.[dateKey] || 0);
      if (todayStartXp >= XP_CAPS.dailyStartCap) return { xpAdded: 0 };

      // ✅ 곡당 하루 1회 start XP (연타 방지)
      if (COOLDOWN.startTrackPerDayOnce && trackId) {
        const key = `${trackId}__${dateKey}`;
        const already = !!counters?.startTrackDay?.[key];
        if (already) return { xpAdded: 0 };

        // mark 먼저(동시성 완화)
        await updateDoc(profileRef, {
          [dayField("counters.startTrackDay", key)]: true,
        });
      }
    }

    if (type === "like_added") {
      const todayLikeXp = Number(counters?.dailyLikeXp?.[dateKey] || 0);
      if (todayLikeXp >= XP_CAPS.dailyLikeCap) return { xpAdded: 0 };
    }

    if (type === "share_card") {
      const todayShareXp = Number(counters?.dailyShareXp?.[dateKey] || 0);
      if (todayShareXp >= XP_CAPS.dailyShareCap) return { xpAdded: 0 };
    }

    if (type === "playlist_play") {
      const todayPlXp = Number(counters?.dailyPlaylistXp?.[dateKey] || 0);
      if (todayPlXp >= XP_CAPS.dailyPlaylistCap) return { xpAdded: 0 };
      // playlist는 같은 키로 하루 1회만 주고 싶으면 여기서 확장 가능
      // (지금은 dailyPlaylistCap으로만 제한)
      void playlistKey;
    }

    // ✅ 총합 캡에 걸리지 않게 마지막 조정
    const remain = XP_CAPS.dailyTotalCap - todayTotalXp;
    xpAdd = Math.max(0, Math.min(xpAdd, remain));
    if (!xpAdd) return { xpAdded: 0 };

    const updates = {
      xp: increment(xpAdd),
      [dayField("counters.dailyXp", dateKey)]: increment(xpAdd),
    };

    if (type === "track_play_start") {
      updates[dayField("counters.dailyStartXp", dateKey)] = increment(xpAdd);
    } else if (type === "like_added") {
      updates[dayField("counters.dailyLikeXp", dateKey)] = increment(xpAdd);
    } else if (type === "share_card") {
      updates[dayField("counters.dailyShareXp", dateKey)] = increment(xpAdd);
    } else if (type === "playlist_play") {
      updates[dayField("counters.dailyPlaylistXp", dateKey)] = increment(xpAdd);
    }

    await updateDoc(profileRef, updates);

    // ✅ 레벨 재계산
    const after = await getDoc(profileRef);
    const afterProfile = after.data() || {};
    const newXp = Number(afterProfile?.xp || 0) || 0;
    const lv = getLevelInfo(newXp);

    // levelKey/level이 바뀌었거나 누락이면 업데이트
    if (afterProfile?.levelKey !== lv.key || afterProfile?.level !== lv.level) {
      await updateDoc(profileRef, {
        levelKey: lv.key,
        level: lv.level,
        levelUpdatedAt: Timestamp.fromMillis(Date.now()),
      });
    }

    return { xpAdded: xpAdd };
  };

  /**
   * 업적 해금 (중복 방지)
   * ✅ 배열 내부 FieldValue 금지 -> Timestamp.fromMillis(Date.now())
   */
  const unlock = async ({ profile, rewardId, meta = {} }) => {
    const currentRewards = profile?.rewards || [];
    const ids = getRewardIdSet(currentRewards);
    if (ids.has(rewardId)) return { profile, unlocked: false };

    const year = getYear();
    const month = getMonthKey();

    const rewardObj = {
      id: rewardId,
      unlockedAt: Timestamp.fromMillis(Date.now()),
      year,
      meta,
    };

    const yearlyKey = `yearly.${String(year)}.unlocked`;
    const monthlyKey = `monthly.${String(month)}.unlocked`;

    await updateDoc(profileRef, {
      rewards: [...currentRewards, rewardObj],
      [yearlyKey]: increment(1),
      [monthlyKey]: increment(1),
    });

    const newProfile = {
      ...profile,
      rewards: [...currentRewards, rewardObj],
      yearly: {
        ...(profile?.yearly || {}),
        [String(year)]: { unlocked: ((profile?.yearly?.[String(year)]?.unlocked || 0) + 1) },
      },
      monthly: {
        ...(profile?.monthly || {}),
        [String(month)]: { unlocked: ((profile?.monthly?.[String(month)]?.unlocked || 0) + 1) },
      },
    };

    return { profile: newProfile, unlocked: true, reward: rewardObj };
  };

  /**
   * 카운터 업데이트 helpers
   */
  const incCounter = async (fieldPath, by = 1) => {
    await updateDoc(profileRef, { [fieldPath]: increment(by) });
  };

  const setFlag = async (fieldPath, value) => {
    await updateDoc(profileRef, { [fieldPath]: value });
  };

  /**
   * 이벤트 처리
   *
   * event = {
   *   type,
   *   at: Date,
   *   trackId?,
   *   playlistId?,      // (구버전)
   *   playlistKey?,     // ✅ (추천) 고정 키
   *   progress?,
   *   totalTracks?, likedCount?
   * }
   */
  const processEvent = async (event) => {
    let profile = await ensureProfileDoc();

    const d = event.at || new Date();
    const dateKey = getDateKey(d);

    // ✅ daily_active 자동 처리
    if (["track_play_start", "track_complete", "like_added", "share_card", "playlist_play"].includes(event.type)) {
      profile = await applyDailyActive();
    }

    const weekend = isWeekend(d);
    const day = isDaytime(d);
    const night = isNight(d);

    // ✅ playlistKey 우선 (1.3 "키를 직접 지정"의 핵심)
    const playlistKey = event.playlistKey || event.playlistId || null;

    /**
     * -----------------------
     * 1) 이벤트별 카운터 처리
     * -----------------------
     */
    if (event.type === "track_play_start") {
      await incCounter("counters.listens", 1);
      await updateDoc(profileRef, { listenCount: increment(1) });

      if (event.trackId) {
        await incCounter(`counters.trackPlays.${event.trackId}`, 1);
      }

      if (weekend) await setFlag("timeFlags.weekend", true);
      if (day) await setFlag("timeFlags.listenedDay", true);
      if (night) await setFlag("timeFlags.listenedNight", true);
    }

    if (event.type === "track_complete") {
      await incCounter("counters.completes", 1);

      if (event.trackId) {
        await incCounter(`counters.trackCompletes.${event.trackId}`, 1);
      }

      if (weekend) await setFlag("timeFlags.weekend", true);
      if (day) await setFlag("timeFlags.listenedDay", true);
      if (night) await setFlag("timeFlags.listenedNight", true);
    }

    if (event.type === "like_added") {
      await incCounter("counters.likes", 1);
      await incCounter(`counters.dailyLikes.${dateKey}`, 1);
    }

    if (event.type === "share_card") {
      await incCounter("counters.shares", 1);
      await updateDoc(profileRef, { shareCount: increment(1) });
    }

    if (event.type === "playlist_play" && playlistKey) {
      await incCounter(`counters.playlistPlays.${playlistKey}`, 1);
    }

    /**
     * -----------------------
     * 2) XP 처리 (2.1~2.3)
     * -----------------------
     * - daily_active는 applyDailyActive에서 처리되지만,
     *   XP 지급도 원하면 여기서 1회 지급하도록 처리
     */
    // 최신 profile 한번 더 읽어서 XP 캡 정확히
    profile = (await getDoc(profileRef)).data() || profile;

    // ✅ daily_active XP는 "오늘 처음 활동"에만 지급하고 싶다면:
    // streak.lastActive가 오늘이면 이미 applyDailyActive에서 처리된 상태
    // 여기서는 "중요 이벤트"마다 XP 주는 구조이므로
    // daily_active XP는 별도 지급하지 않고,
    // 대신 track_complete/daily start 등에 분산 지급하는 것이 일반적.
    // 하지만 너는 daily_active도 XP를 원했으니, 아래처럼 지급:
    //
    // ⚠️ 스팸 방지: daily_active는 사실상 applyDailyActive가 1일 1회만 변하므로,
    // 아래 지급은 "오늘 이미 지급했는지" 체크가 필요.
    //
    // -> 간단하게 counters.dailyActiveXp[dateKey]로 가드.
    if (["track_play_start", "track_complete", "like_added", "share_card", "playlist_play"].includes(event.type)) {
      // (선택) "오늘 첫 활동" XP 주기: dailyActiveXp 가드
      const alreadyDailyActiveXp = Number(profile?.counters?.dailyActiveXp?.[dateKey] || 0) > 0;
      if (!alreadyDailyActiveXp) {
        // 1회 지급 마킹 + XP 지급
        await updateDoc(profileRef, { [dayField("counters.dailyActiveXp", dateKey)]: 1 });
        await applyXp({ profile, type: "daily_active", dateKey, trackId: event.trackId, playlistKey });
        profile = (await getDoc(profileRef)).data() || profile;
      }
    }

    // 이벤트 자체 XP
    if (event.type === "track_play_start") {
      await applyXp({ profile, type: "track_play_start", dateKey, trackId: event.trackId, playlistKey });
    }
    if (event.type === "track_complete") {
      await applyXp({ profile, type: "track_complete", dateKey, trackId: event.trackId, playlistKey });
    }
    if (event.type === "like_added") {
      await applyXp({ profile, type: "like_added", dateKey, trackId: event.trackId, playlistKey });
    }
    if (event.type === "share_card") {
      await applyXp({ profile, type: "share_card", dateKey, trackId: event.trackId, playlistKey });
    }
    if (event.type === "playlist_play") {
      await applyXp({ profile, type: "playlist_play", dateKey, trackId: event.trackId, playlistKey });
    }

    // ✅ 다시 최신 프로필(업적 조건/카운터가 최신인 상태로 평가)
    profile = (await getDoc(profileRef)).data() || profile;

    /**
     * -----------------------
     * 3) 업적 평가/해금
     * -----------------------
     */
    const rewardIds = getRewardIdSet(profile.rewards);

    const helpers = {
      profile,
      event,
      dateKey,
      has: (id) => rewardIds.has(id),
      getCounter: (key) => {
        if (key === "trackPlays.currentTrack") {
          const tid = event.trackId;
          return tid ? (profile?.counters?.trackPlays?.[tid] || 0) : 0;
        }
        return 0;
      },
    };

    const unlockedRewards = [];

    for (const a of ACHIEVEMENTS) {
      if (!a.trigger.includes(event.type)) continue;
      if (rewardIds.has(a.id)) continue;

      let ok = false;
      try {
        ok = !!a.condition(helpers);
      } catch {
        ok = false;
      }
      if (!ok) continue;

      const res = await unlock({
        profile,
        rewardId: a.id,
        meta: {
          via: event.type,
          trackId: event.trackId || null,
          playlistId: playlistKey || null, // ✅ 키 기반으로 기록
          progress: event.progress ?? null,
          totalTracks: event.totalTracks ?? null,
          likedCount: event.likedCount ?? null,
          dateKey,
        },
      });

      if (res.unlocked) {
        unlockedRewards.push({
          id: a.id,
          unlockedAt: new Date(), // 즉시 UI용
          meta: res.reward?.meta || {},
        });
        profile = res.profile;
      }
    }

    return { profile, unlockedRewards };
  };

  return {
    ensureProfileDoc,
    migrateRewardsToObjects: () => migrateRewardsToObjects({ db, appId, uid }),
    processEvent,
  };
}