// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { domToPng } from 'modern-screenshot'; 
import confetti from 'canvas-confetti'; 
import { 
  getAuth, onAuthStateChanged, signInAnonymously, signOut, signInWithPopup, GoogleAuthProvider 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, collection, onSnapshot, query, updateDoc, increment, deleteDoc, getDoc, orderBy 
} from 'firebase/firestore';
import { 
  Loader2, Music, Heart, Share2, Zap, Trophy, Medal, Calendar, Star, Moon, Coffee, Ghost, CheckCircle2, Waves, Target, Headphones, User, Disc, Sparkles, Archive as ArchiveIcon
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import About from './pages/About';
import ScrollToTop from './components/ScrollToTop';

// Firebase 설정
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

const getFormattedDateTime = () => {
  const d = new Date();
  const week = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.(${week[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getDirectLink = (url) => {
  if (!url) return "";
  if (url.includes("dropbox.com")) return url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/\?dl=\d/, "").replace(/&dl=\d/, "");
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/(.+?)\/(view|edit)?/);
    if (match && match[1]) return `https://docs.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [userLikes, setUserLikes] = useState([]);
  const [userProfile, setUserProfile] = useState({ listenCount: 0, shareCount: 0, firstJoin: Date.now(), rewards: [], profileImg: '', hasSeenGuide: false });
  const [playlists, setPlaylists] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState(0); 
  const [isShuffle, setIsShuffle] = useState(false);
  const [currentQueue, setCurrentQueue] = useState([]); 
  const [scrolled, setScrolled] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [rankingTheme, setRankingTheme] = useState({ id: 'night_owl', title: '심야의 감상자', desc: '새벽 0시-4시, 정적 속에 머문 이들', icon: Moon });
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [playerView, setPlayerView] = useState('cover');
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  const [authError, setAuthError] = useState(null);

  const audioRef = useRef(null);
  const shareCardRef = useRef(null);
  // 🚀 [해결] 이전 보상 개수를 기억하기 위한 Ref
  const prevRewardsLength = useRef(null);

  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);
  const currentTrack = useMemo(() => currentQueue.length > 0 ? currentQueue[currentTrackIdx] : null, [currentQueue, currentTrackIdx]);

  const formatTime = useCallback((time) => { if (isNaN(time)) return "0:00"; const min = Math.floor(time / 60); const sec = Math.floor(time % 60); return `${min}:${String(sec).padStart(2, '0')}`; }, []);

  const membership = useMemo(() => {
    const days = Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000);
    if (days >= 100) return { name: "Family", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)", icon: Moon };
    if (days >= 30) return { name: "Regular", color: "#004aad", bg: "rgba(0, 74, 173, 0.1)", icon: Sparkles };
    if (days >= 7) return { name: "Friend", color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)", icon: Coffee };
    return { name: "Hello", color: "#71717a", bg: "rgba(255, 255, 255, 0.05)", icon: Ghost };
  }, [userProfile?.firstJoin]);

  const triggerFireworks = useCallback(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;
    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 40 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { 
        setUser(u); 
        setIsAdmin(!!(u?.email && ADMIN_EMAILS.includes(u.email.toLowerCase()))); 
        if (u) setLoading(false); 
        else signInAnonymously(auth).then(() => setLoading(false)).catch(() => setLoading(false));
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => { unsub(); window.removeEventListener('scroll', handleScroll); };
  }, []);

  // 🚀 [해결] 토스트 메시지 자동 삭제 로직 강화
  useEffect(() => { 
    if (toastMessage) { 
      const timer = setTimeout(() => setToastMessage(null), 5000); 
      return () => clearTimeout(timer); 
    } 
  }, [toastMessage]);

  useEffect(() => {
    if (!user) return;
    onSnapshot(collection(db, 'artifacts', appId, 'public_stats'), (snap) => {
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(users.sort((a, b) => (b.listenCount || 0) - (a.listenCount || 0)));
    });
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tracks')), (snap) => { 
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTracks(loaded); if (currentQueue.length === 0) setCurrentQueue(loaded.filter(t => !t.isHidden));
    });
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'playlists')), (snap) => { setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'), (snap) => setUserLikes(snap.docs.map(d => d.id)));
    
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) { 
          const data = snap.data();
          const currentRewardsCount = data.rewards?.length || 0;

          // 🚀 [해결] 최초 로드 시에는 폭죽을 터뜨리지 않고, 이후 개수가 늘어날 때만 트리거
          if (prevRewardsLength.current !== null && currentRewardsCount > prevRewardsLength.current) {
              triggerFireworks();
              setToastMessage("새로운 아티팩트 스티커를 획득했습니다! 🎇");
          }
          
          prevRewardsLength.current = currentRewardsCount;
          setUserProfile(data);
          await setDoc(doc(db, 'artifacts', appId, 'public_stats', user.uid), { displayName: user.displayName || 'Anonymous', listenCount: data.listenCount || 0, profileImg: data.profileImg || '', membership: membership.name }, { merge: true });
      } else { await setDoc(profileRef, { listenCount: 0, shareCount: 0, firstJoin: Date.now(), rewards: [], profileImg: '', hasSeenGuide: false }); }
    });
  }, [user, membership.name, triggerFireworks]);

  // 이미지 생성 로직 (Aura of Taste 다크 모드)
  useEffect(() => {
    const generateImage = async () => {
        if (!shareItem || !shareCardRef.current) return;
        try {
            setToastMessage("영롱한 카드 발급 중... ✨");
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            const dataUrl = await domToPng(shareCardRef.current, { backgroundColor: '#1a1a1a', scale: 3, quality: 1 });
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window);
            if (isMobile && navigator.share) {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], `unframe-${Date.now()}.png`, { type: 'image/png' });
                try { await navigator.share({ files: [file], title: 'UNFRAME Achievement' }); setToastMessage("공유 성공! ✨"); } 
                catch (err) { if (err.name === 'AbortError') setToastMessage("공유 취소"); else throw err; }
            } else {
                const link = document.createElement('a'); link.download = `unframe-aura-card.png`; link.href = dataUrl; link.click();
                setToastMessage("아카이브에 저장되었습니다 📸");
            }
        } catch (err) { setToastMessage("발급 실패: 렌더링 오류"); } finally { setShareItem(null); }
    };
    if (shareItem) generateImage();
  }, [shareItem]);

  const handleToggleLike = async (e, trackId) => { if (e) e.stopPropagation(); if (!user) return; const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId); if (userLikes.includes(trackId)) { await deleteDoc(likeDoc); } else { await setDoc(likeDoc, { likedAt: Date.now() }); setToastMessage("아카이브에 기록되었습니다 💗"); } };
  const handleShare = (e, item, type = 'track') => { if (e) e.stopPropagation(); if (user && type === 'track') updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { shareCount: increment(1) }); setShareItem({ ...item, type }); };

  const playTrack = async (idx, queue = null) => { 
    const audio = audioRef.current; if (!audio) return;
    const activeQueue = queue || currentQueue;
    const targetIdx = idx !== undefined ? idx : currentTrackIdx;
    const targetTrack = activeQueue[targetIdx]; if (!targetTrack) return;
    const directUrl = getDirectLink(targetTrack.audioUrl);
    if (audio.src !== directUrl) { audio.src = directUrl; audio.load(); }
    if (idx !== undefined) setCurrentTrackIdx(idx);
    setIsPlaying(true); try { await audio.play(); } catch (e) { setIsPlaying(false); } 
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <Router>
      <ScrollToTop />
      <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''}`}>
        <audio ref={audioRef} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onEnded={() => playTrack((currentTrackIdx + 1) % currentQueue.length)} onPlay={() => { if(user) updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { listenCount: increment(1) }); }} playsInline />
        
        <header className={`fixed top-0 w-full z-100 transition-all duration-500 ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/5' : 'py-6 lg:py-10'}`}>
          <div className="container mx-auto px-6 lg:px-8 flex justify-between items-end">
            <Link to="/"><h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic leading-none">Unframe<span className="text-[#004aad]">.</span></h1></Link>
            <nav className="flex items-center gap-4 lg:gap-10">
              <Link to="/about" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad]">About</Link>
              <Link to="/archive" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad]">Archive</Link>
            </nav>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home tracks={publicTracks} playlists={playlists} isPlaying={isPlaying} playTrack={playTrack} userLikes={userLikes} handleToggleLike={handleToggleLike} setSelectedTrack={setSelectedTrack} db={db} siteConfig={siteConfig} rankingTheme={rankingTheme} allUsers={allUsers} />} />
            <Route path="/archive" element={<Archive user={user} userProfile={userProfile} membership={membership} userLikes={userLikes} tracks={tracks} handleShare={handleShare} signOut={() => signOut(auth)} setSelectedTrack={setSelectedTrack} db={db} appId={appId} handleGoogleLogin={() => signInWithPopup(auth, new GoogleAuthProvider())} rankingTheme={rankingTheme} allUsers={allUsers} triggerFireworks={triggerFireworks} />} />
            <Route path="/about" element={<About siteConfig={siteConfig} />} />
            <Route path="/admin" element={<Admin isAdmin={isAdmin} user={user} signInWithPopup={() => signInWithPopup(auth, new GoogleAuthProvider())} tracks={tracks} playlists={playlists} db={db} appId={appId} setToastMessage={setToastMessage} setAuthError={setAuthError} />} />
          </Routes>
        </AnimatePresence>

        <AudioPlayer currentTrack={currentTrack} isPlayerExpanded={isPlayerExpanded} setIsPlayerExpanded={setIsPlayerExpanded} isPlaying={isPlaying} progressPct={duration ? (currentTime / duration) * 100 : 0} volume={volume} isMuted={isMuted} setIsMuted={setIsMuted} setVolume={setVolume} handleShare={handleShare} handleToggleLike={handleToggleLike} userLikes={userLikes} togglePlay={(e) => { if(e) e.stopPropagation(); isPlaying ? (setIsPlaying(false), audioRef.current?.pause()) : playTrack(); }} playTrack={playTrack} currentTrackIdx={currentTrackIdx} publicTracks={currentQueue} isBuffering={isBuffering} playerView={playerView} setPlayerView={setPlayerView} parsedLyrics={parsedLyrics} setParsedLyrics={setParsedLyrics} duration={duration} currentTime={currentTime} audioRef={audioRef} formatTime={formatTime} loopMode={loopMode} toggleLoop={() => setLoopMode(p => (p+1)%3)} isShuffle={isShuffle} toggleShuffle={() => setIsShuffle(!isShuffle)} />

        {/* 🚀 Aura of Taste (다크 카드 이미지 영역) */}
        {shareItem && (
            <div ref={shareCardRef} style={{
                position: 'fixed', top: 0, left: 0, width: '600px', height: '850px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #242424 60%, #004aad 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: -1, opacity: 0.99, pointerEvents: 'none'
            }}>
                <div style={{ width: '560px', height: '810px', border: '1.5px solid #7dd3fc', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 40px', boxSizing: 'border-box' }}>
                    <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '60px', height: '60px', border: '1.5px solid #7dd3fc', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '60px', height: '60px', border: '1.5px solid #7dd3fc', borderRadius: '50%' }} />
                    <h1 style={{ fontSize: '56px', fontWeight: 300, color: '#ffffff', letterSpacing: '0.1em', margin: 0 }}>{shareItem.title}</h1>
                    <div style={{ position: 'relative', width: '320px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', width: '240px', height: '240px', background: `radial-gradient(circle, ${shareItem.color || '#7dd3fc'}44 0%, transparent 60%)`, filter: 'blur(50px)', zIndex: 1, mixBlendMode: 'screen' }} />
                        <div style={{ zIndex: 5, filter: `drop-shadow(0 0 8px ${shareItem.color || '#7dd3fc'}) drop-shadow(0 0 15px ${shareItem.color || '#7dd3fc'}66)` }}>
                            {shareItem.type === 'reward' ? React.createElement(shareItem.icon, { size: 180, color: '#ffffff', strokeWidth: 1.5 }) : shareItem.image ? <div style={{ width: '200px', height: '200px', border: '4px solid #ffffff', borderRadius: '40px', overflow: 'hidden' }}><img src={shareItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" /></div> : <Music size={150} color="#ffffff" />}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', zIndex: 10 }}>
                        <p style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff', margin: 0 }}><span style={{ fontWeight: 800, color: '#7dd3fc' }}>{user?.displayName || 'Collector'}</span> 님,</p>
                        <p style={{ fontSize: '24px', fontWeight: 300, color: '#ffffff', marginTop: '8px' }}>취향의 기록을 시작했어요.</p>
                    </div>
                    <div style={{ textAlign: 'center', width: '100%', borderTop: '0.5px solid #7dd3fc55', paddingTop: '30px' }}>
                        <p style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '15px' }}>{getFormattedDateTime()}</p>
                        <p style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.15em' }}>UNFRAME PLAYLIST</p>
                    </div>
                </div>
            </div>
        )}

        {/* 🚀 푸터 복구 */}
        <footer className="py-24 lg:py-40 bg-[#fdfbf7] text-black border-t border-zinc-200 px-6 lg:px-8 relative z-30">
            <div className="container mx-auto grid lg:grid-cols-4 gap-12 lg:gap-10 opacity-80">
              <div className="space-y-6 lg:space-y-10">
                <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-[#004aad]">Unframe<span className="text-black">.</span></h1>
                <p className="text-[9px] lg:text-[11px] font-black uppercase leading-loose text-zinc-400">© 2026 UNFRAME ART COLLECTIVE.</p>
              </div>
              <div className="space-y-4 lg:space-y-8">
                <p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> VISIT US</p>
                <ul className="text-xs lg:text-sm font-bold opacity-60 space-y-1"><li>서울특별시 종로구 인사동4길 17, 108호</li><li>Tue - Sun, 11:00 - 19:00</li></ul>
              </div>
              <div className="space-y-4 lg:space-y-8">
                <p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> SYSTEM</p>
                <ul className="text-xs lg:text-sm font-bold opacity-80 underline space-y-1">
                  <li><Link to="/admin" className="cursor-pointer hover:text-[#004aad] transition-colors">Console / Admin</Link></li>
                  <li><Link to="/about" className="cursor-pointer hover:text-[#004aad] transition-colors">Project Info</Link></li>
                </ul>
              </div>
              <div className="space-y-4 lg:space-y-8">
                <p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> CONNECT</p>
                <div className="flex gap-4"><a href="https://unframe.kr" target="_blank" className="text-xs font-black uppercase hover:text-[#004aad]">Web</a><a href="https://instagram.com" target="_blank" className="text-xs font-black uppercase hover:text-[#004aad]">Insta</a></div>
              </div>
            </div>
        </footer>

        <AnimatePresence>{toastMessage && (<motion.div initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed bottom-32 left-1/2 z-1000 bg-[#004aad] text-white px-8 py-4 rounded-full font-black uppercase text-[10px] shadow-2xl flex items-center gap-2 transition-transform cursor-pointer"><CheckCircle2 className="w-3 h-3" /> {toastMessage}</motion.div>)}</AnimatePresence>
        
        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          input[type=range] { writing-mode: horizontal-tb; appearance: auto; }
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        `}</style>
      </div>
    </Router>
  );
}