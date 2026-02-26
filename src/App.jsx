// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { domToPng } from 'modern-screenshot'; // npm install modern-screenshot 필수
import { 
  getAuth, onAuthStateChanged, signInAnonymously, signOut, signInWithPopup, GoogleAuthProvider 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, collection, onSnapshot, query, updateDoc, increment, deleteDoc, getDoc, orderBy 
} from 'firebase/firestore';
import { 
  Loader2, Music, Heart, Share2, Zap, Trophy, Medal, Calendar, Star, Moon, Coffee, Ghost, CheckCircle2, Waves, Target, Headphones, User
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

const getFormattedDate = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}.`;
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

  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);
  const currentTrack = useMemo(() => currentQueue.length > 0 ? currentQueue[currentTrackIdx] : null, [currentQueue, currentTrackIdx]);

  const formatTime = useCallback((time) => { 
    if (isNaN(time)) return "0:00"; 
    const min = Math.floor(time / 60); 
    const sec = Math.floor(time % 60); 
    return `${min}:${String(sec).padStart(2, '0')}`; 
  }, []);

  const membership = useMemo(() => {
    const days = Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000);
    if (days >= 100) return { name: "Family", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)", icon: Moon };
    if (days >= 30) return { name: "Regular", color: "#004aad", bg: "rgba(0, 74, 173, 0.1)", icon: Star };
    if (days >= 7) return { name: "Friend", color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)", icon: Coffee };
    return { name: "Hello", color: "#71717a", bg: "rgba(255, 255, 255, 0.05)", icon: Ghost };
  }, [userProfile?.firstJoin]);

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

  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts');
    getDoc(configRef).then(snap => { if (snap.exists()) setSiteConfig(snap.data()); });
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
    onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), (snap) => { if (snap.exists()) setUserProfile(snap.data()); });
  }, [user]);

  // 🚀 이미지 생성 (modern-screenshot 안정화)
  useEffect(() => {
    const generateImage = async () => {
        if (!shareItem || !shareCardRef.current) return;
        try {
            setToastMessage("고화질 포스터 발급 중... 🎨");
            await new Promise(resolve => setTimeout(resolve, 1500)); 

            const dataUrl = await domToPng(shareCardRef.current, {
                backgroundColor: '#fdfbf7',
                scale: 2,
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `unframe-${Date.now()}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'UNFRAME Project' });
            } else {
                const link = document.createElement('a');
                link.download = `unframe-poster.png`; link.href = dataUrl; link.click();
                setToastMessage("포스터가 저장되었습니다 📸");
            }
        } catch (err) {
            console.error("CAPTURE ERROR:", err);
            setToastMessage("발급 실패: 이미지 로드 오류");
        } finally {
            setShareItem(null);
        }
    };
    if (shareItem) generateImage();
  }, [shareItem]);

  const handleShare = (e, item, type = 'track') => { if (e) e.stopPropagation(); setShareItem({ ...item, type }); };
  const handleToggleLike = async (e, trackId) => {
    if (e) e.stopPropagation();
    if (!user) return;
    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);
    if (userLikes.includes(trackId)) { await deleteDoc(likeDoc); } 
    else { await setDoc(likeDoc, { likedAt: Date.now() }); setToastMessage("아카이브에 기록되었습니다 💗"); }
  };

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
      <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans relative overflow-x-hidden">
        <audio ref={audioRef} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onEnded={() => playTrack((currentTrackIdx + 1) % currentQueue.length)} playsInline />
        
        <header className={`fixed top-0 w-full z-100 transition-all ${scrolled ? 'py-4 bg-black/80 backdrop-blur-xl' : 'py-10'}`}>
          <div className="container mx-auto px-6 flex justify-between items-end">
            <Link to="/"><h1 className="text-2xl font-black tracking-tighter uppercase italic">Unframe<span className="text-[#004aad]">.</span></h1></Link>
            <nav className="flex gap-10">
              <Link to="/about" className="text-[11px] font-black uppercase tracking-widest">About</Link>
              <Link to="/archive" className="text-[11px] font-black uppercase tracking-widest">Archive</Link>
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home tracks={publicTracks} playlists={playlists} isPlaying={isPlaying} playTrack={playTrack} userLikes={userLikes} handleToggleLike={handleToggleLike} setSelectedTrack={setSelectedTrack} db={db} siteConfig={siteConfig} rankingTheme={rankingTheme} allUsers={allUsers} handleShare={handleShare} />} />
          <Route path="/archive" element={<Archive user={user} userProfile={userProfile} membership={membership} tracks={tracks} handleShare={handleShare} db={db} appId={appId} allUsers={allUsers} userLikes={userLikes} handleGoogleLogin={() => signInWithPopup(auth, new GoogleAuthProvider())} signOut={() => signOut(auth)} setSelectedTrack={setSelectedTrack} />} />
          <Route path="/about" element={<About siteConfig={siteConfig} />} />
          <Route path="/admin" element={<Admin isAdmin={isAdmin} user={user} signInWithPopup={() => signInWithPopup(auth, new GoogleAuthProvider())} tracks={tracks} playlists={playlists} db={db} appId={appId} setToastMessage={setToastMessage} setAuthError={setAuthError} />} />
        </Routes>

        <AudioPlayer 
            currentTrack={currentTrack} isPlayerExpanded={isPlayerExpanded} setIsPlayerExpanded={setIsPlayerExpanded} 
            isPlaying={isPlaying} progressPct={duration ? (currentTime / duration) * 100 : 0} volume={volume} 
            isMuted={isMuted} setIsMuted={setIsMuted} setVolume={setVolume} handleShare={handleShare} 
            handleToggleLike={handleToggleLike} userLikes={userLikes} togglePlay={(e) => { if(e) e.stopPropagation(); isPlaying ? (setIsPlaying(false), audioRef.current?.pause()) : playTrack(); }} 
            playTrack={playTrack} currentTrackIdx={currentTrackIdx} publicTracks={currentQueue} isBuffering={isBuffering} 
            playerView={playerView} setPlayerView={setPlayerView} parsedLyrics={parsedLyrics} setParsedLyrics={setParsedLyrics} 
            duration={duration} currentTime={currentTime} audioRef={audioRef} formatTime={formatTime} loopMode={loopMode} 
            toggleLoop={() => setLoopMode(p => (p+1)%3)} isShuffle={isShuffle} toggleShuffle={() => setIsShuffle(!isShuffle)} 
        />

        {/* 🚀 포스터 카드 (src="" 에러 완벽 차단) */}
        {shareItem && (
            <div ref={shareCardRef} style={{
                position: 'fixed', left: '-9999px', top: 0,
                width: '600px', height: '850px',
                backgroundColor: '#fdfbf7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
                <div style={{ padding: '40px 0 0 0', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '120px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.07em', color: '#000000', margin: 0, lineHeight: 0.8 }}>Unframe</h1>
                </div>

                <div style={{ margin: '0 auto', width: '520px', height: '520px', backgroundColor: shareItem.color || '#ef4444', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                    <p style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.3em', opacity: 0.8, color: '#ffffff', margin: 0 }}>ACHIEVEMENT CARD</p>
                    <p style={{ position: 'absolute', right: '30px', bottom: '30px', fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>{getFormattedDate()}</p>
                    <div style={{ textAlign: 'center', zIndex: 5, width: '100%' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 40px 0', color: '#ffffff' }}>{shareItem.title}</h2>
                        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.25))' }}>
                            {shareItem.type === 'reward' ? (
                                <div style={{ transform: 'perspective(1000px) rotateX(5deg) rotateY(-5deg)' }}>
                                    {React.createElement(shareItem.icon, { size: 160, color: '#ffffff', strokeWidth: 1.5 })}
                                </div>
                            ) : (shareItem.image && shareItem.image.trim() !== "") ? ( // 🚀 여기서 빈 주소 체크!
                                <div style={{ width: '240px', height: '240px', border: '8px solid #ffffff', overflow: 'hidden' }}>
                                    <img src={shareItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" alt="" />
                                </div>
                            ) : (<Music size={100} color="#ffffff" opacity={0.5} />)}
                        </div>
                        <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, padding: '0 40px', lineHeight: 1.4, color: '#ffffff' }}>{shareItem.desc}</p>
                    </div>
                </div>

                <div style={{ padding: '0 0 40px 0', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '120px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.07em', color: '#000000', margin: 0, lineHeight: 0.8 }}>Playlist</h1>
                </div>
            </div>
        )}

        <AnimatePresence>{toastMessage && (<motion.div initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed bottom-10 left-1/2 z-1000 bg-[#004aad] text-white px-8 py-4 rounded-full font-black uppercase text-[10px] shadow-2xl flex items-center gap-2 transition-transform cursor-pointer"><CheckCircle2 className="w-3 h-3" /> {toastMessage}</motion.div>)}</AnimatePresence>
        
        {/* 🚀 슬라이더 경고 해결 스타일 */}
        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          input[type=range] { writing-mode: horizontal-tb; appearance: auto; }
        `}</style>
      </div>
    </Router>
  );
}