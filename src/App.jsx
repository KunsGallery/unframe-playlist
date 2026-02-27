// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { domToPng } from 'modern-screenshot';
import confetti from 'canvas-confetti';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,            // ✅ FIX: setDoc 누락 보완
  collection,
  onSnapshot,
  query,
  deleteDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Loader2,
  Music,
  Heart,
  Moon,
  Ghost,
  CheckCircle2,
  Sparkles,
  Share,
  Trophy,
  Repeat,
  Calendar,
  Star,
  Target,
  Medal,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import About from './pages/About';
import ScrollToTop from './components/ScrollToTop';

import { createAchievementEngine } from './store';
import { getLevelInfo } from './levels';

// --- ⚙️ Firebase 설정 ---
const firebaseConfig = {
  apiKey: "AIzaSyC_2CzowR-eA7m9dffHheEmOxWM0PKE6Is",
  authDomain: "unframe-playlist.firebaseapp.com",
  projectId: "unframe-playlist",
  storageBucket: "unframe-playlist.firebasestorage.app",
  messagingSenderId: "875707095707",
  appId: "1:875707095707:web:0ece5489c652a6d4a0843e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = 'unframe-playlist-v1';
const ADMIN_EMAILS = ['gallerykuns@gmail.com', 'sylove887@gmail.com'];

// ---------------------
// 날짜 포맷
// ---------------------
const formatDateTime = (input) => {
  let d = null;
  if (!input) d = new Date();
  else if (typeof input === 'number') d = new Date(input);
  else if (input?.toDate) d = input.toDate();
  else if (input instanceof Date) d = input;
  else d = new Date();

  const week = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.(${week[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getDirectLink = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === "") return "";
  if (url.includes("dropbox.com")) {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/\?dl=\d/, "")
      .replace(/&dl=\d/, "");
  }
  return url;
};

// 이미지 로딩 대기
const waitForImages = async (root) => {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((res) => { img.onload = res; img.onerror = res; });
  }));
};

// ✅ CORS 회피용: url -> dataURL 변환
const toDataUrl = async (url) => {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// ---------------------
// ✅ 라우트 렌더 격리(hover 무한 반복 방지 핵심)
// ---------------------
const AppRoutes = memo(function AppRoutes({
  publicTracks,
  playlists,
  isPlaying,
  playTrack,
  userLikes,
  handleToggleLike,
  setSelectedTrack,
  db,
  siteConfig,
  allUsers,
  rankingTheme,
  user,
  userProfile,
  membership,
  tracks,
  handleShare,
  isAdmin,
  setToastMessage,
}) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            tracks={publicTracks}
            playlists={playlists}
            isPlaying={isPlaying}
            playTrack={playTrack}
            userLikes={userLikes}
            handleToggleLike={handleToggleLike}
            setSelectedTrack={setSelectedTrack}
            db={db}
            siteConfig={siteConfig}
            allUsers={allUsers}
            rankingTheme={rankingTheme}
          />
        }
      />
      <Route
        path="/archive"
        element={
          <Archive
            user={user}
            userProfile={userProfile}
            membership={membership}
            userLikes={userLikes}
            tracks={tracks}
            handleShare={handleShare}
            signOut={() => signOut(auth)}
            db={db}
            appId={appId}
            handleGoogleLogin={() => signInWithPopup(auth, new GoogleAuthProvider())}
            setSelectedTrack={setSelectedTrack}
            rankingTheme={rankingTheme}
            allUsers={allUsers}
          />
        }
      />
      <Route path="/about" element={<About siteConfig={siteConfig} />} />
      <Route
        path="/admin"
        element={
          <Admin
            isAdmin={isAdmin}
            user={user}
            tracks={tracks}
            playlists={playlists}
            db={db}
            appId={appId}
            setToastMessage={setToastMessage}
          />
        }
      />
    </Routes>
  );
});

export default function App() {
  // --- 상태 ---
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [userLikes, setUserLikes] = useState([]);

  // ✅ rewards object[] + xp/level + nickname
  const [userProfile, setUserProfile] = useState({
    listenCount: 0,
    shareCount: 0,
    firstJoin: Date.now(),
    rewards: [],
    yearly: {},
    monthly: {},
    counters: {},
    streak: {},
    timeFlags: {},
    profileImg: '',
    xp: 0,
    levelKey: 'user',
    level: 1,

    // ✅ 닉네임 시스템
    nickname: '',
    nicknameUpdatedCount: 0,  // 0이면 1회 변경 가능, 1이면 잠금
    nicknamePrompted: false,  // 최초 안내 팝업 보여줬는지
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);

  // ⚠️ player time updates are frequent → Routes are memo’d
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const [currentQueue, setCurrentQueue] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [shareItem, setShareItem] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  const [rankingTheme, setRankingTheme] = useState({
    id: 'night_owl',
    title: '심야의 감상자',
    desc: '밤을 수집하는 리스너',
    icon: Moon,
  });

  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [playerView, setPlayerView] = useState('cover');

  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);

  const [siteConfig, setSiteConfig] = useState({ title: 'UNFRAME', subTitle: 'PLAYLIST' });

  // ✅ 업적 팝업: {id, unlockedAt, meta}
  const [newAchievement, setNewAchievement] = useState(null);

  // ✅ 토스트 클릭 다운로드용
  const [lastCardUrl, setLastCardUrl] = useState(null);

  // ✅ 닉네임 1회 변경 팝업
  const [isNickModalOpen, setIsNickModalOpen] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [nickError, setNickError] = useState("");

  // refs
  const audioRef = useRef(null);
  const shareCardRef = useRef(null);

  // ✅ 업적 엔진
  const engineRef = useRef(null);

  // ✅ 완주 이벤트 1회 처리
  const completedOnceRef = useRef(new Set());
  const playSessionRef = useRef({ startedAt: 0, trackId: null, playlistKey: null });

  // ✅ MediaSession action handlers용 최신값 refs (iOS 잠금화면 next/prev 안정)
  const queueRef = useRef([]);
  const idxRef = useRef(0);
  const playTrackRef = useRef(null);

  useEffect(() => { queueRef.current = currentQueue || []; }, [currentQueue]);
  useEffect(() => { idxRef.current = currentTrackIdx || 0; }, [currentTrackIdx]);

  // --- derived ---
  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);

  const currentTrack = useMemo(() => {
    if (!currentQueue || currentQueue.length === 0) return null;
    return currentQueue[currentTrackIdx] ?? null;
  }, [currentQueue, currentTrackIdx]);

  // ✅ 엔진에서 관리하는 XP/레벨 기반
  const levelInfo = useMemo(() => getLevelInfo(userProfile?.xp || 0), [userProfile?.xp]);

  // ✅ membership prop를 “레벨 배지”로 사용
  const membership = useMemo(() => {
    return {
      name: levelInfo?.name || "User",
      color: levelInfo?.color || "#004AAD",
      bg: `${(levelInfo?.color || "#004AAD")}22`,
      icon: Sparkles,
      key: levelInfo?.key || "user",
      level: levelInfo?.level || 1,
      xp: levelInfo?.xp || 0,
      progressPct: levelInfo?.progressPct || 0,
      xpMin: levelInfo?.xpMin || 0,
      xpNext: levelInfo?.xpNext || 0,
      isMax: !!levelInfo?.isMax,
    };
  }, [levelInfo]);

  // ✅ UI에 쓰는 이름(닉네임 우선)
  const displayName = useMemo(() => {
    const nick = (userProfile?.nickname || "").trim();
    if (nick) return nick;
    return user?.displayName || (user?.isAnonymous ? "Guest" : "Collector");
  }, [userProfile?.nickname, user]);

  const formatTime = useCallback((time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  }, []);

  // ✅ 이벤트 처리 helper
  const emit = useCallback(async (event) => {
    const engine = engineRef.current;
    if (!engine || !user) return;

    const res = await engine.processEvent({ ...event, at: event.at || new Date() });

    if (res?.unlockedRewards?.length) {
      const last = res.unlockedRewards[res.unlockedRewards.length - 1];
      setNewAchievement(last);
      confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
    }
  }, [user]);

  // --- 재생 ---
  // ✅ playlistKey 우선 지원 (store.js가 playlistKey 먼저 봄)
  const playTrack = useCallback(async (idx, queue = null, context = null) => {
    const audio = audioRef.current;
    if (!audio) return;

    const activeQueue = queue ?? queueRef.current ?? currentQueue;
    if (queue && queue !== currentQueue) setCurrentQueue(queue);

    const targetIdx = idx !== undefined ? idx : idxRef.current ?? currentTrackIdx;
    const targetTrack = activeQueue?.[targetIdx];
    if (!targetTrack) return;

    const directUrl = getDirectLink(targetTrack.audioUrl);
    if (!directUrl) return;

    try {
      if (audio.src !== directUrl) {
        audio.pause();
        audio.src = directUrl;
        audio.load();
      }

      if (idx !== undefined) setCurrentTrackIdx(targetIdx);

      playSessionRef.current = {
        startedAt: Date.now(),
        trackId: targetTrack.id,
        playlistKey: context?.playlistKey || context?.playlistId || null,
      };

      await emit({ type: "track_play_start", trackId: targetTrack.id });

      if (context?.playlistKey || context?.playlistId) {
        await emit({
          type: "playlist_play",
          playlistKey: context?.playlistKey || null,
          playlistId: context?.playlistId || null,
          trackId: targetTrack.id,
        });
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  }, [currentQueue, currentTrackIdx, emit]);

  // ✅ MediaSession에서 참조하도록 ref에 최신 playTrack 보관
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  // ✅ 다음/이전 트랙 함수(잠금화면에서도 사용)
  const playNext = useCallback(() => {
    const q = queueRef.current || [];
    if (!q.length) return;
    const i = idxRef.current || 0;
    const nextIdx = (i + 1) % q.length;
    playTrackRef.current?.(nextIdx, q, null);
  }, []);

  const playPrev = useCallback(() => {
    const q = queueRef.current || [];
    if (!q.length) return;
    const i = idxRef.current || 0;
    const prevIdx = (i - 1 + q.length) % q.length;
    playTrackRef.current?.(prevIdx, q, null);
  }, []);

  const handleToggleLike = useCallback(async (e, trackId) => {
    if (e) e.stopPropagation();
    if (!user || !trackId) return;

    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);

    if (userLikes.includes(trackId)) {
      await deleteDoc(likeDoc);
      return;
    }

    await setDoc(likeDoc, { likedAt: Date.now() });
    setToastMessage("아카이브에 기록되었습니다 💗");

    await emit({
      type: "like_added",
      trackId,
      totalTracks: (publicTracks?.length || 0),
      likedCount: (userLikes?.length || 0) + 1,
    });
  }, [user, userLikes, publicTracks, emit]);

  // ✅ share 시 image를 dataURL로 변환(캡처 안정화)
  const handleShare = useCallback(async (e, item, type = 'track') => {
    if (e) e.stopPropagation();

    let safeImage = item?.image ?? "";
    if (typeof safeImage === "string" && safeImage.trim() !== "") {
      const direct = getDirectLink(safeImage);
      const dataUrl = await toDataUrl(direct);
      safeImage = dataUrl ?? "";
    }

    setShareItem({
      ...item,
      type,
      image: safeImage,
      title: item?.title ?? "UNFRAME",
      desc: item?.desc ?? "",
      color: item?.color ?? "#7dd3fc",
      icon: item?.icon,
      unlockedAt: item?.unlockedAt || null,
    });

    await emit({ type: "share_card", trackId: item?.id || null });
  }, [emit]);

  // --- Auth/Scroll ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(!!(u?.email && ADMIN_EMAILS.includes(u.email.toLowerCase())));
      if (u) setLoading(false);
      else signInAnonymously(auth).then(() => setLoading(false));
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    return () => {
      unsubAuth();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // --- Firestore Sync + 엔진 초기화 + 마이그레이션(1.1) ---
  useEffect(() => {
    if (!user) return;

    engineRef.current = createAchievementEngine({ db, appId, uid: user.uid });
    engineRef.current.migrateRewardsToObjects().catch(() => {});

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setUserProfile(data);

      // ✅ 닉네임 기본값/필드 보강 + 최초 안내 팝업
      // - google 로그인(anonymous 아님)일 때만 적용
      if (!user.isAnonymous) {
        const hasNickname = typeof data?.nickname === 'string' && data.nickname.trim();
        const prompted = !!data?.nicknamePrompted;
        const updatedCount = Number(data?.nicknameUpdatedCount || 0);

        // nickname이 아예 없으면: 구글 displayName을 기본 닉네임으로 세팅(변경권은 유지)
        if (!hasNickname) {
          const base = (user.displayName || "Collector").trim();
          await setDoc(profileRef, {
            nickname: base,
            nicknameUpdatedCount: Number.isFinite(updatedCount) ? updatedCount : 0,
            nicknamePrompted: prompted,
          }, { merge: true }).catch(() => {});
        }

        // 아직 안내 안 했으면: 1회 변경 안내 팝업
        if (!prompted) {
          setNickInput((data?.nickname || user.displayName || "").trim());
          setNickError("");
          setIsNickModalOpen(true);
          await setDoc(profileRef, { nicknamePrompted: true }, { merge: true }).catch(() => {});
        }
      }
    });

    const unsubPublicUsers = onSnapshot(
      collection(db, 'artifacts', appId, 'public_stats'),
      (snap) => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubTracks = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'tracks')),
      (snap) => {
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTracks(loaded);
        setCurrentQueue((prev) => (prev?.length ? prev : loaded.filter(t => !t.isHidden)));
      }
    );

    const unsubPlaylists = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'playlists')),
      (snap) => setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubLikes = onSnapshot(
      collection(db, 'artifacts', appId, 'users', user.uid, 'likes'),
      (snap) => setUserLikes(snap.docs.map(d => d.id))
    );

    getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts'))
      .then(snap => { if (snap.exists()) setSiteConfig((p) => ({ ...p, ...snap.data() })); })
      .catch(() => {});

    return () => {
      unsubProfile();
      unsubPublicUsers();
      unsubTracks();
      unsubPlaylists();
      unsubLikes();
    };
  }, [user]);

  // ✅ public_stats 업데이트 (랭킹/홈 표시용)
  // ✅ nickname 우선 반영 + 엔진 XP/레벨 반영 + (FIX) manual override 우선
  useEffect(() => {
    if (!user) return;

    const xp = Number(userProfile?.xp || 0) || 0;
    const lv = getLevelInfo(xp);

    const nameForPublic = (userProfile?.nickname || "").trim()
      || user?.displayName
      || (user?.isAnonymous ? "Guest" : "Collector");

    // ✅ FIX: manual override 우선 적용
    const manualName = (userProfile?.manualLevelName || "").trim();
    const manualColor = (userProfile?.manualLevelColor || "").trim();
    const finalLevelName = manualName || lv.name;
    const finalLevelColor = manualName ? (manualColor || lv.color) : lv.color;

    setDoc(doc(db, 'artifacts', appId, 'public_stats', user.uid), {
      displayName: nameForPublic,
      nickname: (userProfile?.nickname || "").trim(), // (선택) 검색/일관성
      profileImg: userProfile?.profileImg || "",
      listenCount: userProfile?.listenCount || 0,
      shareCount: userProfile?.shareCount || 0,

      xp,
      levelKey: lv.key,
      level: lv.level,
      levelName: finalLevelName,
      levelColor: finalLevelColor,
    }, { merge: true }).catch(() => {});
  }, [user, userProfile]);

  // ✅ 재생/완주 트래킹: 90% 이상이면 complete 이벤트 1회
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      const tid = currentTrack?.id;
      if (!tid) return;

      const dur = audio.duration;
      const cur = audio.currentTime;
      if (!dur || dur <= 0) return;

      const pct = cur / dur;
      if (pct >= 0.9) {
        const key = `${tid}:${playSessionRef.current.startedAt}`;
        if (!completedOnceRef.current.has(key)) {
          completedOnceRef.current.add(key);
          emit({ type: "track_complete", trackId: tid, progress: pct });
        }
      }
    };

    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [currentTrack?.id, emit]);

  // ✅ 트랙 끝나면 다음 곡 자동 재생
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      playNext();
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [playNext]);

  // ✅ Media Session: 메타데이터 + action handlers (아이폰 잠금화면 next/prev 핵심)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const audio = audioRef.current;

    // action handlers는 트랙이 없어도 미리 등록해두는 게 안정적
    try {
      navigator.mediaSession.setActionHandler('play', async () => {
        if (!audio) return;
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {}
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (!audio) return;
        audio.pause();
        setIsPlaying(false);
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (!audio) return;
        if (typeof details.seekTime === 'number') {
          audio.currentTime = details.seekTime;
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (!audio) return;
        const offset = details.seekOffset || 10;
        audio.currentTime = Math.max(0, audio.currentTime - offset);
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (!audio) return;
        const offset = details.seekOffset || 10;
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + offset);
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      });
    } catch {
      // iOS 일부 버전에서 setActionHandler가 throw 될 수 있음
    }

    // metadata는 currentTrack 기준
    if (!currentTrack) return;

    const artworkUrl = currentTrack.image ? getDirectLink(currentTrack.image) : "";

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title ?? 'UNFRAME',
        artist: currentTrack.artist ?? '',
        album: currentTrack.album ?? 'UNFRAME PLAYLIST',
        artwork: artworkUrl ? [
          { src: artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        ] : [],
      });
    } catch {}
  }, [currentTrack, playNext, playPrev]);

  // ✅ 닉네임 저장(1회)
  const saveNicknameOnce = useCallback(async () => {
    if (!user || user.isAnonymous) return;

    const nextNick = (nickInput || "").trim();
    if (nextNick.length < 2) {
      setNickError("닉네임은 2자 이상 입력해 주세요.");
      return;
    }
    if (nextNick.length > 16) {
      setNickError("닉네임은 16자 이하로 입력해 주세요.");
      return;
    }
    // 간단한 허용 문자(한글/영문/숫자/공백/_-)
    const ok = /^[a-zA-Z0-9가-힣 _-]+$/.test(nextNick);
    if (!ok) {
      setNickError("닉네임은 한글/영문/숫자/공백/_- 만 사용할 수 있어요.");
      return;
    }

    const count = Number(userProfile?.nicknameUpdatedCount || 0);
    if (count >= 1) {
      setNickError("닉네임은 1회만 변경할 수 있어요.");
      return;
    }

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');

    try {
      await setDoc(profileRef, {
        nickname: nextNick,
        nicknameUpdatedCount: 1,
      }, { merge: true });

      setToastMessage("닉네임이 설정되었습니다 ✨");
      setIsNickModalOpen(false);
    } catch (e) {
      console.error(e);
      setNickError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [user, userProfile?.nicknameUpdatedCount, nickInput]);

  // --- 카드 캡처 & 공유/다운로드 ---
  useEffect(() => {
    const downloadDataUrl = (dataUrl) => {
      const link = document.createElement('a');
      link.download = 'unframe-card.png';
      link.href = dataUrl;
      link.click();
    };

    const generateImage = async () => {
      if (!shareItem || !shareCardRef.current) return;

      try {
        setToastMessage("디지털 카드 발급 중... ✨");

        if (document.fonts?.ready) await document.fonts.ready;
        await waitForImages(shareCardRef.current);

        const dataUrl = await domToPng(shareCardRef.current, {
          backgroundColor: '#1a1a1a',
          scale: 3,
        });

        setLastCardUrl(dataUrl);

        if (navigator.share) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], 'unframe.png', { type: 'image/png' });

          try {
            await navigator.share({ files: [file], title: 'UNFRAME' });
            setToastMessage("발급 완료 📸 (토스트 클릭=다운로드)");
          } catch (err) {
            if (err?.name === 'AbortError') {
              setToastMessage("공유가 취소되었습니다. (토스트 클릭=다운로드)");
              return;
            }
            downloadDataUrl(dataUrl);
            setToastMessage("공유 실패 → 다운로드로 저장했습니다 📥 (토스트 클릭=다운로드)");
          }
        } else {
          downloadDataUrl(dataUrl);
          setToastMessage("발급 완료 📸 (토스트 클릭=다운로드)");
        }
      } catch (err) {
        console.error("CAPTURE ERROR:", err);
        setToastMessage("발급 실패. (이미지/CORS/렌더 이슈 가능)");
      } finally {
        setShareItem(null);
      }
    };

    if (shareItem) generateImage();
  }, [shareItem]);

  // --- 토스트 자동 제거 ---
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#004aad]" />
      </div>
    );
  }

  // ✅ 업적 메타(제목/설명/아이콘) - 최소 매핑
  const ACH_META = {
    first_listen: { title: "첫 감상", desc: "처음으로 소리를 재생함", icon: Music, color: "#a78bfa" },
    first_complete: { title: "첫 완주", desc: "처음으로 한 곡을 끝까지 감상함", icon: Trophy, color: "#fb7185" },
    first_like: { title: "첫 좋아요", desc: "처음으로 좋아요를 남김", icon: Heart, color: "#f87171" },
    first_share: { title: "첫 공유", desc: "처음으로 카드를 발급함", icon: Share, color: "#34d399" },
    repeat_10: { title: "반복의 의식", desc: "같은 곡 10회 감상", icon: Repeat, color: "#fb7185" },
    streak_7: { title: "7일 연속", desc: "7일 연속 방문", icon: Calendar, color: "#fb923c" },
    streak_30: { title: "30일 연속", desc: "30일 연속 방문", icon: Star, color: "#fef08a" },
    day_and_night: { title: "낮과 밤", desc: "낮/밤 모두 감상", icon: Moon, color: "#818cf8" },
    weekend_listener: { title: "주말의 여유", desc: "주말 감상", icon: Sparkles, color: "#c084fc" },
    playlist_trinity: { title: "큐레이션 완주", desc: "OST/CEO/Director’s pick 모두 감상", icon: Target, color: "#2dd4bf" },
    daily_like_5: { title: "하루 5좋아요", desc: "하루에 5곡 이상 좋아요", icon: Heart, color: "#f87171" },
    share_10: { title: "10회 공유", desc: "카드를 10회 발급/공유", icon: Share, color: "#22d3ee" },
    all_tracks_liked: { title: "올 컬렉션", desc: "전체 곡을 좋아요", icon: Medal, color: "#a78bfa" },
  };

  const popupMeta = newAchievement?.id
    ? (ACH_META[newAchievement.id] || { title: newAchievement.id, desc: "새로운 기록을 획득했습니다.", icon: Sparkles, color: "#7dd3fc" })
    : null;

  return (
    <Router>
      <ScrollToTop />

      <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''} pb-40`}>
        <header className={`fixed top-0 w-full z-100 transition-all ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/5' : 'py-6 lg:py-10'}`}>
          <div className="container mx-auto px-6 flex justify-between items-end">
            <Link to="/">
              <h1 className="text-2xl lg:text-3xl font-black italic uppercase text-white">
                Unframe<span className="text-[#004aad]">.</span>
              </h1>
            </Link>
            <nav className="flex gap-4 lg:gap-10">
              <Link to="/about" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad]">About</Link>
              <Link to="/archive" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad]">Archive</Link>
            </nav>
          </div>
        </header>

        {/* ✅ Routes memo로 격리됨 */}
        <AppRoutes
          publicTracks={publicTracks}
          playlists={playlists}
          isPlaying={isPlaying}
          playTrack={playTrack}
          userLikes={userLikes}
          handleToggleLike={handleToggleLike}
          setSelectedTrack={setSelectedTrack}
          db={db}
          siteConfig={siteConfig}
          allUsers={allUsers}
          rankingTheme={rankingTheme}
          user={user}
          userProfile={userProfile}
          membership={membership}
          tracks={tracks}
          handleShare={handleShare}
          isAdmin={isAdmin}
          setToastMessage={setToastMessage}
        />

        {/* Player */}
        <AudioPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          audioRef={audioRef}
          togglePlay={() => isPlaying ? (audioRef.current?.pause(), setIsPlaying(false)) : playTrack()}
          playTrack={playTrack}
          currentTrackIdx={currentTrackIdx}
          publicTracks={currentQueue}
          formatTime={formatTime}
          volume={volume}
          setVolume={setVolume}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          parsedLyrics={parsedLyrics}
          setParsedLyrics={setParsedLyrics}
          selectedTrack={selectedTrack}
          setSelectedTrack={setSelectedTrack}
          handleToggleLike={handleToggleLike}
          userLikes={userLikes}
          handleShare={handleShare}
          isPlayerExpanded={isPlayerExpanded}
          setIsPlayerExpanded={setIsPlayerExpanded}
          playerView={playerView}
          setPlayerView={setPlayerView}
        />

        {/* ✅ 닉네임 1회 변경 팝업 (전역) */}
        <AnimatePresence>
          {isNickModalOpen && user && !user.isAnonymous && (
            <div className="fixed inset-0 z-10050 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl">
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.98 }}
                className="w-full max-w-lg rounded-[2.5rem] border border-white/10 bg-zinc-950/70 shadow-2xl overflow-hidden"
              >
                <div className="p-8 lg:p-10 relative">
                  <button
                    onClick={() => setIsNickModalOpen(false)}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                    aria-label="close"
                  >
                    <X className="w-5 h-5 text-white/80" />
                  </button>

                  <h3 className="text-2xl font-black uppercase tracking-tight italic">Choose Your Nickname</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    UP에서 사용할 닉네임을 설정할 수 있어요. <br />
                    <span className="text-white/80 font-bold">닉네임 변경은 1회만 가능</span>합니다.
                  </p>

                  <div className="mt-6 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nickname</p>
                    <input
                      value={nickInput}
                      onChange={(e) => { setNickInput(e.target.value); setNickError(""); }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-[#004aad]"
                      placeholder="2~16자 (한글/영문/숫자/_-)"
                    />
                    {nickError ? <p className="text-[11px] text-red-400 font-bold">{nickError}</p> : null}
                    <p className="text-[11px] text-zinc-500 font-bold">
                      예: unframe, 감상자, blue_wave, my-pick
                    </p>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsNickModalOpen(false)}
                      className="py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10 transition-all"
                    >
                      Later
                    </button>
                    <button
                      onClick={saveNicknameOnce}
                      className="py-4 bg-[#004aad] rounded-2xl text-[10px] font-black uppercase hover:brightness-110 transition-all"
                    >
                      Save (1 time)
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ✅ 업적 팝업: 카드 프리뷰 + 버튼 */}
        <AnimatePresence>
          {newAchievement && popupMeta && (
            <div className="fixed inset-0 z-10000 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.98 }}
                className="w-full max-w-140 relative"
              >
                <div className="rounded-4xl overflow-hidden shadow-2xl border border-white/10">
                  <div className="scale-[0.92] origin-top-left" style={{ width: 600, height: 850, transform: 'scale(0.92)' }}>
                    <div style={{
                      width: '600px', height: '850px',
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 60%, #004aad 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Inter', 'Pretendard', sans-serif"
                    }}>
                      <div style={{
                        width: '560px', height: '810px', border: '1.5px solid #7dd3fc',
                        position: 'relative', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                        padding: '60px 40px', boxSizing: 'border-box'
                      }}>
                        {/* corners */}
                        <svg style={{ position: 'absolute', top: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
                        <svg style={{ position: 'absolute', top: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
                        <svg style={{ position: 'absolute', bottom: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(-90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
                        <svg style={{ position: 'absolute', bottom: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(180deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>

                        {/* title */}
                        <div style={{ textAlign: 'center', position: 'relative', width: '100%' }}>
                          <h1 style={{
                            fontSize: '56px', fontWeight: 300, color: '#ffffff', letterSpacing: '0.1em',
                            margin: 0, textShadow: '0 0 10px rgba(125, 211, 252, 0.5)',
                            position: 'relative', zIndex: 2
                          }}>
                            {popupMeta.title}
                          </h1>
                          <svg style={{
                            position: 'absolute', top: '45px', left: '50%', transform: 'translateX(-50%)',
                            width: '380px', height: '60px', fill: 'none', stroke: '#7dd3fc', strokeWidth: 1, opacity: 0.6, zIndex: 1
                          }}>
                            <path d="M0,30 Q190,-20 380,30" />
                          </svg>
                        </div>

                        {/* icon */}
                        <div style={{ position: 'relative', width: '320px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{
                            position: 'absolute', width: '260px', height: '260px',
                            background: `radial-gradient(circle, ${popupMeta.color}44 0%, transparent 60%)`,
                            filter: 'blur(50px)', zIndex: 1, mixBlendMode: 'screen'
                          }} />
                          <div style={{
                            zIndex: 5,
                            filter: `drop-shadow(0 0 8px ${popupMeta.color}) drop-shadow(0 0 15px ${popupMeta.color}66)`
                          }}>
                            {React.createElement(popupMeta.icon || Heart, { size: 180, color: '#ffffff', strokeWidth: 1.5 })}
                          </div>
                        </div>

                        {/* user + desc */}
                        <div style={{ textAlign: 'center', zIndex: 10, width: '80%' }}>
                          <p style={{ fontSize: '26px', fontWeight: 400, color: '#ffffff', margin: 0 }}>
                            <span style={{ fontWeight: 800, color: '#7dd3fc' }}>{displayName}</span> 님,
                          </p>
                          <p style={{ fontSize: '20px', fontWeight: 300, color: '#ffffff', marginTop: '12px', opacity: 0.9, wordBreak: 'keep-all', lineHeight: 1.4 }}>
                            {popupMeta.desc}
                          </p>
                        </div>

                        {/* footer */}
                        <div style={{ textAlign: 'center', width: '100%', borderTop: '0.5px solid #7dd3fc55', paddingTop: '25px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.3em', marginBottom: '8px' }}>ACHIEVEMENT CARD</p>
                          <p style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
                            {formatDateTime(newAchievement.unlockedAt || new Date())}
                          </p>
                          <p style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.15em', textShadow: '0 0 10px rgba(125, 211, 252, 0.3)' }}>UNFRAME PLAYLIST</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* buttons */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewAchievement(null)}
                    className="py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase transition-all hover:bg-white/10"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => {
                      setShareItem({
                        title: popupMeta.title,
                        desc: popupMeta.desc,
                        type: 'reward',
                        color: popupMeta.color,
                        icon: popupMeta.icon,
                        unlockedAt: newAchievement.unlockedAt || new Date(),
                      });
                      setNewAchievement(null);
                    }}
                    className="py-4 bg-[#004aad] rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:brightness-110"
                  >
                    <Share size={12} /> Share Card
                  </button>
                </div>

                <button
                  onClick={() => setNewAchievement(null)}
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-black/80"
                  aria-label="close"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ✅ Hidden 공유 카드(캡처용) */}
        {shareItem && (
          <div
            ref={shareCardRef}
            style={{
              position: 'fixed', top: 0, left: 0, width: '600px', height: '850px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 60%, #004aad 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: -1, opacity: 0.99, pointerEvents: 'none',
              fontFamily: "'Inter', 'Pretendard', sans-serif"
            }}
          >
            <div style={{
              width: '560px', height: '810px', border: '1.5px solid #7dd3fc', position: 'relative',
              overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'space-between', padding: '60px 40px', boxSizing: 'border-box'
            }}>

              {/* 4모서리 내부 곡선 장식 */}
              <svg style={{ position: 'absolute', top: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
              <svg style={{ position: 'absolute', top: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
              <svg style={{ position: 'absolute', bottom: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(-90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
              <svg style={{ position: 'absolute', bottom: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(180deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>

              {/* 상단 타이틀 및 곡선 라인 */}
              <div style={{ textAlign: 'center', position: 'relative', width: '100%' }}>
                <h1 style={{
                  fontSize: '56px', fontWeight: 300, color: '#ffffff', letterSpacing: '0.1em',
                  margin: 0, textShadow: '0 0 10px rgba(125, 211, 252, 0.5)',
                  position: 'relative', zIndex: 2
                }}>
                  {shareItem.title || "UNFRAME"}
                </h1>
                <svg style={{
                  position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
                  width: '380px', height: '60px', fill: 'none', stroke: '#7dd3fc',
                  strokeWidth: 1, opacity: 0.6, zIndex: 1
                }}>
                  <path d="M0,30 Q190,-20 380,30" />
                </svg>
              </div>

              {/* 중앙 아이콘 */}
              <div style={{ position: 'relative', width: '320px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  position: 'absolute', width: '260px', height: '260px',
                  background: `radial-gradient(circle, ${shareItem.color || '#7dd3fc'}44 0%, transparent 60%)`,
                  filter: 'blur(50px)', zIndex: 1, mixBlendMode: 'screen'
                }} />

                <div style={{
                  zIndex: 5,
                  filter: `drop-shadow(0 0 8px ${shareItem.color || '#7dd3fc'}) drop-shadow(0 0 15px ${(shareItem.color || '#7dd3fc')}66)`
                }}>
                  {shareItem.type === 'reward' ? (
                    shareItem.icon
                      ? React.createElement(shareItem.icon, { size: 180, color: '#ffffff', strokeWidth: 1.5 })
                      : <Heart size={180} color="#ffffff" strokeWidth={1.5} />
                  ) : (
                    shareItem.image
                      ? (
                        <div style={{ width: '200px', height: '200px', border: '4px solid #ffffff', borderRadius: '40px', overflow: 'hidden' }}>
                          <img
                            src={shareItem.image}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            crossOrigin="anonymous"
                            alt=""
                          />
                        </div>
                      )
                      : <Music size={150} color="#ffffff" />
                  )}
                </div>
              </div>

              {/* 유저 이름 및 설명 */}
              <div style={{ textAlign: 'center', zIndex: 10, width: '80%' }}>
                <p style={{ fontSize: '26px', fontWeight: 400, color: '#ffffff', margin: 0 }}>
                  <span style={{ fontWeight: 800, color: '#7dd3fc' }}>{user?.displayName || 'Collector'}</span> 님,
                </p>
                <p style={{
                  fontSize: '20px', fontWeight: 300, color: '#ffffff', marginTop: '12px',
                  opacity: 0.9, wordBreak: 'keep-all', lineHeight: 1.4
                }}>
                  {shareItem.desc || "당신의 취향을 기록합니다."}
                </p>
              </div>

              {/* footer */}
              <div style={{ textAlign: 'center', width: '100%', borderTop: '0.5px solid #7dd3fc55', paddingTop: '25px' }}>
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.3em', marginBottom: '8px' }}>ACHIEVEMENT CARD</p>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
                  {formatDateTime(shareItem.unlockedAt || new Date())}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.15em', textShadow: '0 0 10px rgba(125, 211, 252, 0.3)' }}>UNFRAME PLAYLIST</p>
              </div>
            </div>
          </div>
        )}

        {/* Toast (클릭=다운로드) */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!lastCardUrl) return;
                const link = document.createElement('a');
                link.download = 'unframe-card.png';
                link.href = lastCardUrl;
                link.click();
              }}
              className="fixed bottom-32 left-1/2 z-1000 bg-[#004aad] text-white px-8 py-4 rounded-full font-black uppercase text-[10px] shadow-2xl flex items-center gap-2 cursor-pointer select-none"
              title={lastCardUrl ? "Click to download the last generated card" : ""}
            >
              <CheckCircle2 className="w-3 h-3" />
              {toastMessage}
              {lastCardUrl ? <span className="opacity-80"> • CLICK TO DOWNLOAD</span> : null}
            </motion.div>
          )}
        </AnimatePresence>

        <audio
          ref={audioRef}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          playsInline
        />
      </div>
    </Router>
  );
}