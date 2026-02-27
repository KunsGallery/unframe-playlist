// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { domToPng } from 'modern-screenshot';
import confetti from 'canvas-confetti';
import {
  getAuth, onAuthStateChanged, signInAnonymously, signOut, signInWithPopup, GoogleAuthProvider
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, collection, onSnapshot, query, updateDoc, deleteDoc, getDoc, getDocs, writeBatch, Timestamp
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
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import About from './pages/About';
import ScrollToTop from './components/ScrollToTop';

import { createAchievementEngine } from './store';

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
// ✅ 레벨 시스템 (1.3)
// ---------------------
const LEVELS = [
  { name: "User", color: "#004AAD", minXp: 0 },
  { name: "Newbie", color: "#1E6BFF", minXp: 30 },
  { name: "Fan", color: "#2F8CFF", minXp: 80 },
  { name: "Regular", color: "#3FA9FF", minXp: 150 },
  { name: "Active", color: "#00BFFF", minXp: 260 },
  { name: "Maker", color: "#4B5DFF", minXp: 400 },
  { name: "Explorer", color: "#6C63FF", minXp: 600 },
  { name: "Player", color: "#FF3CAC", minXp: 850 },
  { name: "Listener", color: "#A855F7", minXp: 1150 },
  { name: "Advanced", color: "#FF7A00", minXp: 1500 },
  { name: "YourPick", color: "#FFD600", minXp: 1900 },
  { name: "Leader", color: "#00E676", minXp: 2400 },
  { name: "Influencer", color: "#00F0FF", minXp: 3000 },
  { name: "Star", color: "#FFC400", minXp: 3800 },
  { name: "Trendsetter", color: "#FF1744", minXp: 4800 },
];

const calcXp = (profile) => {
  const listens = profile?.counters?.listens ?? profile?.listenCount ?? 0;
  const completes = profile?.counters?.completes ?? 0;
  const likes = profile?.counters?.likes ?? 0;
  const shares = profile?.counters?.shares ?? profile?.shareCount ?? 0;
  // 가중치(원하면 바꾸자)
  return (listens * 1) + (completes * 2) + (likes * 2) + (shares * 3);
};

const getLevelFromXp = (xp) => {
  let cur = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) cur = l;
    else break;
  }
  return cur;
};

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

  // ✅ rewards object[]
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
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);

  // ⚠️ currentTime/duration은 AudioPlayer가 쓰지만, App이 너무 자주 리렌더 되면 hover가 반복됨.
  // 그래서 App에 두되, Routes는 memo로 격리해둠.
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

  // ✅ 업적 팝업: 이제 {id, unlockedAt, meta} 형태
  const [newAchievement, setNewAchievement] = useState(null);

  // ✅ 토스트 클릭 다운로드용
  const [lastCardUrl, setLastCardUrl] = useState(null);

  // refs
  const audioRef = useRef(null);
  const shareCardRef = useRef(null);

  // ✅ 업적 엔진
  const engineRef = useRef(null);

  // ✅ 완주 이벤트 1회 처리
  const completedOnceRef = useRef(new Set());
  const playSessionRef = useRef({ startedAt: 0, trackId: null, playlistId: null });

  // --- derived ---
  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);

  const currentTrack = useMemo(() => {
    if (!currentQueue || currentQueue.length === 0) return null;
    return currentQueue[currentTrackIdx] ?? null;
  }, [currentQueue, currentTrackIdx]);

  // ✅ 레벨 계산(1.3)
  const myXp = useMemo(() => calcXp(userProfile), [userProfile]);
  const myLevel = useMemo(() => getLevelFromXp(myXp), [myXp]);

  // ✅ membership prop를 “레벨 배지”로 교체
  const membership = useMemo(() => {
    return {
      name: myLevel.name,
      color: myLevel.color,
      bg: `${myLevel.color}22`,
      icon: Sparkles,
    };
  }, [myLevel]);

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
  const playTrack = useCallback(async (idx, queue = null, context = null) => {
    const audio = audioRef.current;
    if (!audio) return;

    const activeQueue = queue ?? currentQueue;
    if (queue && queue !== currentQueue) setCurrentQueue(queue);

    const targetIdx = idx !== undefined ? idx : currentTrackIdx;
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
        playlistId: context?.playlistId || null,
      };

      await emit({ type: "track_play_start", trackId: targetTrack.id });

      if (context?.playlistId) {
        await emit({ type: "playlist_play", playlistId: context.playlistId, trackId: targetTrack.id });
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

    // ✅ like_added 이벤트: all_tracks_liked 조건에 필요한 값 전달
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
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (!snap.exists()) return;
      setUserProfile(snap.data());
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

  // ✅ public_stats 업데이트(레벨/컬러 반영)
  useEffect(() => {
    if (!user) return;

    const xp = calcXp(userProfile);
    const lvl = getLevelFromXp(xp);

    setDoc(doc(db, 'artifacts', appId, 'public_stats', user.uid), {
      displayName: user.displayName || (user.isAnonymous ? "Guest" : "Collector"),
      profileImg: userProfile?.profileImg || "",
      listenCount: userProfile?.listenCount || 0,
      shareCount: userProfile?.shareCount || 0,
      xp,
      levelName: lvl.name,
      levelColor: lvl.color,
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

  // ✅ Media Session
  useEffect(() => {
    if (!currentTrack) return;
    if (!('mediaSession' in navigator)) return;

    const artworkUrl = currentTrack.image ? getDirectLink(currentTrack.image) : "";

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
  }, [currentTrack]);

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

  // ✅ 업적 메타(제목/설명/아이콘) - store.js 기반이지만 App에서 최소 매핑
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

  const popupMeta = newAchievement?.id ? (ACH_META[newAchievement.id] || { title: newAchievement.id, desc: "새로운 기록을 획득했습니다.", icon: Sparkles, color: "#7dd3fc" }) : null;

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

        {/* ✅ 1.2 업적 팝업: 카드 프리뷰 + 버튼 */}
        <AnimatePresence>
          {newAchievement && popupMeta && (
            <div className="fixed inset-0 z-10000 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.98 }}
                className="w-full max-w-140 relative"
              >
                {/* 카드 프리뷰 그대로 렌더 */}
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

                        {/* ✅ 업적 제목: 곡선 위 */}
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

                        {/* 아이콘 */}
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

                        {/* ✅ 유저 + 한글 설명 */}
                        <div style={{ textAlign: 'center', zIndex: 10, width: '80%' }}>
                          <p style={{ fontSize: '26px', fontWeight: 400, color: '#ffffff', margin: 0 }}>
                            <span style={{ fontWeight: 800, color: '#7dd3fc' }}>{user?.displayName || 'Collector'}</span> 님,
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

                        {/* decor */}
                        <div style={{ position: 'absolute', top: '160px', left: '50px', color: '#7dd3fc', fontSize: '24px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
                        <div style={{ position: 'absolute', top: '200px', right: '60px', color: '#ffffff', fontSize: '18px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
                        <div style={{ position: 'absolute', bottom: '240px', left: '70px', color: '#ffffff', fontSize: '20px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
                        <div style={{ position: 'absolute', bottom: '180px', right: '40px', color: '#7dd3fc', fontSize: '28px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
                        <div style={{ position: 'absolute', left: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>
                        <div style={{ position: 'absolute', right: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 버튼 바 */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewAchievement(null)}
                    className="py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase transition-all hover:bg-white/10"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => {
                      // ✅ 카드 공유: shareItem에 아이콘/설명/달성시간 넣기
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

        {/* ✅ Hidden 공유 카드(캡처용) - 기존 너 디자인 그대로 */}
        {shareItem && (
          <div ref={shareCardRef} style={{
            position: 'fixed', top: 0, left: 0, width: '600px', height: '850px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 60%, #004aad 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: -1, opacity: 0.99, pointerEvents: 'none',
            fontFamily: "'Inter', 'Pretendard', sans-serif"
          }}>
            <div style={{ width: '560px', height: '810px', border: '1.5px solid #7dd3fc', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 40px', boxSizing: 'border-box' }}>

              {/* corners */}
              <svg style={{ position: 'absolute', top: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
              <svg style={{ position: 'absolute', top: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
              <svg style={{ position: 'absolute', bottom: '10px', left: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(-90deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>
              <svg style={{ position: 'absolute', bottom: '10px', right: '10px', width: '40px', height: '40px', fill: 'none', stroke: '#7dd3fc', strokeWidth: '1.5', transform: 'rotate(180deg)' }} viewBox="0 0 40 40"><path d="M0,40 A40,40 0 0,1 40,0" /></svg>

              {/* title + curve */}
              <div style={{ textAlign: 'center', position: 'relative', width: '100%' }}>
                <h1 style={{ fontSize: '56px', fontWeight: 300, color: '#ffffff', letterSpacing: '0.1em', margin: 0, textShadow: '0 0 10px rgba(125, 211, 252, 0.5)', position: 'relative', zIndex: 2 }}>
                  {shareItem.title}
                </h1>
                <svg style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', width: '380px', height: '60px', fill: 'none', stroke: '#7dd3fc', strokeWidth: 1, opacity: 0.6, zIndex: 1 }}>
                  <path d="M0,30 Q190,-20 380,30" />
                </svg>
              </div>

              {/* icon */}
              <div style={{ position: 'relative', width: '320px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', width: '260px', height: '260px', background: `radial-gradient(circle, ${shareItem.color || '#7dd3fc'}44 0%, transparent 60%)`, filter: 'blur(50px)', zIndex: 1, mixBlendMode: 'screen' }} />
                <div style={{ zIndex: 5, filter: `drop-shadow(0 0 8px ${shareItem.color || '#7dd3fc'}) drop-shadow(0 0 15px ${shareItem.color || '#7dd3fc'}66)` }}>
                  {shareItem.type === 'reward'
                    ? React.createElement(shareItem.icon || Heart, { size: 180, color: '#ffffff', strokeWidth: 1.5 })
                    : (shareItem.image
                      ? <div style={{ width: '200px', height: '200px', border: '4px solid #ffffff', borderRadius: '40px', overflow: 'hidden' }}>
                          <img src={shareItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" alt="" />
                        </div>
                      : <Music size={150} color="#ffffff" />
                    )
                  }
                </div>
              </div>

              {/* user + desc (Korean) */}
              <div style={{ textAlign: 'center', zIndex: 10, width: '80%' }}>
                <p style={{ fontSize: '26px', fontWeight: 400, color: '#ffffff', margin: 0 }}>
                  <span style={{ fontWeight: 800, color: '#7dd3fc' }}>{user?.displayName || 'Collector'}</span> 님,
                </p>
                <p style={{ fontSize: '20px', fontWeight: 300, color: '#ffffff', marginTop: '12px', opacity: 0.9, wordBreak: 'keep-all', lineHeight: 1.4 }}>
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

              {/* decor */}
              <div style={{ position: 'absolute', top: '160px', left: '50px', color: '#7dd3fc', fontSize: '24px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
              <div style={{ position: 'absolute', top: '200px', right: '60px', color: '#ffffff', fontSize: '18px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
              <div style={{ position: 'absolute', bottom: '240px', left: '70px', color: '#ffffff', fontSize: '20px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
              <div style={{ position: 'absolute', bottom: '180px', right: '40px', color: '#7dd3fc', fontSize: '28px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
              <div style={{ position: 'absolute', left: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>
              <div style={{ position: 'absolute', right: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>
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