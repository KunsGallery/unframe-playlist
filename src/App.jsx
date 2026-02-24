// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import html2canvas from 'html2canvas'; 
import { 
  getAuth, onAuthStateChanged, signInAnonymously, signOut, signInWithPopup, GoogleAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, collection, onSnapshot, query, updateDoc, increment, deleteDoc, getDoc
} from 'firebase/firestore';
import { 
  Loader2, Music, Heart, Share2, Zap, Trophy, Medal, Calendar, Star, Moon, Coffee, Ghost, HelpCircle, CheckCircle2, AlertCircle, X, Smartphone, Sparkles, Archive as ArchiveIcon, Play, Waves, ListMusic 
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
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

// 디자인 상수
const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";

const STICKER_LIBRARY = {
  first_sound: { title: "첫 소리", desc: "아티팩트를 처음 활성화함", icon: Music, color: "text-blue-400" },
  first_heart: { title: "첫 하트", desc: "당신의 취향을 기록하기 시작함", icon: Heart, color: "text-red-400" },
  first_signal: { title: "첫 신호", desc: "소리의 파동을 외부로 전달함", icon: Share2, color: "text-green-400" },
  moment_10: { title: "10번의 순간", desc: "10곡의 소리를 깊게 감상함", icon: Zap, color: "text-yellow-400" },
  moment_100: { title: "심오한 감상자", desc: "100곡 이상의 소리를 기록함", icon: Trophy, color: "text-purple-400" },
  heart_50: { title: "취향 컬렉터", desc: "50개 이상의 아티팩트를 수집함", icon: Medal, color: "text-pink-400" },
  signal_10: { title: "신호의 대가", desc: "10회 이상 소리를 공유함", icon: Waves, color: "text-cyan-400" },
  loyal_30: { title: "단골 거주자", desc: "30일 동안 공간에 머무름", icon: Calendar, color: "text-orange-400" },
  family_100: { title: "공간의 역사", desc: "100일 넘게 함께한 멤버", icon: Star, color: "text-yellow-200" },
  night_owl: { title: "심야의 동반자", desc: "새벽 2시, 소리에 귀 기울임", icon: Moon, color: "text-indigo-400" },
  early_bird: { title: "얼리 버드", desc: "아침의 시작을 소리와 함께함", icon: Coffee, color: "text-amber-500" },
  archive_master: { title: "완벽한 아카이브", desc: "전시된 모든 곡을 수집함", icon: Ghost, color: "text-zinc-100" }
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState(0); 
  const [isShuffle, setIsShuffle] = useState(false);
  
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [newReward, setNewReward] = useState(null);
  
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [playerView, setPlayerView] = useState('cover');
  const [showLyrics, setShowLyrics] = useState(false);

  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [siteConfig, setSiteConfig] = useState(null);
  
  // 공유용 상태
  const [shareItem, setShareItem] = useState(null);
  const shareCardRef = useRef(null);

  const audioRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);
  const currentTrack = publicTracks.length > 0 ? publicTracks[currentTrackIdx] : null;

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { setAuthError("로그인 실패: " + error.message); } };

  const membership = useMemo(() => {
    const days = Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000);
    if (days >= 100) return { name: "Family", color: "text-purple-400", bg: "bg-purple-400/10", icon: Moon };
    if (days >= 30) return { name: "Regular", color: "text-[#004aad]", bg: "bg-[#004aad]/10", icon: Sun };
    if (days >= 7) return { name: "Friend", color: "text-green-400", bg: "bg-green-400/10", icon: Sparkles };
    return { name: "Hello", color: "text-zinc-500", bg: "bg-white/5", icon: Ghost };
  }, [userProfile?.firstJoin]);

  const formatTime = useCallback((time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => { try { if (!auth.currentUser) await signInAnonymously(auth); } catch (err) { console.error(err); } };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) { setUser(u); const adminCheck = !!(u && u.email && ADMIN_EMAILS.includes(u.email.toLowerCase())); setIsAdmin(adminCheck); if (u) setLoading(false); }
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => { isMounted = false; unsubscribe(); window.removeEventListener('scroll', handleScroll); };
  }, []);

  useEffect(() => {
    const fetchConfig = async () => { try { const configSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts')); if (configSnap.exists()) setSiteConfig(configSnap.data()); } catch(e) {} };
    fetchConfig();
    if (!user) return;
    const unsubTracks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tracks')), (snap) => { setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))); });
    const unsubLikes = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'), (snap) => setUserLikes(snap.docs.map(d => d.id)));
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) { const data = snap.data(); const prevRewards = data.rewards || []; const checkList = []; if (data.listenCount > 0) checkList.push('first_sound'); if (userLikes.length > 0) checkList.push('first_heart'); if (data.shareCount > 0) checkList.push('first_signal'); if (data.listenCount >= 10) checkList.push('moment_10'); const newlyUnlocked = checkList.find(r => !prevRewards.includes(r)); if (newlyUnlocked && STICKER_LIBRARY[newlyUnlocked]) { setNewReward({ id: newlyUnlocked, ...STICKER_LIBRARY[newlyUnlocked] }); await updateDoc(profileRef, { rewards: [...prevRewards, newlyUnlocked] }); } setUserProfile(data); if (data.hasSeenGuide === false) setShowGuide(true); } else { await setDoc(profileRef, { listenCount: 0, shareCount: 0, firstJoin: Date.now(), rewards: [], profileImg: '', hasSeenGuide: false }); setUserProfile({ listenCount: 0, shareCount: 0, firstJoin: Date.now(), rewards: [], profileImg: '', hasSeenGuide: false }); setShowGuide(true); }
    });
    return () => { unsubTracks(); unsubLikes(); unsubProfile(); };
  }, [user]);

  useEffect(() => { if (toastMessage) { const timer = setTimeout(() => setToastMessage(null), 6000); return () => clearTimeout(timer); } }, [toastMessage]);

  const handleToggleLike = async (e, trackId) => { if (e) e.stopPropagation(); if (!user) return; const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId); if (userLikes.includes(trackId)) { await deleteDoc(likeDoc); } else { await setDoc(likeDoc, { likedAt: Date.now() }); setToastMessage("아카이브에 기록되었습니다 💗"); } };
  
  const handleShare = async (e, item, type = 'track') => {
    if (e) e.stopPropagation();
    if (user && type === 'track') updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { shareCount: increment(1) });
    setShareItem({ ...item, type });
  };

  // 🚀 [수정됨] html2canvas 오류 해결을 위해 순수 CSS 스타일과 raw SVG 사용
  useEffect(() => {
    if (shareItem && shareCardRef.current) {
        setTimeout(async () => {
            try {
                setToastMessage("이미지 생성 중... 🎨");
                const canvas = await html2canvas(shareCardRef.current, {
                    backgroundColor: null,
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                });

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const file = new File([blob], 'unframe-share.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Unframe Project',
                        text: `Check out ${shareItem.title} on Unframe.`
                    });
                } else {
                    const link = document.createElement('a');
                    link.download = 'unframe-share.png';
                    link.href = canvas.toDataURL();
                    link.click();
                    setToastMessage("이미지가 저장되었습니다 📸");
                }
            } catch (err) {
                console.error(err);
                setAuthError("이미지 생성 실패");
            } finally {
                setShareItem(null);
            }
        }, 500);
    }
  }, [shareItem]);

  const playNextTrack = (auto = false) => {
    let nextIdx = currentTrackIdx;
    if (loopMode === 2 && auto) { 
    } else if (isShuffle) { 
        const randomIdx = Math.floor(Math.random() * publicTracks.length);
        nextIdx = randomIdx === currentTrackIdx ? (randomIdx + 1) % publicTracks.length : randomIdx;
    } else { 
        nextIdx = (currentTrackIdx + 1) % publicTracks.length;
    }
    if (loopMode === 0 && auto && currentTrackIdx === publicTracks.length - 1 && !isShuffle) {
        setIsPlaying(false);
        return;
    }
    playTrack(nextIdx);
  };

  const playTrack = async (idx) => { const audio = audioRef.current; if (!audio) return; const targetIdx = idx !== undefined ? idx : currentTrackIdx; const targetTrack = publicTracks[targetIdx]; if (!targetTrack) return; const directUrl = getDirectLink(targetTrack.audioUrl); if (audio.src !== directUrl) { audio.src = directUrl; audio.load(); } if (idx !== undefined) setCurrentTrackIdx(idx); setIsPlaying(true); try { await audio.play(); } catch (e) { setIsPlaying(false); } };
  const pauseTrack = () => { setIsPlaying(false); audioRef.current?.pause(); if('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused"; };
  const togglePlay = (e) => { if(e) e.stopPropagation(); isPlaying ? pauseTrack() : playTrack(); };
  const closeGuide = async () => { setShowGuide(false); if (user) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { hasSeenGuide: true }); };
  const handleTimeUpdate = (e) => { const cTime = e.currentTarget.currentTime; setCurrentTime(cTime); if (audioRef.current && audioRef.current.volume !== volume) { audioRef.current.volume = volume; } };
  const toggleLoop = () => setLoopMode(prev => (prev + 1) % 3);
  const toggleShuffle = () => setIsShuffle(prev => !prev);
  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <Router>
      <ScrollToTop />
      <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''}`}>
        <audio ref={audioRef} muted={isMuted} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onDurationChange={(e) => setDuration(e.currentTarget.duration)} onEnded={() => playNextTrack(true)} onWaiting={() => setIsBuffering(true)} onPlaying={() => { setIsBuffering(false); }} onPlay={() => { if(user) updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { listenCount: increment(1), lastActive: Date.now() }); }} playsInline />
        <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#004aad] z-110 origin-left" style={{ scaleX }} />

        <header className={`fixed top-0 w-full z-100 transition-all duration-500 ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/5' : 'py-6 lg:py-10'}`}>
          <div className="container mx-auto px-6 lg:px-8 flex justify-between items-end">
            <Link to="/" className="group cursor-pointer">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#004aad] transition-colors">Unframe<span className="text-[#004aad]">.</span></h1>
              <p className={subTitle + " text-[8px] lg:text-[10px] mt-1 hidden lg:block"}>Reactive Art Collective</p>
            </Link>
            <nav className="flex items-center gap-4 lg:gap-10">
              <Link to="/" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad] opacity-80 hover:opacity-100 transition-all">Exhibit</Link>
              <Link to="/archive" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:text-[#004aad] opacity-80 hover:opacity-100 transition-all">Archive</Link>
              <button onClick={() => setShowGuide(true)} className="p-2 text-zinc-600 hover:text-[#004aad] transition-all"><HelpCircle className="w-4 h-4 lg:w-5 lg:h-5" /></button>
              {isAdmin && <Link to="/admin" className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-[#004aad]">Console</Link>}
            </nav>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home tracks={publicTracks} isPlaying={isPlaying} currentTrackIdx={currentTrackIdx} playTrack={playTrack} pauseTrack={pauseTrack} userLikes={userLikes} handleToggleLike={handleToggleLike} handleShare={handleShare} isBuffering={isBuffering} setSelectedTrack={setSelectedTrack} db={db} siteConfig={siteConfig} />} />
            <Route path="/archive" element={<Archive user={user} userProfile={userProfile} membership={membership} userLikes={userLikes} tracks={tracks} handleShare={handleShare} signOut={() => signOut(auth)} setSelectedTrack={setSelectedTrack} db={db} appId={appId} handleGoogleLogin={handleGoogleLogin} />} />
            <Route path="/admin" element={<Admin isAdmin={isAdmin} user={user} signInWithPopup={() => signInWithPopup(auth, new GoogleAuthProvider())} tracks={tracks} db={db} appId={appId} setToastMessage={setToastMessage} setAuthError={setAuthError} />} />
          </Routes>
        </AnimatePresence>

        <AudioPlayer 
          currentTrack={currentTrack} isPlayerExpanded={isPlayerExpanded} setIsPlayerExpanded={setIsPlayerExpanded} 
          isPlaying={isPlaying} progressPct={progressPct} volume={volume} isMuted={isMuted} setIsMuted={setIsMuted} 
          setVolume={setVolume} handleShare={handleShare} handleToggleLike={handleToggleLike} userLikes={userLikes} 
          togglePlay={togglePlay} playTrack={playTrack} currentTrackIdx={currentTrackIdx} publicTracks={publicTracks} 
          isBuffering={isBuffering} showLyrics={showLyrics} setShowLyrics={setShowLyrics} parsedLyrics={parsedLyrics} 
          setParsedLyrics={setParsedLyrics} 
          duration={duration} currentTime={currentTime} audioRef={audioRef} formatTime={formatTime}
          loopMode={loopMode} toggleLoop={toggleLoop} isShuffle={isShuffle} toggleShuffle={toggleShuffle}
          playerView={playerView} setPlayerView={setPlayerView}
        />

        {/* 🚀 [NEW] 숨겨진 공유용 카드 디자인 (순수 CSS 스타일 & Raw SVG 적용) */}
        {shareItem && (
            <div ref={shareCardRef} 
                 style={{
                     position: 'fixed', left: '-9999px', top: 0,
                     width: '400px', height: '700px',
                     backgroundColor: '#09090b', // Zinc-950 hex
                     border: '8px solid #18181b', // Zinc-900 hex
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                     padding: '48px', textAlign: 'center',
                     fontFamily: 'sans-serif'
                 }}>
                {/* Background Gradient */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,74,173,0.2), rgba(147,51,234,0.1))', zIndex: 0 }} />
                
                {/* Content Container */}
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '32px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '-0.05em', margin: 0 }}>Unframe.</h1>
                    
                    {/* Image Container */}
                    <div style={{ width: '256px', height: '256px', borderRadius: '32px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', backgroundColor: '#18181b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shareItem.type === 'track' ? (
                            <img src={shareItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />
                        ) : (
                            // Trophy SVG with explicit style (Raw SVG)
                            <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#004aad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#004aad' }}>
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                            </svg>
                        )}
                    </div>
                    
                    {/* Text Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0 }}>{shareItem.title}</h2>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#004aad', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{shareItem.artist || shareItem.desc}</p>
                    </div>
                </div>
                
                {/* Footer */}
                <div style={{ position: 'relative', zIndex: 10, width: '100%', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5em', margin: 0 }}>Reactive Art Collective</p>
                </div>
            </div>
        )}

        <AnimatePresence>{newReward && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setNewReward(null)}><motion.div initial={{ scale: 0.8, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 100 }} className={`${glass} w-full max-w-md rounded-[3rem] lg:rounded-[5rem] p-8 lg:p-12 text-center space-y-8 lg:space-y-12 border-white/20 shadow-[0_0_100px_#004aad]/40`} onClick={e => e.stopPropagation()}><div className="space-y-4"><Star className="w-12 h-12 lg:w-16 lg:h-16 text-yellow-400 mx-auto animate-bounce" /><h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-[#004aad]">New Sticker!</h2><p className="text-[10px] lg:text-sm text-zinc-500 font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em]">축하합니다! 새로운 기록이 해제되었습니다.</p></div><div className="bg-zinc-950 p-6 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-white/5 space-y-4 lg:space-y-6 relative"><div className="w-16 h-16 lg:w-24 lg:h-24 bg-white/5 rounded-2xl lg:rounded-3xl mx-auto flex items-center justify-center border border-white/10"><newReward.icon className="w-8 h-8 lg:w-12 lg:h-12 text-[#004aad]" /></div><div className="space-y-1 lg:space-y-2"><h4 className="text-xl lg:text-2xl font-black uppercase tracking-tighter text-white">[{newReward.title}]</h4><p className="text-white mt-1 font-bold leading-relaxed lowercase text-sm">{newReward.desc}</p></div></div><div className="flex flex-col gap-3 lg:gap-4"><button onClick={(e) => handleShare(e, newReward, 'reward')} className="w-full py-4 lg:py-6 bg-white text-black rounded-2xl lg:rounded-3xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-[#004aad] hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3">{copiedId === 'reward' ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} SNS 공유하기</button><button onClick={() => setNewReward(null)} className="text-[9px] lg:text-[10px] font-black uppercase text-zinc-500">나중에 하기</button></div></motion.div></motion.div>)}</AnimatePresence>

        <AnimatePresence>
          {showGuide && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-4 lg:p-6 backdrop-blur-2xl" onClick={closeGuide}>
              <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }} className={`${glass} w-full max-w-4xl rounded-[2.5rem] lg:rounded-[4rem] flex flex-col relative overflow-hidden shadow-indigo-500/20 shadow-2xl max-h-[85vh]`} onClick={e => e.stopPropagation()}>
                <button onClick={closeGuide} className="absolute top-6 right-6 lg:top-8 lg:right-8 p-3 lg:p-4 rounded-full bg-white/5 hover:bg-[#004aad] text-white transition-all z-[600]"><X className="w-4 h-4 lg:w-5 lg:h-5" /></button>
                <div className="flex-1 overflow-y-auto p-8 lg:p-20 space-y-8 lg:space-y-12">
                  <div className="space-y-3 lg:space-y-4"><h2 className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter text-[#004aad]">System Guide</h2><p className="text-[9px] lg:text-sm text-zinc-500 font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em]">Unframe: 당신을 위한 공간 이용법</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                    {[ 
                        { icon: Ghost, title: "Relationship", desc: siteConfig?.guide_1 || "머무른 시간이 쌓일수록 Hello에서 Family까지 우리의 관계는 깊어집니다." }, 
                        { icon: ArchiveIcon, title: "Sticker Book", desc: siteConfig?.guide_2 || "첫 소리, 첫 하트, 첫 신호... 소중한 순간들을 스티커로 기록해 보세요." }, 
                        { icon: Sparkles, title: "Daily Play", desc: siteConfig?.guide_3 || "하루 한 번, 소소한 놀이를 통해 Unframe의 세계관을 함께 완성합니다." }, 
                        { icon: Smartphone, title: "Install App", desc: siteConfig?.guide_4 || "Safari/Chrome 메뉴에서 [홈 화면에 추가]를 눌러 앱처럼 감상하세요." } 
                    ].map((item, i) => (
                      <div key={i} className="space-y-3 lg:space-y-4 p-6 lg:p-8 bg-white/5 rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 hover:border-[#004aad]/30 transition-all flex flex-col items-center text-center">
                          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#004aad]/10 rounded-xl lg:rounded-2xl flex items-center justify-center"><item.icon className="w-5 h-5 lg:w-6 lg:h-6 text-[#004aad]" /></div>
                          <h4 className="text-base lg:text-lg font-black uppercase tracking-tight">{item.title}</h4>
                          <p className="text-[10px] lg:text-xs text-white/70 font-bold leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-6 lg:pt-8 border-t border-white/5 text-center"><button onClick={closeGuide} className="bg-white text-black px-12 lg:px-16 py-4 lg:py-6 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-[#004aad] hover:text-white transition-all shadow-2xl shadow-indigo-500/30">가이드 종료</button></div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{toastMessage && (<motion.div onClick={() => setToastMessage(null)} initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed bottom-32 lg:bottom-40 left-1/2 z-[1000] bg-[#004aad] text-white px-6 lg:px-8 py-3 lg:py-4 rounded-full font-black uppercase text-[10px] lg:text-[11px] shadow-2xl flex items-center gap-2 lg:gap-3 shadow-indigo-500/20 cursor-pointer hover:scale-105 transition-transform"><CheckCircle2 className="w-3 h-3 lg:w-4 lg:h-4" /> {toastMessage}</motion.div>)}</AnimatePresence>
        <AnimatePresence>{authError && (<motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed top-20 lg:top-24 left-1/2 z-[1000] bg-red-600 px-6 lg:px-8 py-4 lg:py-5 rounded-2xl lg:rounded-3xl font-black uppercase text-[10px] lg:text-[11px] flex items-center gap-3 lg:gap-4 shadow-2xl shadow-red-500/20"><AlertCircle className="w-4 h-4" /> {authError} <button onClick={() => setAuthError(null)} className="ml-4 lg:ml-6 opacity-60">X</button></motion.div>)}</AnimatePresence>
        <footer className="py-24 lg:py-40 bg-[#fdfbf7] text-black border-t border-zinc-200 px-6 lg:px-8 relative z-30"><div className="container mx-auto grid lg:grid-cols-4 gap-12 lg:gap-10 opacity-80"><div className="space-y-6 lg:space-y-10"><h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-[#004aad]">Unframe<span className="text-black">.</span></h1><p className="text-[9px] lg:text-[11px] font-black uppercase leading-loose text-zinc-400">© 2026 UNFRAME ART COLLECTIVE.</p></div><div className="space-y-4 lg:space-y-8"><p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> VISIT US</p><ul className="text-xs lg:text-sm font-bold opacity-60"><li>서울특별시 종로구 인사동4길 17, 108호</li></ul></div><div className="space-y-4 lg:space-y-8"><p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> SYSTEM</p><ul className="text-xs lg:text-sm font-bold opacity-80 underline"><li><Link to="/admin" className="cursor-pointer hover:text-[#004aad] transition-colors">Console</Link></li></ul></div></div></footer>
        <style>{`.italic-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.1); color: transparent; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes wave { 0%, 100% { height: 4px; } 50% { height: 12px; } } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } input[type=range]::-webkit-slider-thumb { appearance: none; height: 16px; width: 16px; border-radius: 50%; background: white; box-shadow: 0 0 15px rgba(0,74,173,1); cursor: pointer; } .pt-safe-top { padding-top: env(safe-area-inset-top, 20px); }`}</style>
      </div>
    </Router>
  );
}