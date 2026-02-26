// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  setDoc,
  collection,
  onSnapshot,
  query,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import About from './pages/About';
import ScrollToTop from './components/ScrollToTop';

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

// 📅 날짜/시간 포맷
const getFormattedDateTime = () => {
  const d = new Date();
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
    return new Promise((res) => {
      img.onload = () => res();
      img.onerror = () => res();
    });
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

export default function App() {
  // --- 상태 ---
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
    profileImg: '',
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
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

  const [siteConfig, setSiteConfig] = useState({
    title: 'UNFRAME',
    subTitle: 'PLAYLIST',
    phil_sub: 'Philosophy',
    phil_title: 'Watching\nBeyond Listening',
    phil_desc: "'UP'은 전시장의 잔향을 일상의 이어폰 속으로 옮겨오는 프로젝트입니다.",
    phil_quote: "전시장의 공기는 눈으로만 보는 것이 아니라, 귀로 들리고 피부로 느껴지는 입체적인 경험입니다.",
  });

  const [newAchievement, setNewAchievement] = useState(null);

  // ✅ (옵션 1.2) 토스트 클릭 다운로드용: 마지막 생성 카드 dataUrl 저장
  const [lastCardUrl, setLastCardUrl] = useState(null);

  // refs
  const audioRef = useRef(null);
  const shareCardRef = useRef(null);
  const prevRewardsLength = useRef(null);

  // --- derived ---
  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);

  const currentTrack = useMemo(() => {
    if (!currentQueue || currentQueue.length === 0) return null;
    return currentQueue[currentTrackIdx] ?? null;
  }, [currentQueue, currentTrackIdx]);

  const membership = useMemo(() => {
    const days = Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000);
    if (days >= 100) return { name: "Family", color: "#a78bfa", bg: "rgba(167,139,250,0.15)", icon: Moon };
    return { name: "Hello", color: "#71717a", bg: "rgba(113,113,122,0.10)", icon: Ghost };
  }, [userProfile?.firstJoin]);

  const formatTime = useCallback((time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  }, []);

  // --- 재생 ---
  const playTrack = async (idx, queue = null) => {
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

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  const handleToggleLike = async (e, trackId) => {
    if (e) e.stopPropagation();
    if (!user || !trackId) return;

    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);
    if (userLikes.includes(trackId)) {
      await deleteDoc(likeDoc);
    } else {
      await setDoc(likeDoc, { likedAt: Date.now() });
      setToastMessage("아카이브에 기록되었습니다 💗");
    }
  };

  const handleResetUserData = async () => {
    if (!window.confirm("기록을 초기화하시겠습니까?")) return;

    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
      await updateDoc(profileRef, { listenCount: 0, shareCount: 0, rewards: [] });

      const likesSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'));
      const batch = writeBatch(db);
      likesSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      setToastMessage("초기화 완료");
    } catch {
      setToastMessage("초기화 실패");
    }
  };

  // ✅ share 시 image를 dataURL로 변환(캡처 안정화)
  const handleShare = async (e, item, type = 'track') => {
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
      // 방어 기본값
      title: item?.title ?? "UNFRAME",
      desc: item?.desc ?? "",
      color: item?.color ?? "#7dd3fc",
    });
  };

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

  // --- Firestore Sync ---
  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const rewardsLen = data.rewards?.length || 0;

      if (prevRewardsLength.current !== null && rewardsLen > prevRewardsLength.current) {
        setNewAchievement(data.rewards[data.rewards.length - 1]);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }

      prevRewardsLength.current = rewardsLen;
      setUserProfile(data);
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
      .then(snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        setSiteConfig((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});

    return () => {
      unsubProfile();
      unsubPublicUsers();
      unsubTracks();
      unsubPlaylists();
      unsubLikes();
    };
  }, [user]);

  // ✅ Media Session
  useEffect(() => {
    if (!currentTrack) return;
    if (!('mediaSession' in navigator)) return;

    const artworkUrl = currentTrack.image ? getDirectLink(currentTrack.image) : "";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title ?? 'UNFRAME',
      artist: currentTrack.artist ?? '',
      album: currentTrack.album ?? 'UNFRAME PLAYLIST',
      artwork: artworkUrl
        ? [
            { src: artworkUrl, sizes: '96x96', type: 'image/png' },
            { src: artworkUrl, sizes: '192x192', type: 'image/png' },
            { src: artworkUrl, sizes: '512x512', type: 'image/png' },
          ]
        : [],
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

  const handleToastClick = () => {
    if (!lastCardUrl) return;
    const link = document.createElement('a');
    link.download = 'unframe-card.png';
    link.href = lastCardUrl;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#004aad]" />
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />

      <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''} pb-[160px]`}>
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
                handleReset={handleResetUserData}
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

        {/* 업적 팝업 */}
        <AnimatePresence>
          {newAchievement && (
            <div className="fixed inset-0 z-10000 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-sm w-full bg-gradient-to-br from-[#1a1a1a] to-[#004aad]/20 border border-[#7dd3fc]/30 rounded-[40px] p-8 text-center"
              >
                <Sparkles className="absolute top-6 right-6 text-[#7dd3fc] animate-pulse" />
                <h2 className="text-3xl font-black mb-2 text-white uppercase italic">Congratulations!</h2>
                <p className="text-zinc-400 text-sm mb-10 leading-relaxed">
                  새로운 기록의 조각을 찾았습니다.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setNewAchievement(null)} className="py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase transition-all">
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // ✅ 카드 디자인에서 shareItem.icon 사용하므로 icon 포함
                      setShareItem({
                        title: "Achievement Unlocked",
                        desc: "UNFRAME에서 아티팩트를 획득했습니다.",
                        type: 'reward',
                        color: '#7dd3fc',
                        icon: Heart,
                      });
                      setNewAchievement(null);
                    }}
                    className="py-4 bg-[#004aad] rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                  >
                    <Share size={12} /> Share Card
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ✅ [Hidden] 공유 카드 (너가 준 디자인 적용) */}
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

              {/* 하단 푸터 */}
              <div style={{ textAlign: 'center', width: '100%', borderTop: '0.5px solid #7dd3fc55', paddingTop: '25px' }}>
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.3em', marginBottom: '8px' }}>
                  ACHIEVEMENT CARD
                </p>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
                  {getFormattedDateTime()}
                </p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.15em', textShadow: '0 0 10px rgba(125, 211, 252, 0.3)' }}>
                  UNFRAME PLAYLIST
                </p>
              </div>

              {/* 떠다니는 장식 */}
              <div style={{ position: 'absolute', top: '160px', left: '50px', color: '#7dd3fc', fontSize: '24px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
              <div style={{ position: 'absolute', top: '200px', right: '60px', color: '#ffffff', fontSize: '18px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
              <div style={{ position: 'absolute', bottom: '240px', left: '70px', color: '#ffffff', fontSize: '20px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>◆</div>
              <div style={{ position: 'absolute', bottom: '180px', right: '40px', color: '#7dd3fc', fontSize: '28px', filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>✦</div>
              <div style={{ position: 'absolute', left: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>
              <div style={{ position: 'absolute', right: '20px', top: '50%', color: '#ffffff', fontSize: '14px', filter: 'drop-shadow(0 0 5px #ffffff)' }}>✨</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-24 bg-[#fdfbf7] text-black border-t border-zinc-200 px-6 lg:px-8 relative z-30">
          <div className="container mx-auto grid lg:grid-cols-4 gap-12 opacity-80">
            <div className="space-y-6">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-[#004aad]">
                Unframe<span className="text-black">.</span>
              </h1>
              <p className="text-[9px] font-black uppercase text-zinc-400">© 2026 UNFRAME ART COLLECTIVE.</p>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#004aad]">VISIT US</p>
              <ul className="text-xs font-bold opacity-60 space-y-1">
                <li>서울특별시 종로구 인사동4길 17, 108호</li>
                <li>Tue - Sun, 11:00 - 19:00</li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#004aad]">SYSTEM</p>
              <ul className="text-xs font-bold opacity-80 underline space-y-1">
                <li><Link to="/admin" className="hover:text-[#004aad]">Admin Console</Link></li>
                <li><Link to="/about" className="hover:text-[#004aad]">Project Info</Link></li>
              </ul>
            </div>
          </div>
        </footer>

        {/* Toast (클릭=다운로드) */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0 }}
              onClick={handleToastClick}
              className="fixed bottom-32 left-1/2 z-1000 bg-[#004aad] text-white px-8 py-4 rounded-full font-black uppercase text-[10px] shadow-2xl flex items-center gap-2 cursor-pointer select-none"
              title={lastCardUrl ? "Click to download the last generated card" : ""}
            >
              <CheckCircle2 className="w-3 h-3" />
              {toastMessage}
              {lastCardUrl ? <span className="opacity-80"> • CLICK TO DOWNLOAD</span> : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* audio element */}
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => {
            if (!currentQueue || currentQueue.length === 0) return;
            playTrack((currentTrackIdx + 1) % currentQueue.length);
          }}
          playsInline
        />

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        `}</style>
      </div>
    </Router>
  );
}