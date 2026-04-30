// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { auth, db, appId, ADMIN_EMAILS } from './firebase';
import confetti from 'canvas-confetti';
import {
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  query,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import {
  Loader2,
  Moon,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  getDirectLink,
  toDataUrl
} from "./utils/PlayerUtils";
import { motion, AnimatePresence } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import About from './pages/About';
import ScrollToTop from './components/ScrollToTop';
import ShareCard from "./components/ShareCard";
import AchievementPopup from "./components/AchievementPopup";
import NicknameModal from "./components/NicknameModal";

import { useNicknameSetup } from "./hooks/useNicknameSetup";
import useAudioEngine from "./hooks/useAudioEngine";
import { usePlayerEngine } from "./hooks/usePlayerEngine";
import { useShareCard } from "./hooks/useShareCard";
import { useAppDataSync } from "./hooks/useAppDataSync";
import { useAppBoot } from "./hooks/useAppBoot";
import { useToastTimer } from "./hooks/useToastTimer";

import { getAchievementMeta } from "./constants/achievements";

import { createAchievementEngine } from './store';
import { getLevelInfo } from './levels';

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

// ---------------------
// 라우트 렌더 격리
// ---------------------
const AppRoutes = memo(function AppRoutes({
  publicTracks,
  playlists,
  isPlaying,
  currentTrack,
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
  appId,
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
            currentTrack={currentTrack}
            playTrack={playTrack}
            userLikes={userLikes}
            handleToggleLike={handleToggleLike}
            setSelectedTrack={setSelectedTrack}
            db={db}
            appId={appId}
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
            setAuthError={(msg) => setToastMessage?.(msg)}
            signInWithPopup={() => signInWithPopup(auth, new GoogleAuthProvider())}
          />
        }
      />
    </Routes>
  );
});

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [userLikes, setUserLikes] = useState([]);

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
    nickname: '',
    nicknameUpdatedCount: 0,
    nicknamePrompted: false,
  });

  const {
    audioRef,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    isPlaying,
    setIsPlaying,
    isBuffering,
    setIsBuffering,
  } = useAudioEngine();

  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [currentQueue, setCurrentQueue] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [shareItem, setShareItem] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  const [rankingTheme] = useState({
    id: 'night_owl',
    title: '심야의 감상자',
    desc: '밤을 수집하는 리스너',
    icon: Moon,
  });

  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [playerView, setPlayerView] = useState('cover');
  const [loopMode, setLoopMode] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);

  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);

  const [siteConfig, setSiteConfig] = useState({ title: 'UNFRAME', subTitle: 'PLAYLIST' });
  const [newAchievement, setNewAchievement] = useState(null);
  const [lastCardUrl, setLastCardUrl] = useState(null);

  const [isNickModalOpen, setIsNickModalOpen] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [nickError, setNickError] = useState("");

  const shareCardRef = useRef(null);
  const engineRef = useRef(null);
  const completedOnceRef = useRef(new Set());
  const playSessionRef = useRef({ startedAt: 0, trackId: null, playlistKey: null });

  const queueRef = useRef([]);
  const idxRef = useRef(0);
  const playTrackRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, audioRef]);

  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);

  const currentTrack = useMemo(() => {
    if (!currentQueue || currentQueue.length === 0) return null;
    return currentQueue[currentTrackIdx] ?? null;
  }, [currentQueue, currentTrackIdx]);

  const levelInfo = useMemo(() => getLevelInfo(userProfile?.xp || 0), [userProfile?.xp]);

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

  const displayName = useMemo(() => {
    const nick = (userProfile?.nickname || "").trim();
    if (nick) return nick;
    return user?.displayName || (user?.isAnonymous ? "Guest" : "Collector");
  }, [userProfile?.nickname, user]);

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

  const { playTrack, playNext, playPrev } = usePlayerEngine({
    audioRef,
    currentQueue,
    setCurrentQueue,
    currentTrackIdx,
    setCurrentTrackIdx,
    currentTrack,
    setIsPlaying,
    emit,
    playSessionRef,
    queueRef,
    idxRef,
    playTrackRef,
  });

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

  const handleShare = useCallback(async (e, item, type = 'track') => {
    if (e) e.stopPropagation();
    if (!item) return;

    // Track sharing: no card generation, share as a clean music link.
    if (type === "track") {
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/share/track/${encodeURIComponent(item.id)}`
          : "";

      const shareTitle = `${item.title || "UNFRAME"} - ${item.artist || "UNFRAME PLAYLIST"}`;

      const shareText = [
        "UNFRAME PLAYLIST",
        "",
        `〈${item.title || "Untitled"}〉`,
        item.artist || "",
        "",
        "전시와 사운드가 이어지는 음악 아카이브",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });

          setToastMessage("곡 링크를 공유했습니다 🔗");
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
          setToastMessage("곡 링크를 클립보드에 복사했습니다 🔗");
        } else {
          setToastMessage("공유를 지원하지 않는 환경입니다.");
        }

        await emit({ type: "share_card", trackId: item?.id || null });
      } catch (err) {
        if (err?.name === "AbortError") {
          setToastMessage("공유가 취소되었습니다.");
          return;
        }

        console.error("track share error:", err);
        setToastMessage("공유 중 오류가 발생했습니다.");
      }

      return;
    }

    // Non-track sharing: keep the original card generation flow.
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
  }, [emit, setToastMessage]);

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
  }, [audioRef, currentTrack?.id, emit]);

  useShareCard({
    shareItem,
    shareCardRef,
    setToastMessage,
    setLastCardUrl,
    setShareItem,
  });

  useAppBoot({
    auth,
    ADMIN_EMAILS,
    setUser,
    setIsAdmin,
    setLoading,
    setScrolled,
  });

  useToastTimer({
    toastMessage,
    setToastMessage,
  });

  useAppDataSync({
    user,
    isAuthReady: !loading,
    db,
    appId,

    setUserProfile,
    setNickInput,
    setNickError,
    setIsNickModalOpen,

    setAllUsers,
    setTracks,
    setCurrentQueue,
    setPlaylists,
    setUserLikes,
    setSiteConfig,

    engineRef,
    userProfile,
  });

  const { saveNicknameOnce } = useNicknameSetup({
    user,
    userProfile,
    nickInput,
    setNickError,
    setToastMessage,
    setIsNickModalOpen,
    db,
    appId,
  });

    useEffect(() => {
      if (!publicTracks.length) return;

      const params = new URLSearchParams(window.location.search);
      const sharedTrackId = params.get("track");

      if (!sharedTrackId) return;

      const idx = publicTracks.findIndex((track) => track.id === sharedTrackId);
      if (idx < 0) return;

      const track = publicTracks[idx];

      setCurrentQueue(publicTracks);
      setCurrentTrackIdx(idx);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setIsBuffering(false);

      try {
        const url = getDirectLink(track.audioUrl);
        if (audioRef.current && url) {
          audioRef.current.pause();
          audioRef.current.src = url;
          audioRef.current.load();
        }
      } catch {}

      setToastMessage(`공유된 곡을 불러왔습니다: ${track.title}`);

      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, "", cleanUrl);
    }, [
      publicTracks,
      audioRef,
      setCurrentQueue,
      setCurrentTrackIdx,
      setCurrentTime,
      setDuration,
      setIsPlaying,
      setIsBuffering,
      setToastMessage,
    ]);

  const toggleLoop = useCallback(() => {
    setLoopMode((prev) => (prev + 1) % 3);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const getNextTrackIndex = useCallback((queue, currentIdx) => {
    if (!Array.isArray(queue) || queue.length === 0) return 0;
    if (queue.length === 1) return 0;

    if (!isShuffle) {
      return (currentIdx + 1) % queue.length;
    }

    let nextIdx = currentIdx;
    let safety = 0;

    while (nextIdx === currentIdx && safety < 20) {
      nextIdx = Math.floor(Math.random() * queue.length);
      safety += 1;
    }

    return nextIdx;
  }, [isShuffle]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }

    try {
      setIsBuffering(true);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      setIsPlaying(true);
      setIsBuffering(false);
    } catch (err) {
      if (err?.name === "AbortError") {
        setIsBuffering(false);
        return;
      }

      console.error("togglePlay error:", err);
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [audioRef, isPlaying, setIsPlaying, setIsBuffering]);

  const handleNaturalTrackEnd = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const q = currentQueue || [];
    if (!q.length) return;

    const isLastTrack = currentTrackIdx >= q.length - 1;

    if (loopMode === 0 && isLastTrack) {
      setIsPlaying(false);
      setIsBuffering(false);

      try {
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "none";
        }
      } catch {}

      return;
    }

    const nextIdx = loopMode === 2
      ? currentTrackIdx
      : getNextTrackIndex(q, currentTrackIdx);

    const nextTrack = q[nextIdx];
    if (!nextTrack) return;

    const nextUrl = getDirectLink(nextTrack.audioUrl);
    if (!nextUrl) return;

    setCurrentTrackIdx(nextIdx);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);

    playSessionRef.current = {
      startedAt: Date.now(),
      trackId: nextTrack.id,
      playlistKey: playSessionRef.current?.playlistKey || null,
    };

    try {
      if ("mediaSession" in navigator) {
        const artworkUrl = nextTrack.image ? getDirectLink(nextTrack.image) : "";

        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: nextTrack.title ?? "UNFRAME",
            artist: nextTrack.artist ?? "",
            album: nextTrack.album ?? "UNFRAME PLAYLIST",
            artwork: artworkUrl
              ? [
                  { src: artworkUrl, sizes: "96x96", type: "image/png" },
                  { src: artworkUrl, sizes: "192x192", type: "image/png" },
                  { src: artworkUrl, sizes: "512x512", type: "image/png" },
                ]
              : [],
          });
        } catch {}

        try {
          navigator.mediaSession.playbackState = "playing";
        } catch {}
      }
    } catch {}

    try {
      audio.pause();
    } catch {}

    audio.src = nextUrl;
    audio.load();

    window.setTimeout(async () => {
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
        setIsBuffering(false);
      } catch (err) {
        if (err?.name === "AbortError") {
          setIsBuffering(false);
          return;
        }

        console.error("handleNaturalTrackEnd play error:", err);
        setIsPlaying(false);
        setIsBuffering(false);
      }
    }, 120);
  }, [
    audioRef,
    currentQueue,
    currentTrackIdx,
    setCurrentTrackIdx,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setIsBuffering,
    loopMode,
    getNextTrackIndex,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#004aad]" />
      </div>
    );
  }

  const popupMeta = newAchievement?.id
    ? getAchievementMeta(newAchievement.id)
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

        <AppRoutes
          publicTracks={publicTracks}
          playlists={playlists}
          isPlaying={isPlaying}
          currentTrack={currentTrack}
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
          appId={appId}
        />

        <AudioPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          currentTime={currentTime}
          duration={duration}
          audioRef={audioRef}
          togglePlay={togglePlay}
          playTrack={playTrack}
          playNext={playNext}
          playPrev={playPrev}
          currentTrackIdx={currentTrackIdx}
          publicTracks={currentQueue}
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
          loopMode={loopMode}
          toggleLoop={toggleLoop}
          isShuffle={isShuffle}
          toggleShuffle={toggleShuffle}
        />

        <NicknameModal
          isOpen={isNickModalOpen}
          user={user}
          nickInput={nickInput}
          setNickInput={setNickInput}
          nickError={nickError}
          setNickError={setNickError}
          setIsNickModalOpen={setIsNickModalOpen}
          saveNicknameOnce={saveNicknameOnce}
        />

        <AchievementPopup
          newAchievement={newAchievement}
          popupMeta={popupMeta}
          displayName={displayName}
          formatDateTime={formatDateTime}
          setNewAchievement={setNewAchievement}
          setShareItem={setShareItem}
        />

        <ShareCard
          shareItem={shareItem}
          shareCardRef={shareCardRef}
          user={user}
          formatDateTime={formatDateTime}
        />

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
          onLoadStart={() => {
            setIsBuffering(true);
          }}
          onWaiting={() => {
            setIsBuffering(true);
          }}
          onStalled={() => {
            setIsBuffering(true);
          }}
          onCanPlay={() => {
            setIsBuffering(false);
          }}
          onPlaying={() => {
            setIsBuffering(false);
          }}
          onLoadedMetadata={(e) => {
            const a = e.currentTarget;
            setDuration(a.duration || 0);

            try {
              const ms = navigator.mediaSession;
              if (ms && typeof ms.setPositionState === 'function') {
                ms.setPositionState({
                  duration: a.duration || 0,
                  playbackRate: a.playbackRate || 1,
                  position: a.currentTime || 0,
                });
              }
            } catch {}
          }}
          onLoadedData={(e) => {
            const a = e.currentTarget;
            setDuration(a.duration || 0);
            setIsBuffering(false);
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            setCurrentTime(a.currentTime);

            try {
              if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
                navigator.mediaSession.setPositionState({
                  duration: a.duration || 0,
                  playbackRate: a.playbackRate || 1,
                  position: a.currentTime || 0,
                });
              }
            } catch {}
          }}
          onEnded={handleNaturalTrackEnd}
          playsInline
        />
      </div>
    </Router>
  );
}
