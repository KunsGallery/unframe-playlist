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
  Loader2, Music, Heart, Share2, Zap, Trophy, Medal, Calendar, Star, Moon, Coffee, Ghost, HelpCircle, CheckCircle2, AlertCircle, X, Smartphone, Sparkles, Archive as ArchiveIcon, Play, Waves, ListMusic, Target, Headphones, User, Disc
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import About from './pages/About';
import ScrollToTop from './components/ScrollToTop';

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

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";

const STICKER_LIBRARY = {
  first_sound: { title: "첫 소리", desc: "아티팩트를 처음 활성화함", icon: Music, color: "#60a5fa" },
  first_heart: { title: "첫 하트", desc: "당신의 취향을 기록하기 시작함", icon: Heart, color: "#f87171" },
  first_signal: { title: "첫 신호", desc: "소리의 파동을 외부로 전달함", icon: Share2, color: "#34d399" },
  moment_10: { title: "10번의 순간", desc: "10곡의 소리를 깊게 감상함", icon: Zap, color: "#fbbf24" },
  moment_100: { title: "심오한 감상자", desc: "100곡 이상의 소리를 기록함", icon: Trophy, color: "#a78bfa" },
  heart_50: { title: "취향 컬렉터", desc: "50개 이상의 아티팩트를 수집함", icon: Medal, color: "#f472b6" },
  signal_10: { title: "신호의 대가", desc: "10회 이상 소리를 공유함", icon: Waves, color: "#22d3ee" },
  loyal_30: { title: "단골 거주자", desc: "30일 동안 공간에 머무름", icon: Calendar, color: "#fb923c" },
  family_100: { title: "공간의 역사", desc: "100일 넘게 함께한 멤버", icon: Star, color: "#fef08a" },
  night_owl: { title: "심야의 동반자", desc: "새벽 2시, 소리에 귀 기울임", icon: Moon, color: "#818cf8" },
  early_bird: { title: "얼리 버드", desc: "아침의 시작을 소리와 함께함", icon: Coffee, color: "#f59e0b" },
  archive_master: { title: "완벽한 아카이브", desc: "전시된 모든 곡을 수집함", icon: Ghost, color: "#f4f4f5" }
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
  const [copiedId, setCopiedId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [newReward, setNewReward] = useState(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [playerView, setPlayerView] = useState('cover');
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [rankingTheme, setRankingTheme] = useState({ id: 'night_owl', title: '심야의 감상자', desc: '새벽 0시-4시, 정적 속에 머문 이들', icon: Moon });

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
    if (days >= 30) return { name: "Regular", color: "#004aad", bg: "rgba(0, 74, 173, 0.1)", icon: Sparkles };
    if (days >= 7) return { name: "Friend", color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)", icon: Coffee };
    return { name: "Hello", color: "#71717a", bg: "rgba(255, 255, 255, 0.05)", icon: Ghost };
  }, [userProfile?.firstJoin]);

  const formatTime = useCallback((time) => { if (isNaN(time)) return "0:00"; const min = Math.floor(time / 60); const sec = Math.floor(time % 60); return `${min}:${String(sec).padStart(2, '0')}`; }, []);

  // 🚀 [핵심 수정] Media Session 업데이트 로직 - 특정 트랙을 인자로 받아 즉시 업데이트
  const updateMediaSession = useCallback((track) => {
    if (!track) return;
    if ('mediaSession' in navigator) {
        const artUrl = track.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17';
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: 'UNFRAME PLAYLIST',
            artwork: [
                { src: artUrl, sizes: '96x96',   type: 'image/jpeg' },
                { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
                { src: artUrl, sizes: '192x192', type: 'image/jpeg' },
                { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
                { src: artUrl, sizes: '384x384', type: 'image/jpeg' },
                { src: artUrl, sizes: '512x512', type: 'image/jpeg' },
            ]
        });

        // 핸들러 재등록 (클로저 문제 방지)
        navigator.mediaSession.setActionHandler('play', () => { setIsPlaying(true); audioRef.current?.play(); });
        navigator.mediaSession.setActionHandler('pause', () => { setIsPlaying(false); audioRef.current?.pause(); });
        // 'previoustrack', 'nexttrack'은 playTrack 함수 내부에서 큐 제어를 하므로 생략하거나 아래처럼 연결
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => { try { if (!auth.currentUser) await signInAnonymously(auth); } catch (err) { console.error(err); } };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { if (isMounted) { setUser(u); const adminCheck = !!(u && u.email && ADMIN_EMAILS.includes(u.email.toLowerCase())); setIsAdmin(adminCheck); if (u) setLoading(false); } });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    const themes = [
        { id: 'night_owl', title: '심야의 감상자', desc: '새벽 0시-4시, 정적 속에 머문 이들', icon: Moon },
        { id: 'quiet_observer', title: '조용한 탐험가', desc: '흔적 없이 소리만 깊게 파고든 이들', icon: Headphones },
        { id: 'signal_herald', title: '신호의 전령사', desc: '아티팩트의 파동을 널리 퍼뜨린 이들', icon: Share2 }
    ];
    setRankingTheme(themes[Math.floor(Math.random() * themes.length)]);
    return () => { isMounted = false; unsubscribe(); window.removeEventListener('scroll', handleScroll); };
  }, []);

  useEffect(() => {
    const fetchConfig = async () => { try { const configSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts')); if (configSnap.exists()) setSiteConfig(configSnap.data()); } catch(e) {} };
    fetchConfig();
    if (!user) return;
    const unsubAllUsers = onSnapshot(collection(db, 'artifacts', appId, 'public_stats'), (snap) => {
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(users.sort((a, b) => (b.listenCount || 0) - (a.listenCount || 0)));
    });
    const unsubTracks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tracks')), (snap) => { 
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTracks(loaded); if (currentQueue.length === 0) setCurrentQueue(loaded.filter(t => !t.isHidden));
    });
    const unsubPlaylists = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'playlists')), (snap) => { setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubLikes = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'), (snap) => setUserLikes(snap.docs.map(d => d.id)));
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) { 
          const data = snap.data(); setUserProfile(data);
          await setDoc(doc(db, 'artifacts', appId, 'public_stats', user.uid), { displayName: user.displayName || 'Anonymous', listenCount: data.listenCount || 0, profileImg: data.profileImg || '', membership: membership.name }, { merge: true });
      } else { await setDoc(profileRef, { listenCount: 0, shareCount: 0, firstJoin: Date.now(), rewards: [], profileImg: '', hasSeenGuide: false }); }
    });
    return () => { unsubTracks(); unsubPlaylists(); unsubLikes(); unsubProfile(); unsubAllUsers(); };
  }, [user, membership.name]);

  useEffect(() => { if (toastMessage) { const timer = setTimeout(() => setToastMessage(null), 6000); return () => clearTimeout(timer); } }, [toastMessage]);

  const handleToggleLike = async (e, trackId) => { if (e) e.stopPropagation(); if (!user) return; const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId); if (userLikes.includes(trackId)) { await deleteDoc(likeDoc); } else { await setDoc(likeDoc, { likedAt: Date.now() }); setToastMessage("아카이브에 기록되었습니다 💗"); } };
  const handleShare = async (e, item, type = 'track') => { if (e) e.stopPropagation(); if (user && type === 'track') updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { shareCount: increment(1) }); setShareItem({ ...item, type }); };

  useEffect(() => {
    if (shareItem && shareCardRef.current) {
        setTimeout(async () => {
            try {
                setToastMessage("이미지 발급 중... 🎨");
                const canvas = await html2canvas(shareCardRef.current, { backgroundColor: null, scale: 2, logging: false, useCORS: true, allowTaint: true });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], 'unframe-share.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Unframe Project', text: `UNFRAME에서 나의 기록을 확인해보세요.` }); } 
                else { const link = document.createElement('a'); link.download = 'unframe-share.png'; link.href = canvas.toDataURL(); link.click(); setToastMessage("이미지가 저장되었습니다 📸"); }
            } catch (err) { setAuthError("이미지 생성 실패"); } finally { setShareItem(null); }
        }, 600);
    }
  }, [shareItem]);

  // 🚀 [수정됨] playTrack에서 즉각적으로 MediaSession 정보를 쏩니다.
  const playTrack = async (idx, queue = null) => { 
    const audio = audioRef.current; if (!audio) return;
    
    // 큐 교체 작업
    const activeQueue = queue || currentQueue;
    if (queue) setCurrentQueue(queue);
    
    const targetIdx = idx !== undefined ? idx : currentTrackIdx;
    const targetTrack = activeQueue[targetIdx]; 
    if (!targetTrack) return;

    const directUrl = getDirectLink(targetTrack.audioUrl);
    
    // 1. 오디오 소스 설정 및 재생
    if (audio.src !== directUrl) { audio.src = directUrl; audio.load(); }
    if (idx !== undefined) setCurrentTrackIdx(idx);
    
    setIsPlaying(true); 
    try { 
        await audio.play(); 
        // 🚀 [핵심] 오디오 재생 직후, '현재 재생할 곡 정보'를 즉시 MediaSession에 전달!
        updateMediaSession(targetTrack);
    } catch (e) { setIsPlaying(false); } 
  };

  // 🚀 [수정됨] 곡이 자동으로 넘어갈 때도 정보를 갱신하도록 useEffect 보강
  useEffect(() => {
    if (currentTrack) {
        updateMediaSession(currentTrack);
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
        }
    }
  }, [currentTrack?.id, isPlaying, updateMediaSession]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <Router>
      <ScrollToTop />
      <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''}`}>
        {/* onPlay에서도 메타데이터 업데이트 호출 */}
        <audio ref={audioRef} muted={isMuted} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onEnded={() => playTrack((currentTrackIdx + 1) % currentQueue.length)} onWaiting={() => setIsBuffering(true)} onPlaying={() => setIsBuffering(false)} onPlay={() => { if(user) updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { listenCount: increment(1) }); updateMediaSession(currentTrack); }} playsInline />
        
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

        {/* Share Card Design (Hidden) */}
        {shareItem && (
            <div ref={shareCardRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: '400px', height: '700px', backgroundColor: '#09090b', border: '12px solid #18181b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px', textAlign: 'center', fontFamily: 'sans-serif', color: '#ffffff' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,74,173,0.15), rgba(147,51,234,0.05))', zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '40px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.05em', margin: 0, color: '#ffffff' }}>Unframe.</h1>
                    <div style={{ width: '280px', height: '280px', borderRadius: '40px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#18181b', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shareItem.type === 'track' ? (<img src={shareItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />) : shareItem.type === 'reward' ? (React.createElement(shareItem.icon, { size: 100, color: shareItem.color || '#004aad', strokeWidth: 1.5 })) : (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{React.createElement(rankingTheme.icon, { size: 80, color: '#004aad', strokeWidth: 1.5, style: { marginBottom: '10px' } })}<span style={{ fontSize: '80px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.05em' }}>#{allUsers.findIndex(u => u.id === user?.uid) + 1 || '?'}</span></div>)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 800, color: '#004aad', textTransform: 'uppercase', letterSpacing: '0.3em', margin: 0 }}>{shareItem.type === 'track' ? 'Sound Artifact' : shareItem.type === 'reward' ? 'Sticker Unlocked' : 'User Ranking'}</p>
                        <h2 style={{ fontSize: '26px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>{shareItem.type === 'tier' ? rankingTheme.title : shareItem.title}</h2>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', margin: 0 }}>{shareItem.type === 'track' ? shareItem.artist : shareItem.type === 'reward' ? shareItem.desc : `${user?.displayName || '감상자'}님의 기록`}</p>
                    </div>
                </div>
                <div style={{ position: 'relative', zIndex: 10, width: '100%', paddingTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#27272a', overflow: 'hidden' }}>{userProfile.profileImg ? <img src={userProfile.profileImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" /> : <div style={{ padding: '6px' }}><User size={20} color="#52525b" /></div>}</div>
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>{user?.displayName || 'Member'}</span>
                    </div>
                    <p style={{ fontSize: '9px', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.4em', margin: 0 }}>unframe-playlist.web.app</p>
                </div>
            </div>
        )}

        {/* Footer 복구 */}
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

        <AnimatePresence>{toastMessage && (<motion.div onClick={() => setToastMessage(null)} initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed bottom-32 lg:bottom-40 left-1/2 z-[1000] bg-[#004aad] text-white px-6 lg:px-8 py-3 lg:py-4 rounded-full font-black uppercase text-[10px] shadow-2xl flex items-center gap-2 transition-transform cursor-pointer"><CheckCircle2 className="w-3 h-3" /> {toastMessage}</motion.div>)}</AnimatePresence>
        <style>{`
          .italic-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.1); color: transparent; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes wave { 0%, 100% { height: 4px; } 50% { height: 12px; } }
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
          .animate-marquee { display: inline-block; padding-left: 100%; animation: marquee 15s linear infinite; }
          .marquee-container { width: 100%; overflow: hidden; white-space: nowrap; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          input[type=range]::-webkit-slider-thumb { appearance: none; height: 16px; width: 16px; border-radius: 50%; background: white; box-shadow: 0 0 15px rgba(0,74,173,1); cursor: pointer; }
          .pt-safe-top { padding-top: env(safe-area-inset-top, 20px); }
        `}</style>
      </div>
    </Router>
  );
}