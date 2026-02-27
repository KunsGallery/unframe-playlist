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
 * ✅ 업적 정의(JSON 기반) - 3.1 (1.2 확장 포함)
 * id는 고유 문자열.
 * trigger: 어떤 이벤트에서 평가할지.
 * condition: event + profile + context 기반으로 true/false
 *
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
      // 🔧 네 실제 playlistId로 교체
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
  return h >= 2 && h < 6; // 새벽 기준(조정 가능)
}

export function isDaytime(d = new Date()) {
  const h = d.getHours();
  return h >= 9 && h < 18; // 낮 기준(조정 가능)
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
 * rewards: string[] -> object[] 마이그레이션(1.1)
 * + serverTimestamp() 배열 금지 이슈 해결: Timestamp.fromMillis(Date.now()) 사용
 * + yearly/monthly/counters/streak/timeFlags 보강
 */
export async function migrateRewardsToObjects({ db, appId, uid }) {
  const ref = doc(db, "artifacts", appId, "users", uid, "profile", "stats");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() || {};
  const rewards = data?.rewards;

  const year = getYear();
  const month = getMonthKey();

  // 이미 object[]면: 누락 필드만 보강(기존 값 유지)
  if (Array.isArray(rewards) && rewards.length > 0 && typeof rewards[0] === "object") {
    const currentYearUnlocked = data?.yearly?.[String(year)]?.unlocked;
    const currentMonthUnlocked = data?.monthly?.[String(month)]?.unlocked;

    // yearly/monthly가 완전 비어있으면 "현재 rewards 길이"로 기본값
    const fallbackUnlocked = Array.isArray(rewards) ? rewards.length : 0;

    await updateDoc(ref, {
      yearly: data?.yearly || { [String(year)]: { unlocked: (currentYearUnlocked ?? fallbackUnlocked) } },
      monthly: data?.monthly || { [String(month)]: { unlocked: (currentMonthUnlocked ?? fallbackUnlocked) } },

      counters: data?.counters || {
        listens: data?.listenCount || 0,
        completes: 0,
        shares: data?.shareCount || 0,
        likes: 0,
        dailyLikes: {},
        trackPlays: {},
        trackCompletes: {},
        playlistPlays: {},
      },

      streak: data?.streak || { lastActive: null, count: 0, longest: 0 },
      timeFlags: data?.timeFlags || { listenedDay: false, listenedNight: false, weekend: false },
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
        unlockedAt: nowTs, // ✅ 배열 내부: Timestamp OK
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
        trackPlays: {},
        trackCompletes: {},
        playlistPlays: {},
      },

      streak: data?.streak || { lastActive: null, count: 0, longest: 0 },
      timeFlags: data?.timeFlags || { listenedDay: false, listenedNight: false, weekend: false },
    });
  }
}

/**
 * 엔진 생성
 */
export function createAchievementEngine({ db, appId, uid }) {
  const profileRef = doc(db, "artifacts", appId, "users", uid, "profile", "stats");

  const ensureProfileDoc = async () => {
    const snap = await getDoc(profileRef);
    if (snap.exists()) return snap.data();

    const year = getYear();
    const month = getMonthKey();

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
        trackPlays: {},
        trackCompletes: {},
        playlistPlays: {},
      },

      streak: { lastActive: null, count: 0, longest: 0 },
      timeFlags: { listenedDay: false, listenedNight: false, weekend: false },

      profileImg: "",
    };

    await setDoc(profileRef, init, { merge: true });
    return init;
  };

  /**
   * daily_active: 하루 1회만 반영되도록 문서 기준으로 방어
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
      return profile; // 이미 오늘 처리됨
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
   * 업적 해금 (중복 방지)
   * ✅ 배열 내부 FieldValue 금지 -> Timestamp.fromMillis(Date.now()) 사용
   * + yearly/monthly unlocked도 동시에 증가
   */
  const unlock = async ({ profile, rewardId, meta = {} }) => {
    const currentRewards = profile?.rewards || [];
    const ids = getRewardIdSet(currentRewards);
    if (ids.has(rewardId)) return { profile, unlocked: false };

    const year = getYear();
    const month = getMonthKey();

    const rewardObj = {
      id: rewardId,
      unlockedAt: Timestamp.fromMillis(Date.now()), // ✅ 배열 내부 Timestamp OK
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
   * event = {
   *   type,
   *   at: Date,
   *   trackId?,
   *   playlistId?,
   *   progress?,
   *   totalTracks?, likedCount?
   * }
   */
  const processEvent = async (event) => {
    let profile = await ensureProfileDoc();

    // daily_active 자동 처리
    if (["track_play_start", "track_complete", "like_added", "share_card", "playlist_play"].includes(event.type)) {
      profile = await applyDailyActive();
    }

    const d = event.at || new Date();
    const dateKey = getDateKey(d);

    const weekend = isWeekend(d);
    const day = isDaytime(d);
    const night = isNight(d);

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

    if (event.type === "playlist_play" && event.playlistId) {
      await incCounter(`counters.playlistPlays.${event.playlistId}`, 1);
    }

    // 최신 프로필 다시 읽어서 조건 평가 정확도 올림
    profile = (await getDoc(profileRef)).data() || profile;

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
          playlistId: event.playlistId || null,
          progress: event.progress ?? null,
          totalTracks: event.totalTracks ?? null,
          likedCount: event.likedCount ?? null,
          dateKey,
        },
      });

      if (res.unlocked) {
        // ✅ App에서 팝업 찍을 때 쓰는 unlockedAt은 Date로 줘도 되고, Timestamp로 줘도 됨.
        // 여기서는 "즉시 UI"를 위해 Date를 넣음(서버에는 Timestamp가 저장됨).
        unlockedRewards.push({
          id: a.id,
          unlockedAt: new Date(),
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