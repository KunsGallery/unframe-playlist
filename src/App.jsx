// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { auth, db, appId, ADMIN_EMAILS } from './firebase';
import confetti from 'canvas-confetti';
import {
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  deleteDoc,
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
import { motion as Motion, AnimatePresence } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
const Admin = lazy(() => import('./pages/Admin'));
import About from './pages/About';
import TrackShareLanding from './pages/TrackShareLanding';
import ScrollToTop from './components/ScrollToTop';
import ShareCard from './components/ShareCard';
import AchievementPopup from "./components/AchievementPopup";
import NicknameModal from "./components/NicknameModal";
import AppShell from "./components/AppShell";

import { useNicknameSetup } from "./hooks/useNicknameSetup";
import useAudioEngine from "./hooks/useAudioEngine";
import { usePlayerEngine } from "./hooks/usePlayerEngine";
import { useShareCard } from "./hooks/useShareCard";
import { useAppDataSync } from "./hooks/useAppDataSync";
import { useAppBoot } from "./hooks/useAppBoot";
import { useToastTimer } from "./hooks/useToastTimer";

import { getAchievementMeta } from "./constants/achievements";

import { getLevelInfo } from './levels';
import { isPublishedTrack, resolvePlaylist, nextQueueIndex } from './utils/catalog';
import { useListeningMemory } from './hooks/useListeningMemory';
import { useListenerLibrary } from './hooks/useListenerLibrary';
const ListenerLibrary = lazy(() => import('./pages/ListenerLibrary'));
const ReleaseDetail = lazy(() => import('./pages/ReleaseDetail'));
const ExhibitionJourney = lazy(() => import('./pages/ExhibitionJourney'));
const SharedPlaylist = lazy(() => import('./pages/SharedPlaylist'));

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

const INITIAL_USER_PROFILE = {
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
};

// ---------------------
// 라우트 렌더 격리
// ---------------------
const AppRoutes = memo(function AppRoutes({
  publicTracks,
  playlists,
  adminPlaylists,
  gatheringPlaylists,
  isPlaying,
  currentTrack,
  playTrack,
  togglePlay,
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
  setIsPlayerExpanded,
  pauseForExternalPlayback,
  appId,
  library,
}) {
  return (
    <Routes>
      <Route path="/library" element={<ListenerLibrary user={user} profile={userProfile} tracks={publicTracks} playTrack={playTrack} library={library} notify={setToastMessage} login={() => signInWithPopup(auth, new GoogleAuthProvider()).catch(() => setToastMessage('로그인을 완료하지 못했습니다. 다시 시도해 주세요.'))} />} />
      <Route path="/tracks/:trackId" element={<ReleaseDetail tracks={publicTracks} playTrack={playTrack} handleToggleLike={handleToggleLike} userLikes={userLikes} library={library} notify={setToastMessage} />} />
      <Route path="/exhibitions/:name" element={<ExhibitionJourney tracks={publicTracks} playTrack={playTrack} library={library} notify={setToastMessage} />} />
      <Route path="/playlist/:id" element={<SharedPlaylist tracks={publicTracks} playTrack={playTrack} />} />
      <Route
        path="/"
        element={
          <Home
            tracks={publicTracks}
            playlists={playlists}
            gatheringPlaylists={gatheringPlaylists}
            isPlaying={isPlaying}
            currentTrack={currentTrack}
            playTrack={playTrack}
            togglePlay={togglePlay}
            userLikes={userLikes}
            handleToggleLike={handleToggleLike}
            setSelectedTrack={setSelectedTrack}
            db={db}
            appId={appId}
            siteConfig={siteConfig}
            allUsers={allUsers}
            rankingTheme={rankingTheme}
            pauseForExternalPlayback={pauseForExternalPlayback}
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
        path="/share/track/:trackId"
        element={
          <TrackShareLanding
            tracks={tracks}
            publicTracks={publicTracks}
            playTrack={playTrack}
            setIsPlayerExpanded={setIsPlayerExpanded}
            setSelectedTrack={setSelectedTrack}
            setToastMessage={setToastMessage}
          />
        }
      />
      <Route
        path="/admin"
        element={
          <Admin
            isAdmin={isAdmin}
            tracks={tracks}
            playlists={adminPlaylists || playlists}
            gatheringPlaylists={gatheringPlaylists}
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
  const [gatheringPlaylists, setGatheringPlaylists] = useState([]);
  const [userLikes, setUserLikes] = useState([]);

  const [userProfile, setUserProfile] = useState(INITIAL_USER_PROFILE);

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
  const [, setScrolled] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const library = useListenerLibrary(user, tracks);

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
  const [playbackError, setPlaybackError] = useState('');
  const [dataError, setDataError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const onRewards = useCallback((rewards) => setAchievementQueue((queue) => [...queue, ...rewards]), []);
  const likePendingRef = useRef(new Set());
  const playSessionRef = useRef({ startedAt: 0, trackId: null, playlistKey: null });

  const queueRef = useRef([]);
  const idxRef = useRef(0);
  const playTrackRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, audioRef, loading]);

  const publicTracks = useMemo(() => tracks.filter(isPublishedTrack), [tracks]);
  const publicPlaylists = useMemo(() => playlists.filter((p) => p.status !== 'draft' && p.isPublished !== false).map((p) => resolvePlaylist(p, publicTracks)), [playlists, publicTracks]);

  const currentTrack = useMemo(() => {
    if (!currentQueue || currentQueue.length === 0) return null;
    return currentQueue[currentTrackIdx] ?? null;
  }, [currentQueue, currentTrackIdx]);

  const levelInfo = useMemo(() => getLevelInfo(userProfile?.xp || 0), [userProfile?.xp]);

  const membership = useMemo(() => {
    return {
      name: userProfile?.levelOverrideName || userProfile?.manualLevelName || levelInfo?.name || "User",
      color: userProfile?.levelOverrideColor || userProfile?.manualLevelColor || levelInfo?.color || "#004AAD",
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
  }, [levelInfo, userProfile]);

  const displayName = useMemo(() => {
    const nick = (userProfile?.nickname || "").trim();
    if (nick) return nick;
    return user?.displayName || (user?.isAnonymous ? "Guest" : "Collector");
  }, [userProfile?.nickname, user]);

  const emit = useCallback(async (event) => {
    const engine = engineRef.current;
    if (!engine || !user || user.isAnonymous) return null;

    let res;
    try { res = await engine.processEvent({ ...event, at: event.at || new Date() }); }
    catch (error) { if (event.type !== 'listening_pulse') setToastMessage(error.message || '기록을 저장하지 못했습니다. 네트워크 연결을 확인해 주세요.'); return null; }

    if (res?.unlockedRewards?.length) {
      setAchievementQueue((queue) => [...queue, ...res.unlockedRewards]);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });
    }
    return res;
  }, [user]);

  useEffect(() => {
    if (!newAchievement && achievementQueue.length) {
      setNewAchievement(achievementQueue[0]);
      setAchievementQueue((queue) => queue.slice(1));
    }
  }, [newAchievement, achievementQueue]);

  useEffect(() => {
    if (!user?.isAnonymous) return;

    setUserProfile(INITIAL_USER_PROFILE);
    setNewAchievement(null);
    setIsNickModalOpen(false);
  }, [user]);

  const { playTrack, playNext, playPrev } = usePlayerEngine({
    audioRef,
    currentQueue,
    setCurrentQueue,
    currentTrackIdx,
    setCurrentTrackIdx,
    currentTrack,
    setIsPlaying,
    setIsBuffering,
    emit,
    playSessionRef,
    queueRef,
    idxRef,
    playTrackRef,
    isShuffle,
    setPlaybackError,
  });

  useListeningMemory({ audioRef, currentQueue, currentTrackIdx, currentTrack, publicTracks, setCurrentQueue, setCurrentTrackIdx, setCurrentTime, loopMode, isShuffle });

  const handleToggleLike = useCallback(async (e, trackId) => {
    if (e) e.stopPropagation();
    if (!user || !trackId) return;
    if (likePendingRef.current.has(trackId)) return;
    likePendingRef.current.add(trackId);
    try {

    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);

    const isAlreadyLiked = userLikes.includes(trackId);
    const nextLikedCount = isAlreadyLiked
      ? Math.max((userLikes?.length || 0) - 1, 0)
      : (userLikes?.length || 0) + 1;

    if (isAlreadyLiked) {
      await deleteDoc(likeDoc);

      await emit({ type: 'like_removed', trackId });

      setToastMessage("아카이브에서 제거되었습니다");
      return;
    }

    await setDoc(likeDoc, { likedAt: Date.now() });


    setToastMessage("아카이브에 기록되었습니다 💗");

    await emit({
      type: "like_added",
      trackId,
      totalTracks: (publicTracks?.length || 0),
      likedCount: nextLikedCount,
    });
    } catch { setToastMessage('좋아요를 저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { likePendingRef.current.delete(trackId); }
  }, [user, userLikes, publicTracks, emit, setToastMessage]);

  const handleShare = useCallback(async (e, item, type = 'track') => {
    if (e) e.stopPropagation();
    if (!item) return;

    // Track sharing: no card generation, share as a clean music link.
    if (type === "track") {
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/og/track/${encodeURIComponent(item.id)}`
          : "";

      const shareTitle = `${item.title || "UNFRAME"} - ${item.artist || "UNFRAME PLAYLIST"}`;

      const shareText = [
        `${item.title || "Untitled"} - ${item.artist || "UNFRAME"}`,
        "UNFRAME PLAYLIST",
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
          return;
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

      const session = playSessionRef.current;
      const now = Date.now();
      const elapsed = (now - (session.lastTick || now)) / 1000;
      const delta = cur - (session.lastPosition || 0);
      if (!audio.seeking && !audio.paused && delta > 0 && delta <= elapsed * (audio.playbackRate || 1) + 1.5) session.heardSeconds = (session.heardSeconds || 0) + Math.min(delta, elapsed * (audio.playbackRate || 1));
      session.lastPosition = cur; session.lastTick = now;
      const pct = Math.min(1, (session.heardSeconds || 0) / dur);
      const unreported = Math.max(0, (session.heardSeconds || 0) - (session.reportedSeconds || 0));
      if (unreported >= 20 && pct < .9) {
        session.reportedSeconds = session.heardSeconds;
        void emit({ type: 'listening_pulse', trackId: tid, seconds: unreported });
      }
      if (pct >= 0.9) {
        const key = `${tid}:${playSessionRef.current.startedAt}`;
        if (!completedOnceRef.current.has(key)) {
          completedOnceRef.current.add(key);
          if (completedOnceRef.current.size > 100) completedOnceRef.current.clear();
          session.reportedSeconds = session.heardSeconds;
          emit({ type: "track_complete", trackId: tid, seconds: unreported, progress: pct, eventId: `complete:${key}` });
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
    setDataError,
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
    setGatheringPlaylists,
    setUserLikes,
    setSiteConfig,

    engineRef,
    setDataError,
    retryToken,
    setDataLoading,
    onRewards,
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
      } catch { /* Optional browser capability. */ }

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

    return nextQueueIndex(queue.length, currentIdx, isShuffle);
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
      setPlaybackError('');
      setIsBuffering(true);

      if (playSessionRef.current.trackId !== currentTrack?.id && currentTrack) {
        playSessionRef.current = { trackId: currentTrack.id, startedAt: Date.now(), heardSeconds: 0, lastPosition: audio.currentTime, lastTick: Date.now() };
        void emit({ type: 'track_play_start', trackId: currentTrack.id });
      } else {
        playSessionRef.current.lastTick = Date.now(); playSessionRef.current.lastPosition = audio.currentTime;
      }

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
      setPlaybackError('재생하지 못했습니다. 다시 시도하거나 다음 곡을 선택해 주세요.');
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [audioRef, isPlaying, setIsPlaying, setIsBuffering, currentTrack, emit]);

  const pauseForExternalPlayback = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setIsBuffering(false);
  }, [audioRef, setIsPlaying, setIsBuffering]);

  const retryPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const position = audio.currentTime || 0;
    setPlaybackError(''); setIsBuffering(true);
    audio.addEventListener('loadedmetadata', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(position, audio.duration); }, { once: true });
    audio.load();
    audio.play().catch(() => { setIsBuffering(false); setPlaybackError('재생 연결이 복구되지 않았습니다. 다음 곡을 선택하거나 잠시 후 다시 시도해 주세요.'); });
  }, [audioRef, setIsBuffering]);

  useEffect(() => {
    if (!isBuffering) return;
    const timer = setTimeout(() => { setIsBuffering(false); setPlaybackError('음원 응답이 늦어지고 있습니다. 연결을 확인한 뒤 다시 재생해 주세요.'); }, 15000);
    return () => clearTimeout(timer);
  }, [isBuffering, setIsBuffering]);

  const handleNaturalTrackEnd = useCallback(() => {
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
      } catch { /* Optional browser capability. */ }

      return;
    }

    const nextIdx = loopMode === 2
      ? currentTrackIdx
      : getNextTrackIndex(q, currentTrackIdx);

    const nextTrack = q[nextIdx];
    if (!nextTrack) return;
    setCurrentTime(0);
    setDuration(0);

    void playTrack(nextIdx, q, {
      playlistKey: playSessionRef.current?.playlistKey || null,
      restart: loopMode === 2,
      continuation: true,
    });
  }, [
    currentQueue,
    currentTrackIdx,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setIsBuffering,
    loopMode,
    getNextTrackIndex,
    playTrack,
  ]);

  if (loading) {
    return (
      <div className="up-boot" role="status" aria-live="polite">
        <span className="up-boot__mark">UP</span>
        <div>
          <strong>Preparing the exhibition floor</strong>
          <small>UNFRAME PLAYLIST</small>
        </div>
        <Loader2 className="up-spin" aria-hidden="true" />
      </div>
    );
  }

  const popupMeta = newAchievement?.id
    ? getAchievementMeta(newAchievement.id)
    : null;

  return (
    <Router>
      <ScrollToTop />

      <div className={`relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''}`}>
        <AppShell user={user} userProfile={userProfile} membership={membership} isAdmin={isAdmin} playerOpen={isPlayerExpanded}>
        {dataLoading && <p className="up-notice" role="status">사운드 아카이브를 불러오고 있습니다.</p>}
        {dataError && <div className="up-notice" role="alert">{dataError}<button onClick={async () => { if (!user) await signInAnonymously(auth).catch(() => setDataError('접속하지 못했습니다. 네트워크를 확인해 주세요.')); setRetryToken((n) => n + 1); }}>다시 불러오기</button></div>}
        <Suspense fallback={<p className="up-notice" role="status">페이지를 준비하고 있습니다.</p>}>
        <AppRoutes
          publicTracks={publicTracks}
          playlists={publicPlaylists}
          adminPlaylists={playlists}
          gatheringPlaylists={gatheringPlaylists}
          isPlaying={isPlaying}
          currentTrack={currentTrack}
          playTrack={playTrack}
          togglePlay={togglePlay}
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
          setIsPlayerExpanded={setIsPlayerExpanded}
          pauseForExternalPlayback={pauseForExternalPlayback}
          appId={appId}
          library={library}
        />
        </Suspense>
        </AppShell>

        {playbackError && <div className="up-playback-error" role="alert"><span>{playbackError}</span><button onClick={retryPlayback}>다시 재생</button><button onClick={playNext}>다음 곡</button><button aria-label="오류 안내 닫기" onClick={() => setPlaybackError('')}>닫기</button></div>}

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
          onMoveQueue={(from, to) => {
            if (to < 0 || to >= currentQueue.length) return;
            const next = [...currentQueue]; const [item] = next.splice(from, 1); next.splice(to, 0, item);
            setCurrentQueue(next); setCurrentTrackIdx(next.findIndex((t) => t.id === currentTrack.id));
          }}
          onRemoveQueue={(index) => {
            if (index === currentTrackIdx) return;
            const next = currentQueue.filter((_, i) => i !== index);
            setCurrentQueue(next); setCurrentTrackIdx(next.findIndex((t) => t.id === currentTrack.id));
          }}
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

        {!user?.isAnonymous && (
          <AchievementPopup
            newAchievement={newAchievement}
            popupMeta={popupMeta}
            displayName={displayName}
            formatDateTime={formatDateTime}
            setNewAchievement={setNewAchievement}
            setShareItem={setShareItem}
          />
        )}

        {shareItem && <ShareCard
          shareItem={shareItem}
          shareCardRef={shareCardRef}
          user={user}
          formatDateTime={formatDateTime}
        />}

        <AnimatePresence>
          {toastMessage && (
            <Motion.div
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              exit={{ y: -8 }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              onClick={() => {
                if (!lastCardUrl) return;
                const link = document.createElement('a');
                link.download = 'unframe-card.png';
                link.href = lastCardUrl;
                link.click();
              }}
              className="up-feedback-toast"
              title={lastCardUrl ? "Click to download the last generated card" : ""}
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              {toastMessage}
              {lastCardUrl ? <span className="opacity-80"> • CLICK TO DOWNLOAD</span> : null}
            </Motion.div>
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
            setIsPlaying(true);
            setPlaybackError('');
            try { if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing'; } catch { /* Optional capability. */ }
          }}
          onPause={() => {
            setIsPlaying(false);
            try { if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused'; } catch { /* Optional capability. */ }
          }}
          onError={() => {
            setIsBuffering(false);
            setIsPlaying(false);
            setPlaybackError('음원을 불러오지 못했습니다. 연결을 확인한 뒤 다시 재생해 주세요.');
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
            } catch { /* Optional browser capability. */ }
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
            } catch { /* Optional browser capability. */ }
          }}
          onEnded={handleNaturalTrackEnd}
          preload="metadata"
          playsInline
        />
      </div>
    </Router>
  );
}
