// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import html2canvas from 'html2canvas'; 
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

// 날짜 포맷 헬퍼 함수 (이미지 스타일 반영: 2026.02.26.)
const getFormattedDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}.`;
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
  const [authError, setAuthError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [rankingTheme, setRankingTheme] = useState({ id: 'night_owl', title: '심야의 감상자', desc: '새벽 0시-4시, 정적 속에 머문 이들', icon: Moon });
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [playerView, setPlayerView] = useState('cover');
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);

  const audioRef = useRef(null);
  const shareCardRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);
  const currentTrack = currentQueue.length > 0 ? currentQueue[currentTrackIdx] : null;

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { setAuthError("로그인 실패: " + error.message); } };

  const membership = useMemo(() => {
    const days = Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000);
    if (days >= 100) return { name: "Family", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)", icon: Moon };
    if (days >= 30) return { name: "Regular", color: "#004aad", bg: "rgba(0, 74, 173, 0.1)", icon: Star };
    if (days >= 7) return { name: "Friend", color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)", icon: Coffee };
    return { name: "Hello", color: "#71717a", bg: "rgba(255, 255, 255, 0.05)", icon: Ghost };
  }, [userProfile?.firstJoin]);

  const formatTime = useCallback((time) => { if (isNaN(time)) return "0:00"; const min = Math.floor(time / 60); const sec = Math.floor(time % 60); return `${min}:${String(sec).padStart(2, '0')}`; }, []);

  const updateMediaSession = useCallback((track, queue, index) => {
    if (!track || !('mediaSession' in navigator)) return;
    const artUrl = track.image || '';
    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title, artist: track.artist, album: 'UNFRAME PLAYLIST',
        artwork: [{ src: artUrl, sizes: '512x512', type: 'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play', () => { setIsPlaying(true); audioRef.current?.play(); });
    navigator.mediaSession.setActionHandler('pause', () => { setIsPlaying(false); audioRef.current?.pause(); });
    if (queue && queue.length > 0) {
        navigator.mediaSession.setActionHandler('previoustrack', () => playTrack((index - 1 + queue.length) % queue.length, queue));
        navigator.mediaSession.setActionHandler('nexttrack', () => playTrack((index + 1) % queue.length, queue));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => { try { if (!auth.currentUser) await signInAnonymously(auth); } catch (err) {} };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { if (isMounted) { setUser(u); setIsAdmin(!!(u?.email && ADMIN_EMAILS.includes(u.email.toLowerCase()))); if (u) setLoading(false); } });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => { isMounted = false; unsubscribe(); window.removeEventListener('scroll', handleScroll); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubAllUsers = onSnapshot(collection(db, 'artifacts', appId, 'public_stats'), (snap) => {
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(users.sort((a, b) => (b.listenCount || 0) - (a.listenCount || 0)));
    });
    const unsubTracks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tracks')), (snap) => { 
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTracks(loaded); if (currentQueue.length === 0) setCurrentQueue(loaded.filter(t => !t.isHidden));
    });
    const unsubLikes = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'), (snap) => setUserLikes(snap.docs.map(d => d.id)));
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) { 
          const data = snap.data(); setUserProfile(data);
          await setDoc(doc(db, 'artifacts', appId, 'public_stats', user.uid), { displayName: user.displayName || 'Anonymous', listenCount: data.listenCount || 0, profileImg: data.profileImg || '', membership: membership.name }, { merge: true });
      } else { await setDoc(profileRef, { listenCount: 0, shareCount: 0, firstJoin: Date.now(), rewards: [], profileImg: '', hasSeenGuide: false }); }
    });
    return () => { unsubTracks(); unsubLikes(); unsubProfile(); unsubAllUsers(); };
  }, [user, membership.name]);

  const handleToggleLike = async (e, trackId) => { if (e) e.stopPropagation(); if (!user) return; const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId); if (userLikes.includes(trackId)) { await deleteDoc(likeDoc); } else { await setDoc(likeDoc, { likedAt: Date.now() }); setToastMessage("아카이브에 기록되었습니다 💗"); } };
  
  // 🚀 공유 핸들러
  const handleShare = async (e, item, type = 'track') => { 
    if (e) e.stopPropagation(); 
    if (user && type === 'track') updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { shareCount: increment(1) }); 
    setShareItem({ ...item, type }); 
  };

  // 🚀 이미지 생성 및 공유 로직 (디자인 업데이트 반영)
  useEffect(() => {
    if (shareItem && shareCardRef.current) {
        setTimeout(async () => {
            try {
                setToastMessage("포스터 이미지 발급 중... 🎨");
                const canvas = await html2canvas(shareCardRef.current, { backgroundColor: null, scale: 2, logging: false, useCORS: true, allowTaint: true });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], 'unframe-achievement.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) { 
                  await navigator.share({ files: [file], title: 'UNFRAME Project', text: `UNFRAME에서 나의 기록을 확인해보세요.` }); 
                } else { 
                  const link = document.createElement('a'); link.download = 'unframe-share.png'; link.href = canvas.toDataURL(); link.click(); 
                  setToastMessage("이미지가 갤러리에 저장되었습니다 📸"); 
                }
            } catch (err) { setAuthError("이미지 생성 실패"); } finally { setShareItem(null); }
        }, 800);
    }
  }, [shareItem]);

  const playTrack = async (idx, queue = null) => { 
    const audio = audioRef.current; if (!audio) return;
    const activeQueue = queue || currentQueue;
    const targetIdx = idx !== undefined ? idx : currentTrackIdx;
    const targetTrack = activeQueue[targetIdx]; 
    if (!targetTrack) return;
    const directUrl = getDirectLink(targetTrack.audioUrl);
    if (audio.src !== directUrl) { audio.src = directUrl; audio.load(); }
    if (idx !== undefined) setCurrentTrackIdx(idx);
    setIsPlaying(true); 
    try { await audio.play(); updateMediaSession(targetTrack, activeQueue, targetIdx); } catch (e) { setIsPlaying(false); } 
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <Router>
      <ScrollToTop />
      <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''}`}>
        <audio ref={audioRef} muted={isMuted} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onEnded={() => playTrack((currentTrackIdx + 1) % currentQueue.length)} onWaiting={() => setIsBuffering(true)} onPlaying={() => setIsBuffering(false)} onPlay={() => { if(user) updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { listenCount: increment(1) }); }} playsInline />
        
        {/* Header Section */}
        <header className={`fixed top-0 w-full z-100 transition-all duration-500 ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/5' : 'py-6 lg:py-10'}`}>
          <div className="container mx-auto px-6 lg:px-8 flex justify-between items-end">
            <Link to="/" className="group cursor-pointer"><h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#004aad] transition-colors">Unframe<span className="text-[#004aad]">.</span></h1></Link>
            <nav className="flex items-center gap-4 lg:gap-10">
              <Link to="/about" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad]">About</Link>
              <Link to="/" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad]">Exhibit</Link>
              <Link to="/archive" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad]">Archive</Link>
            </nav>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home tracks={publicTracks} playlists={playlists} isPlaying={isPlaying} playTrack={playTrack} userLikes={userLikes} handleToggleLike={handleToggleLike} setSelectedTrack={setSelectedTrack} db={db} siteConfig={siteConfig} rankingTheme={rankingTheme} allUsers={allUsers} />} />
            <Route path="/archive" element={<Archive user={user} userProfile={userProfile} membership={membership} userLikes={userLikes} tracks={tracks} handleShare={handleShare} signOut={() => signOut(auth)} setSelectedTrack={setSelectedTrack} db={db} appId={appId} handleGoogleLogin={handleGoogleLogin} rankingTheme={rankingTheme} allUsers={allUsers} />} />
            <Route path="/about" element={<About siteConfig={siteConfig} />} />
            <Route path="/admin" element={<Admin isAdmin={isAdmin} user={user} signInWithPopup={() => signInWithPopup(auth, new GoogleAuthProvider())} tracks={tracks} playlists={playlists} db={db} appId={appId} setToastMessage={setToastMessage} setAuthError={setAuthError} />} />
          </Routes>
        </AnimatePresence>

        <AudioPlayer currentTrack={currentTrack} isPlayerExpanded={isPlayerExpanded} setIsPlayerExpanded={setIsPlayerExpanded} isPlaying={isPlaying} progressPct={duration ? (currentTime / duration) * 100 : 0} volume={volume} isMuted={isMuted} setIsMuted={setIsMuted} setVolume={setVolume} handleShare={handleShare} handleToggleLike={handleToggleLike} userLikes={userLikes} togglePlay={(e) => { if(e) e.stopPropagation(); isPlaying ? (setIsPlaying(false), audioRef.current?.pause()) : playTrack(); }} playTrack={playTrack} currentTrackIdx={currentTrackIdx} publicTracks={currentQueue} isBuffering={isBuffering} playerView={playerView} setPlayerView={setPlayerView} parsedLyrics={parsedLyrics} setParsedLyrics={setParsedLyrics} duration={duration} currentTime={currentTime} audioRef={audioRef} formatTime={formatTime} loopMode={loopMode} toggleLoop={() => setLoopMode(p => (p+1)%3)} isShuffle={isShuffle} toggleShuffle={() => setIsShuffle(!isShuffle)} />

        {/* 🚀 [NEW] Poster Style Share Card 영역 (재우님 디자인 커스텀) */}
        {shareItem && (
            <div ref={shareCardRef} style={{
                position: 'fixed', left: '-9999px', top: 0,
                width: '600px', height: '850px',
                backgroundColor: '#fdfbf7', // 배경색: 크림톤 (Off-White)
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                overflow: 'hidden', fontFamily: 'sans-serif'
            }}>
                {/* 상단 텍스트 프레임 */}
                <h1 style={{
                    fontSize: '130px', fontWeight: 900, fontStyle: 'italic',
                    textTransform: 'uppercase', letterSpacing: '-0.08em',
                    lineHeight: 0.8, color: '#000000', margin: 0,
                    textAlign: 'center', paddingTop: '20px', zIndex: 2
                }}>
                    Unframe
                </h1>

                {/* 중앙 다이나믹 컬러 박스 */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '85%', height: '60%',
                    backgroundColor: shareItem.color || '#ef4444', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}>
                    {/* 좌측 라벨 */}
                    <p style={{
                        position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
                        fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', opacity: 0.8, margin: 0, whiteSpace: 'nowrap'
                    }}>
                        ACHIEVEMENT CARD
                    </p>

                    {/* 우측 하단 날짜 (재우님 제안 스타일) */}
                    <p style={{
                        position: 'absolute', right: '25px', bottom: '25px',
                        fontSize: '14px', fontWeight: 800, opacity: 0.9, margin: 0
                    }}>
                        {getFormattedDate()}
                    </p>

                    {/* 메인 콘텐츠 */}
                    <div style={{ textAlign: 'center', marginTop: '-40px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '30px' }}>
                            {shareItem.title}
                        </h2>

                        {/* 3D 에셋 효과를 위한 아이콘 렌더링 */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px',
                            filter: `drop-shadow(0 15px 25px rgba(0,0,0,0.3)) drop-shadow(0 5px 10px ${shareItem.color})`,
                            transform: 'perspective(500px) rotateX(10deg) rotateY(-10deg)'
                        }}>
                            {shareItem.type === 'reward' ? (
                                React.createElement(shareItem.icon, { size: 140, color: '#ffffff', strokeWidth: 2, fill: 'rgba(255,255,255,0.2)' })
                            ) : shareItem.type === 'track' ? (
                                <div style={{ width: '220px', height: '220px', borderRadius: '30px', overflow: 'hidden', border: '10px solid white' }}>
                                  <img src={shareItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                                </div>
                            ) : (
                                <div style={{ fontSize: '80px', fontWeight: 900, fontStyle: 'italic' }}>
                                    #{allUsers.findIndex(u => u.id === user?.uid) + 1 || '?'}
                                </div>
                            )}
                        </div>

                        <p style={{ fontSize: '18px', fontWeight: 700, opacity: 0.9, letterSpacing: '-0.02em', margin: 0 }}>
                            {shareItem.desc}
                        </p>
                    </div>
                </div>

                {/* 하단 텍스트 프레임 */}
                <h1 style={{
                    fontSize: '130px', fontWeight: 900, fontStyle: 'italic',
                    textTransform: 'uppercase', letterSpacing: '-0.08em',
                    lineHeight: 0.8, color: '#000000', margin: 0,
                    textAlign: 'center', paddingBottom: '20px', zIndex: 2
                }}>
                    Playlist
                </h1>
            </div>
        )}

        {/* Footer Section */}
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
                  <li><Link to="/admin">Console / Admin</Link></li>
                  <li><Link to="/about">Project Info</Link></li>
                </ul>
              </div>
              <div className="space-y-4 lg:space-y-8">
                <p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> CONNECT</p>
                <div className="flex gap-4"><a href="https://unframe.kr" target="_blank" className="text-xs font-black uppercase">Web</a><a href="https://instagram.com" target="_blank" className="text-xs font-black uppercase">Insta</a></div>
              </div>
            </div>
        </footer>

        {/* Toast Notification */}
        <AnimatePresence>{toastMessage && (<motion.div onClick={() => setToastMessage(null)} initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed bottom-32 lg:bottom-40 left-1/2 z-1000 bg-[#004aad] text-white px-8 py-4 rounded-full font-black uppercase text-[10px] shadow-2xl flex items-center gap-2 cursor-pointer"><CheckCircle2 className="w-3 h-3" /> {toastMessage}</motion.div>)}</AnimatePresence>
        
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </Router>
  );
}