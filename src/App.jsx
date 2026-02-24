// src/App.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, signInAnonymously, signOut, signInWithPopup, GoogleAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, collection, onSnapshot, addDoc, deleteDoc, query, updateDoc, increment
} from 'firebase/firestore';
import { 
  Play, Pause, SkipBack, SkipForward, Trash2, AlertCircle, Loader2, Music, X, Heart, Award, User, Share2,
  Volume2, VolumeX, ImageIcon, Upload, ArrowDown, ChevronRight, Disc, Eye, Archive, Check, Trophy, Calendar, TrendingUp, Medal, Zap, Clock, Sparkles, Sun, Moon, Ghost, HelpCircle, Camera, CheckCircle2, Star, Coffee, Waves, ExternalLink, ShieldCheck, Smartphone, Download, ChevronDown, AlignLeft, Repeat, FileText, EyeOff, Edit2
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

// 🚀 방금 만든 외부 컴포넌트 불러오기!
import AudioPlayer from './components/AudioPlayer';
import WaveBackground from './components/WaveBackground';

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
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2"; 

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

const getDirectLink = (url) => {
  if (!url) return "";
  if (url.includes("dropbox.com")) return url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/\?dl=\d/, "").replace(/&dl=\d/, "");
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/(.+?)\/(view|edit)?/);
    if (match && match[1]) return `https://docs.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
};

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

const EXHIBITIONS = [
  { id: 'ex-01', title: "침묵의 파동", sub: "2024 기획전", tag: "Ambient / Contemporary", img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80" },
  { id: 'ex-02', title: "낯선 계절", sub: "가든 시리즈", tag: "Lofi / Neo-Classic", img: "https://images.unsplash.com/photo-1554188248-986adbb73be4?auto=format&fit=crop&q=80" },
  { id: 'ex-03', title: "Urban Resonance", sub: "시티 아카이브", tag: "Electronic / Jazz", img: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('gallery'); 
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
  
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '', lyrics: '' });
  const [editingId, setEditingId] = useState(null); 
  
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [newReward, setNewReward] = useState(null);
  
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  
  const audioRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const publicTracks = useMemo(() => tracks.filter(t => !t.isHidden), [tracks]);
  const currentTrack = publicTracks.length > 0 ? publicTracks[currentTrackIdx] : null;

  useEffect(() => {
    if (currentTrack && currentTrack.lyrics) {
      const hasTimeTags = /\[\d{1,3}:\d{1,2}(?:\.\d{1,3})?\]/.test(currentTrack.lyrics);
      if (hasTimeTags) {
        const lines = currentTrack.lyrics.split(/\r?\n/);
        const parsed = [];
        const timeReg = /\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\]/;
        
        lines.forEach(line => {
          const match = timeReg.exec(line);
          if (match) {
            const min = parseInt(match[1], 10);
            const sec = parseFloat(match[2]);
            const time = (min * 60) + sec;
            const text = line.replace(timeReg, '').trim();
            parsed.push({ time, text });
          }
        });
        parsed.sort((a, b) => a.time - b.time);
        setParsedLyrics(parsed);
      } else {
        setParsedLyrics([{ time: 0, text: currentTrack.lyrics }]);
      }
    } else {
      setParsedLyrics([]);
    }
  }, [currentTrack]);

  const activeLyricIdx = useMemo(() => {
    if (parsedLyrics.length <= 1) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time - 0.2) {
        idx = i;
      } else {
        break; 
      }
    }
    return idx;
  }, [currentTime, parsedLyrics]);

  const formatTime = useCallback((time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  }, []);

  const processImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512; canvas.height = 512;
          const ctx = canvas.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 512, 512);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl.split(',')[1]); 
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try { if (!auth.currentUser) await signInAnonymously(auth); } catch (err) { console.error(err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u);
        const adminCheck = !!(u && u.email && ADMIN_EMAILS.includes(u.email.toLowerCase()));
        setIsAdmin(adminCheck);
        if (u) setLoading(false);
      }
    });
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => { isMounted = false; unsubscribe(); window.removeEventListener('scroll', handleScroll); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubTracks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tracks')), (snap) => {
      setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    const unsubLikes = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'), (snap) => setUserLikes(snap.docs.map(d => d.id)));
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const prevRewards = data.rewards || [];
        const checkList = [];
        if (data.listenCount > 0) checkList.push('first_sound');
        if (userLikes.length > 0) checkList.push('first_heart');
        if (data.shareCount > 0) checkList.push('first_signal');
        if (data.listenCount >= 10) checkList.push('moment_10');
        const newlyUnlocked = checkList.find(r => !prevRewards.includes(r));
        if (newlyUnlocked && STICKER_LIBRARY[newlyUnlocked]) {
          setNewReward({ id: newlyUnlocked, ...STICKER_LIBRARY[newlyUnlocked] });
          await updateDoc(profileRef, { rewards: [...prevRewards, newlyUnlocked] });
        }
        setUserProfile(data);
        if (data.hasSeenGuide === false) setShowGuide(true);
      } else {
        const initialData = { listenCount: 0, shareCount: 0, firstJoin: Date.now(), lastActive: Date.now(), rewards: [], profileImg: '', hasSeenGuide: false };
        await setDoc(profileRef, initialData);
        setUserProfile(initialData);
        setShowGuide(true);
      }
    });
    return () => { unsubTracks(); unsubLikes(); unsubProfile(); };
  }, [user, userLikes.length]);

  const updateMediaMetadata = useCallback(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const artworkUrl = currentTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17";
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title, artist: currentTrack.artist, album: 'Unframe Project UP',
        artwork: [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      navigator.mediaSession.setActionHandler('play', () => playTrack());
      navigator.mediaSession.setActionHandler('pause', () => pauseTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => playTrack((currentTrackIdx - 1 + publicTracks.length) % publicTracks.length));
      navigator.mediaSession.setActionHandler('nexttrack', () => playTrack((currentTrackIdx + 1) % publicTracks.length));
    }
  }, [currentTrack, isPlaying, currentTrackIdx, publicTracks.length]);

  const handleToggleLike = async (e, trackId) => {
    if (e) e.stopPropagation();
    if (!user) return;
    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);
    if (userLikes.includes(trackId)) { await deleteDoc(likeDoc); } else {
      await setDoc(likeDoc, { likedAt: Date.now() });
      setToastMessage("아카이브에 기록되었습니다 💗");
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const handleShare = async (e, item, type = 'track') => {
    if (e) e.stopPropagation();
    if (user && type === 'track') updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { shareCount: increment(1) });
    const shareUrl = window.location.origin + window.location.pathname; 
    let shareTitle = "Unframe UP";
    let shareText = "Check this sound.";
    if (type === 'track') { shareTitle = item.title; shareText = `🎧 [${item.title}] - UNFRAME에서 들어보세요.`; } 
    else if (type === 'reward') { shareTitle = item.title; shareText = `✨ [${item.title}] 업적 달성! Unframe에서 확인해보세요.`; }
    try { if (navigator.share) { await navigator.share({ title: shareTitle, text: shareText, url: shareUrl }); return; } } catch (err) {}
    const fallbackText = `${shareText}\n${shareUrl}`;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(fallbackText); } 
      else {
        const textArea = document.createElement("textarea"); textArea.value = fallbackText;
        document.body.appendChild(textArea); textArea.select(); document.execCommand("copy"); document.body.removeChild(textArea);
      }
      setCopiedId(type === 'reward' ? 'reward' : item.id);
      setToastMessage("공유 텍스트가 복사되었습니다 ✨");
      setTimeout(() => { setCopiedId(null); setToastMessage(null); }, 3000);
    } catch (err) { setAuthError("링크 복사에 실패했습니다."); }
  };

  const playTrack = async (idx) => {
    const audio = audioRef.current; if (!audio) return;
    const targetIdx = idx !== undefined ? idx : currentTrackIdx;
    const targetTrack = publicTracks[targetIdx]; if (!targetTrack) return;
    const directUrl = getDirectLink(targetTrack.audioUrl);
    
    if (audio.src !== directUrl) { audio.src = directUrl; audio.load(); }
    if (idx !== undefined) setCurrentTrackIdx(idx);
    setIsPlaying(true);
    try { await audio.play(); updateMediaMetadata(); } catch (e) { setIsPlaying(false); }
  };

  const pauseTrack = () => { setIsPlaying(false); audioRef.current?.pause(); if('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused"; };
  const togglePlay = (e) => { if(e) e.stopPropagation(); isPlaying ? pauseTrack() : playTrack(); };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploadingImg(true);
    try {
      const base64Data = await processImageToBase64(file);
      const formData = new FormData(); formData.append("image", base64Data);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
      const result = await response.json();
      if (result.success) setNewTrack(prev => ({ ...prev, image: result.data.url }));
    } catch (err) { setAuthError("업로드 실패 (ImgBB 제한)"); } finally { setIsUploadingImg(false); }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file || !user) return;
    setIsUploadingProfile(true);
    try {
      const base64Data = await processImageToBase64(file);
      const formData = new FormData(); formData.append("image", base64Data);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
      const result = await response.json();
      if (result.success) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { profileImg: result.data.url });
    } catch (err) { setAuthError("업로드 실패 (ImgBB 제한)"); } finally { setIsUploadingProfile(false); }
  };

  const handleLrcUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewTrack(prev => ({ ...prev, lyrics: event.target.result }));
      setToastMessage("가사 파일이 적용되었습니다 🎤");
      setTimeout(() => setToastMessage(null), 2000);
    };
    reader.readAsText(file);
  };

  const handleAddOrUpdateTrack = async (e) => {
    e.preventDefault(); if (!isAdmin) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', editingId), { ...newTrack, updatedAt: Date.now() });
        setToastMessage("아티팩트가 성공적으로 수정되었습니다 🛠️");
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tracks'), { ...newTrack, isHidden: false, createdAt: Date.now() });
        setToastMessage("배포 성공 🚀");
      }
      handleCancelEdit();
    } catch (err) { setAuthError("권한 오류"); }
  };

  const handleEditClick = (track) => {
    setEditingId(track.id);
    setNewTrack({
      title: track.title || '',
      artist: track.artist || '',
      image: track.image || '',
      description: track.description || '',
      tag: track.tag || 'Ambient',
      audioUrl: track.audioUrl || '',
      lyrics: track.lyrics || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTrack({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '', lyrics: '' });
  };

  const handleToggleVisibility = async (track) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', track.id), { isHidden: !track.isHidden });
      setToastMessage(track.isHidden ? "곡이 대중에게 공개되었습니다 👁️" : "곡이 숨김 처리되었습니다 🚫");
    } catch (err) {}
  };

  const closeGuide = async () => { setShowGuide(false); if (user) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { hasSeenGuide: true }); };

  const handleTimeUpdate = (e) => {
    const cTime = e.currentTarget.currentTime;
    setCurrentTime(cTime);
    if (audioRef.current && audioRef.current.volume !== volume) { audioRef.current.volume = volume; }
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] relative overflow-x-hidden ${isPlayerExpanded ? 'h-screen overflow-hidden' : ''}`}>
      <audio 
        ref={audioRef} 
        muted={isMuted} // 🚀 뮤트 연결
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} 
        onDurationChange={(e) => setDuration(e.currentTarget.duration)} 
        onEnded={() => playTrack((currentTrackIdx + 1) % publicTracks.length)} 
        onWaiting={() => setIsBuffering(true)} 
        onPlaying={() => { setIsBuffering(false); updateMediaMetadata(); }} 
        onPlay={() => { if(user) updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { listenCount: increment(1), lastActive: Date.now() }); }} 
        playsInline 
      />
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#004aad] z-110 origin-left" style={{ scaleX }} />

      <header className={`fixed top-0 w-full z-100 transition-all duration-500 ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/5' : 'py-6 lg:py-10'}`}>
        <div className="container mx-auto px-6 lg:px-8 flex justify-between items-end">
          <div className="group cursor-pointer" onClick={() => setView('gallery')}>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#004aad] transition-colors">Unframe<span className="text-[#004aad]">.</span></h1>
            <p className={subTitle + " text-[8px] lg:text-[10px] mt-1 hidden lg:block"}>Reactive Art Collective</p>
          </div>
          <nav className="flex items-center gap-4 lg:gap-10">
             <button onClick={() => setView('gallery')} className={`text-[10px] lg:text-[11px] font-black uppercase tracking-widest ${view === 'gallery' ? 'text-[#004aad]' : 'opacity-30'}`}>Exhibit</button>
             <button onClick={() => setView('library')} className={`text-[10px] lg:text-[11px] font-black uppercase tracking-widest ${view === 'library' ? 'text-[#004aad]' : 'opacity-30'}`}>Archive</button>
             <button onClick={() => setShowGuide(true)} className="p-2 text-zinc-600 hover:text-[#004aad] transition-all"><HelpCircle className="w-4 h-4 lg:w-5 lg:h-5" /></button>
             {isAdmin && <button onClick={() => setView('admin')} className={`text-[10px] lg:text-[11px] font-black uppercase tracking-widest ${view === 'admin' ? 'text-[#004aad]' : 'opacity-30'}`}>Console</button>}
          </nav>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-24 lg:pb-0">
            {/* [Section 1] Hero */}
            <section className="h-screen flex flex-col justify-center items-center relative px-6 lg:px-8 overflow-hidden">
               {/* 🚀 분리된 컴포넌트 사용! */}
               <WaveBackground isPlaying={isPlaying} />

               <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 text-center relative pointer-events-none">
                 <span className="inline-block px-4 py-1.5 border border-white/20 text-white/60 font-bold tracking-[0.5em] uppercase mb-6 lg:mb-10 backdrop-blur-md rounded-full text-[8px] lg:text-[9px]">Listening Gallery</span>
                 <h2 className={`${h1Title} text-[20vw] lg:text-[14rem] italic-outline`}>Project<br/><span className="not-italic text-[#004aad]">UP</span></h2>
                 <p className="mt-8 lg:mt-12 text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.6em] font-bold text-[9px] lg:text-[10px] max-w-sm mx-auto leading-loose opacity-60">전시의 공기를 음악으로 치환하여<br/>당신의 일상으로 연결합니다.</p>
               </motion.div>
               <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-24 lg:bottom-16 left-1/2 -translate-x-1/2 opacity-20 z-10"><ArrowDown className="w-6 h-6" /></motion.div>
            </section>

            {/* [Section 2] Philosophy */}
            <section className="py-32 lg:py-60 bg-[#fdfbf7] text-black relative z-20 shadow-[0_-50px_100px_rgba(0,0,0,0.5)]">
               <div className="container mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-12 lg:gap-20">
                  <div className="lg:col-span-7">
                     <span className="text-[#004aad] text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] mb-4 lg:mb-6 block">Philosophy</span>
                     <h2 className="text-[14vw] lg:text-[8rem] font-black uppercase tracking-tighter leading-[0.8] mb-8 lg:mb-12">Watching<br/><span className="text-[#004aad]">Beyond</span> Listening</h2>
                     <div className="h-2 w-24 lg:w-40 bg-black rounded-full" />
                  </div>
                  <div className="lg:col-span-5 flex flex-col justify-end space-y-6 lg:space-y-10">
                     <p className="text-xl lg:text-3xl font-medium leading-tight text-zinc-800"><b>'UP'</b>은 전시장의 잔향을 일상의 이어폰 속으로 옮겨오는 프로젝트입니다.</p>
                     <p className="text-base lg:text-lg text-zinc-500 font-light leading-relaxed italic border-l-4 border-zinc-200 pl-6 lg:pl-8">"전시장의 공기는 눈으로만 보는 것이 아니라, 귀로 들리고 피부로 느껴지는 입체적인 경험입니다. 우리는 전시와 일상을 이어주는 통로를 설계합니다."</p>
                  </div>
               </div>
            </section>

            {/* [Section 3] Curation Blueprint */}
            <section className="py-32 lg:py-40 bg-black/40 relative">
               <div className="container mx-auto px-6 lg:px-8 text-center mb-16 lg:mb-24">
                  <h3 className={subTitle}>Curation Blueprint</h3>
                  <p className="text-3xl lg:text-7xl font-black uppercase mt-4 italic italic-outline">Methodology</p>
               </div>
               <div className="container mx-auto px-6 lg:px-8 grid md:grid-cols-3 gap-6 lg:gap-8">
                  {[
                    { icon: Disc, title: "Exhibition OST", desc: "전시 기획 의도를 담아 공간의 페르소나를 완성하는 공식 플레이리스트입니다." },
                    { icon: Eye, title: "Director's Pick", desc: "디렉터가 매일 아침 공간을 정돈하며 듣는, 계절과 무드에 어울리는 선곡입니다." },
                    { icon: Archive, title: "Sound Archive", desc: "전시 종료 후에도 그 공간의 온기를 언제든 다시 꺼낼 수 있는 단단한 기록입니다." }
                  ].map((item, idx) => (
                    <motion.div key={idx} whileHover={{ y: -10 }} className="p-8 lg:p-12 rounded-[2rem] lg:rounded-[4rem] bg-white/5 border border-white/10 space-y-6 lg:space-y-8 hover:bg-[#004aad]/10 hover:border-[#004aad]/50 transition-all duration-300">
                       <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-3xl bg-[#004aad] flex items-center justify-center shadow-lg shadow-[#004aad]/20"><item.icon className="w-6 h-6 lg:w-7 lg:h-7 text-white" /></div>
                       <h4 className="text-xl lg:text-2xl font-black uppercase tracking-tight italic">{item.title}</h4>
                       <p className="text-xs lg:text-sm text-zinc-500 font-medium leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
               </div>
            </section>

            {/* [Section 4] Archive Collections (유저는 공개된 트랙만 봄) */}
            <section className="py-32 lg:py-60 px-6 lg:px-8 container mx-auto">
              <div className="mb-16 lg:mb-24 flex flex-col lg:flex-row justify-between lg:items-end border-b border-white/5 pb-8 lg:pb-12 gap-4">
                 <div><h3 className={subTitle}>Archive Collections</h3><p className="text-5xl lg:text-[8rem] font-black uppercase mt-4 lg:mt-6 italic italic-outline tracking-tighter leading-none">Sound Artifacts</p></div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:gap-6">
                {publicTracks.map((track, idx) => (
                  <motion.div key={track.id} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} onClick={() => setSelectedTrack(track)} className={`${glass} p-6 lg:p-14 rounded-[2rem] lg:rounded-[4rem] flex flex-col md:flex-row md:items-center justify-between group cursor-pointer hover:bg-white/10 transition-all border-white/5 relative shadow-xl gap-6`}>
                    <div className="flex items-center gap-6 lg:gap-12 relative z-10 w-full md:w-auto">
                       <span className="text-4xl lg:text-7xl font-thin italic text-white/10 lg:text-white/5 group-hover:text-[#004aad]/30 transition-colors">{(idx + 1).toString().padStart(2, '0')}</span>
                       <div className="space-y-2 lg:space-y-3 flex-1">
                          <h4 className="text-2xl lg:text-8xl font-black uppercase group-hover:italic transition-all duration-700 tracking-tighter leading-tight lg:leading-none">{track.title}</h4>
                          <div className="flex items-center gap-4">
                             <p className="text-[9px] lg:text-[11px] text-zinc-500 font-bold tracking-[0.3em] lg:tracking-[0.5em] uppercase">{track.artist}</p>
                             <button onClick={(e) => handleShare(e, track, 'track')} className="p-2 lg:p-3 opacity-100 lg:opacity-0 group-hover:opacity-100 hover:text-[#004aad] transition-all bg-white/5 rounded-full"><Share2 className="w-3 h-3 lg:w-4 lg:h-4" /></button>
                          </div>
                       </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 lg:gap-8 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                      <button onClick={(e) => handleToggleLike(e, track.id)} className={`transition-all ${userLikes.includes(track.id) ? 'text-red-500 scale-125' : 'text-white/20 hover:text-white'}`}><Heart className={`w-6 h-6 lg:w-8 lg:h-8 ${userLikes.includes(track.id) ? 'fill-current' : ''}`} /></button>
                      <div onClick={(e) => { e.stopPropagation(); if (currentTrackIdx === idx && isPlaying) pauseTrack(); else playTrack(idx); }} className={`w-14 h-14 lg:w-24 lg:h-24 rounded-full border border-white/10 flex items-center justify-center transition-all ${currentTrackIdx === idx && isPlaying ? 'bg-[#004aad] border-[#004aad] shadow-2xl' : 'bg-white/5 group-hover:bg-white group-hover:text-black shadow-2xl'}`}>{currentTrackIdx === idx && isPlaying ? (isBuffering ? <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 animate-spin text-white" /> : <Pause className="w-6 h-6 lg:w-8 lg:h-8 fill-current" />) : <Play className="w-6 h-6 lg:w-8 lg:h-8 fill-current ml-1 lg:ml-1.5" />}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* [Section 5] Exhibition Gallery */}
            <section className="py-32 lg:py-60 px-6 lg:px-8 container mx-auto">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 lg:mb-24 gap-4">
                  <div><h3 className={subTitle}>Sound Archive</h3><p className="text-5xl lg:text-[7rem] font-black uppercase mt-4 italic italic-outline leading-none">Exhibitions</p></div>
                  <p className="text-zinc-600 font-bold text-[9px] lg:text-[10px] uppercase tracking-widest pb-2">Click to Explore Space</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                  {EXHIBITIONS.map((ex, idx) => (
                    <motion.div key={ex.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: idx * 0.1 }} className="group cursor-pointer">
                      <div className="relative aspect-4/5 rounded-[2rem] lg:rounded-[3.5rem] overflow-hidden mb-6 lg:mb-8 shadow-2xl bg-zinc-900 border border-white/5">
                        <img src={ex.img} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-60 group-hover:opacity-100" alt={ex.title} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500"><ExternalLink className="w-5 h-5 lg:w-6 lg:h-6" /></div></div>
                        <div className="absolute top-6 right-6 lg:top-8 lg:right-8 px-3 lg:px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-white">{ex.tag}</div>
                      </div>
                      <div className="px-4 lg:px-6 space-y-2"><p className="text-[#004aad] text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em]">{ex.sub}</p><h4 className="text-xl lg:text-2xl font-black uppercase tracking-tighter group-hover:text-[#004aad] transition-colors">{ex.title}</h4></div>
                    </motion.div>
                  ))}
               </div>
            </section>

            {/* [Section 6] Streaming Connect */}
            <section className="py-32 lg:py-60 px-6 lg:px-8 bg-black relative overflow-hidden">
               <div className="container mx-auto text-center space-y-16 lg:space-y-24 relative z-10">
                  <div className="space-y-4 lg:space-y-6">
                     <span className={subTitle}>Streaming Connection</span>
                     <h2 className={`${h1Title} text-[12vw] lg:text-[7.5rem] leading-none`}>Carry the<br/><span className="text-[#004aad]">Vibe Outside</span></h2>
                  </div>
                  <div className="flex flex-col lg:flex-row justify-center gap-6 lg:gap-12 max-w-5xl mx-auto w-full">
                     <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-12 lg:py-16 rounded-[2rem] lg:rounded-[4rem] bg-zinc-900/50 border border-white/5 hover:border-red-600 transition-all group flex flex-col items-center gap-6 lg:gap-8 shadow-xl"><div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-red-600/20 shadow-2xl"><Play className="w-8 h-8 lg:w-10 lg:h-10 fill-white text-white" /></div><p className="text-xl lg:text-2xl font-black uppercase tracking-tighter">YouTube Music</p></a>
                     <a href="https://spotify.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-12 lg:py-16 rounded-[2rem] lg:rounded-[4rem] bg-zinc-900/50 border border-white/5 hover:border-green-500 transition-all group flex flex-col items-center gap-6 lg:gap-8 shadow-xl"><div className="w-16 h-16 lg:w-20 lg:h-20 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-green-500/20 shadow-2xl"><Disc className="w-8 h-8 lg:w-10 lg:h-10 text-black fill-black" /></div><p className="text-xl lg:text-2xl font-black uppercase tracking-tighter">Spotify</p></a>
                  </div>
               </div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,74,173,0.1)_0%,transparent_70%)] z-0 pointer-events-none" />
            </section>

            <footer className="py-24 lg:py-40 bg-[#fdfbf7] text-black border-t border-zinc-200 px-6 lg:px-8 relative z-30">
               <div className="container mx-auto grid lg:grid-cols-4 gap-12 lg:gap-10 opacity-80">
                  <div className="space-y-6 lg:space-y-10"><h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-[#004aad]">Unframe<span className="text-black">.</span></h1><p className="text-[9px] lg:text-[11px] font-black uppercase leading-loose text-zinc-400">© 2026 UNFRAME ART COLLECTIVE.</p></div>
                  <div className="space-y-4 lg:space-y-8"><p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> VISIT US</p><ul className="text-xs lg:text-sm font-bold opacity-60"><li>서울특별시 종로구 인사동4길 17, 108호</li></ul></div>
                  <div className="space-y-4 lg:space-y-8"><p className="text-[10px] lg:text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> SYSTEM</p><ul className="text-xs lg:text-sm font-bold opacity-80 underline"><li onClick={() => setView('admin')} className="cursor-pointer">Console</li></ul></div>
               </div>
            </footer>
          </motion.div>
        )}

        {/* --- [Sonic Identity Card] Archive View --- */}
        {view === 'library' && (
          <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 lg:pt-40 px-6 lg:px-8 container mx-auto pb-32 lg:pb-40 min-h-screen relative z-20">
             <div className="grid lg:grid-cols-12 gap-8 lg:gap-20">
                <div className="lg:col-span-4 space-y-6 lg:space-y-8">
                  <motion.div className={`${glass} p-8 lg:p-12 rounded-[3rem] lg:rounded-[5rem] text-center space-y-8 lg:space-y-10 relative border-white/20 shadow-2xl`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#004aad] opacity-30 shadow-[0_0_20px_#004aad]" />
                    <div className="relative inline-block">
                      <div className="w-32 h-32 lg:w-40 lg:h-40 bg-zinc-900 rounded-full mx-auto flex items-center justify-center shadow-2xl transition-transform duration-700 overflow-hidden border-4 border-white/10 relative group/profile">
                        {isUploadingProfile ? <Loader2 className="w-8 h-8 lg:w-10 lg:h-10 animate-spin text-[#004aad]" /> : (userProfile?.profileImg ? <img src={userProfile.profileImg} className="w-full h-full object-cover" alt="profile" /> : <User className="w-10 h-10 lg:w-14 lg:h-14 text-white/10" />)}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/profile:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity"><Camera className="w-5 h-5 lg:w-6 lg:h-6 mb-1 lg:mb-2" /><span className="text-[9px] lg:text-[10px] font-black uppercase">Change</span><input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={isUploadingProfile} /></label>
                      </div>
                      <div className={`absolute -bottom-2 -right-2 px-4 lg:px-6 py-1.5 lg:py-2 rounded-full ${membership.bg} ${membership.color} text-[9px] lg:text-[11px] font-black uppercase border border-white/10 shadow-2xl flex items-center gap-1.5 lg:gap-2`}>
                        {React.createElement(membership.icon, { className: "w-3 h-3 lg:w-4 lg:h-4" })} {membership.name}
                      </div>
                    </div>
                    <div className="space-y-3 lg:space-y-4">
                      <div className="space-y-1.5 lg:space-y-2"><h2 className="text-2xl lg:text-4xl font-black uppercase italic tracking-tighter leading-none">너는 지금 {membership.name}야</h2><p className="text-[9px] lg:text-[11px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">함께한 지 {Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000) + 1}일째의 여행</p></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 border-t border-white/10 pt-6 lg:pt-10">
                      <div className="space-y-1"><Music className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-indigo-400"/><p className="text-[7px] lg:text-[8px] font-black text-zinc-600 uppercase">순간</p><p className="text-lg lg:text-xl font-black text-white">{userProfile?.listenCount || 0}</p></div>
                      <div className="space-y-1"><Heart className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-red-400"/><p className="text-[7px] lg:text-[8px] font-black text-zinc-600 uppercase">하트</p><p className="text-lg lg:text-xl font-black text-white">{userLikes.length}</p></div>
                      <div className="space-y-1"><Share2 className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-blue-400"/><p className="text-[7px] lg:text-[8px] font-black text-zinc-600 uppercase">신호</p><p className="text-lg lg:text-xl font-black text-white">{userProfile?.shareCount || 0}</p></div>
                      <div className="space-y-1"><Zap className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-yellow-400"/><p className="text-[7px] lg:text-[8px] font-black text-zinc-600 uppercase">연속</p><p className="text-lg lg:text-xl font-black text-white">{Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000) + 1}</p></div>
                    </div>
                    <button onClick={() => signOut(auth)} className="text-[8px] lg:text-[9px] font-black uppercase underline opacity-20 hover:opacity-100 mt-6 lg:mt-10">Sign Out</button>
                  </motion.div>
                  <div className={`${glass} p-8 lg:p-12 rounded-[3rem] lg:rounded-[5rem] space-y-6 lg:space-y-10 border-white/10`}>
                    <h3 className="text-[9px] lg:text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3 lg:gap-4 text-zinc-400"><Archive className="w-3 h-3 lg:w-4 lg:h-4 text-[#004aad]" /> Sticker Book</h3>
                    <div className="grid grid-cols-4 gap-3 lg:gap-4">
                      {Object.entries(STICKER_LIBRARY).map(([key, data]) => {
                        const isActive = userProfile.rewards?.includes(key);
                        return (
                          <div key={key} onClick={(e) => isActive && handleShare(e, data, 'reward')} className={`aspect-square rounded-[1rem] lg:rounded-2xl flex items-center justify-center border transition-all duration-700 ${isActive ? 'cursor-pointer hover:scale-105 border-[#004aad] bg-gradient-to-br from-[#004aad]/20 to-indigo-500/10 text-white shadow-[0_0_15px_rgba(0,74,173,0.3)]' : 'border-white/5 opacity-10'} relative group/badge`}>
                            <data.icon className={`w-4 h-4 lg:w-6 lg:h-6 ${isActive ? data.color : ''}`} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 lg:mb-4 p-3 lg:p-5 bg-black border border-white/10 rounded-xl lg:rounded-2xl text-[8px] lg:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-all scale-95 group-hover/badge:scale-100 z-50 shadow-2xl">
                               <p className={isActive ? data.color : 'text-[#004aad]'} style={{fontSize: '10px'}}>{data.title}</p>
                               <p className="text-white mt-1 lg:mt-1.5 font-bold leading-relaxed lowercase opacity-100 hidden lg:block">{data.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-8 space-y-10 lg:space-y-16">
                   <section className={`${glass} p-8 lg:p-12 rounded-[3rem] lg:rounded-[5rem] space-y-6 lg:space-y-10 border-[#004aad]/20`}><div className="space-y-4 lg:space-y-6"><div className="flex flex-wrap items-center gap-3 lg:gap-4"><span className="px-4 lg:px-5 py-1.5 lg:py-2 rounded-full bg-[#004aad]/20 text-[#004aad] text-[8px] lg:text-[10px] font-black uppercase tracking-widest border border-[#004aad]/30">오늘의 UP 놀이</span>{userProfile?.listenCount > 0 && <span className="text-[8px] lg:text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5 lg:gap-2"><CheckCircle2 className="w-3 h-3"/> 오늘도 들러줘서 고마워 💙</span>}</div><h3 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter leading-none text-white">오늘 노래 1번 듣기</h3></div><div className="pt-6 lg:pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center gap-4 lg:gap-6"><div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl bg-white/5 flex flex-col items-center justify-center border border-white/10 shadow-xl shrink-0"><p className="text-[7px] lg:text-[8px] font-black uppercase opacity-40">Rank</p><p className="text-xl lg:text-2xl font-black italic tracking-tighter text-white">#3</p></div><p className="text-xs lg:text-sm font-medium text-zinc-400">너는 지금 <span className="text-white font-black italic">조용히 자주 오는 사람들</span> 중 3번째야 🌙</p></div></section>
                   <section className="space-y-8 lg:space-y-12"><h2 className={`${h1Title} text-5xl lg:text-[9rem] tracking-tighter`}>My<br/>Hearts</h2><div className="grid gap-4 lg:gap-6">{publicTracks.filter(t => userLikes.includes(t.id)).map(t => (<div key={t.id} onClick={() => setSelectedTrack(t)} className={`${glass} p-6 lg:p-12 rounded-[2rem] lg:rounded-[4rem] flex justify-between items-center group cursor-pointer border-white/5 hover:bg-[#004aad]/5 transition-all shadow-xl`}><div className="flex items-center gap-6 lg:gap-10"><div className="w-14 h-14 lg:w-20 lg:h-20 rounded-[1.2rem] lg:rounded-4xl overflow-hidden shadow-2xl shrink-0"><img src={t.image} loading="lazy" className="w-full h-full object-cover" alt="" onError={(e)=>e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17'} /></div><div className="space-y-1 lg:space-y-2 truncate"><p className="text-2xl lg:text-4xl font-black uppercase tracking-tighter leading-none truncate">{t.title}</p><p className="text-[9px] lg:text-[11px] font-bold text-[#004aad] tracking-[0.2em] uppercase truncate">{t.artist}</p></div></div><div className="flex items-center gap-3 lg:gap-4 shrink-0"><button onClick={(e) => handleShare(e, t, 'track')} className="p-2 lg:p-4 opacity-100 lg:opacity-0 group-hover:opacity-100 hover:text-[#004aad] transition-all bg-white/5 rounded-full hidden md:block"><Share2 className="w-4 h-4 lg:w-5 lg:h-5" /></button><Heart className="w-6 h-6 lg:w-10 lg:h-10 fill-red-500 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" /></div></div>))}</div></section>
                </div>
             </div>
          </motion.div>
        )}

        {/* --- [Console View] --- */}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 lg:pt-40 px-6 lg:px-8 container mx-auto pb-32 lg:pb-40 relative z-20 min-h-screen">
             <div className="grid lg:grid-cols-12 gap-12 lg:gap-24">
              <div className="lg:col-span-8 space-y-10 lg:space-y-16">
                <h2 className={h1Title + " text-6xl lg:text-[10rem]"}>Console</h2>
                {!isAdmin ? (
                  <div className={glass + " p-16 lg:p-32 rounded-[3rem] lg:rounded-[6rem] text-center space-y-8 lg:space-y-10"}>
                    <ShieldCheck className="w-16 h-16 lg:w-24 lg:h-24 mx-auto text-[#004aad]" />
                    <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-12 lg:px-20 py-4 lg:py-6 rounded-full font-black uppercase text-xs lg:text-sm tracking-widest shadow-2xl">Verify Admin</button>
                  </div>
                ) : (
                  <div className="space-y-4 lg:space-y-6">
                    {tracks.map(t => (
                      <div key={t.id} className={`${glass} p-6 lg:p-10 px-8 lg:px-12 rounded-[2rem] lg:rounded-[4rem] flex justify-between items-center group shadow-xl transition-all ${t.isHidden ? 'opacity-40 border-dashed border-white/20' : 'border-white/5'}`}>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex flex-wrap items-center gap-3">
                            {t.isHidden && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] rounded font-bold uppercase tracking-widest">Hidden</span>}
                            <p className="font-black uppercase tracking-tight text-xl lg:text-3xl truncate">{t.title}</p>
                          </div>
                          <p className="text-zinc-500 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-1 lg:mt-2 truncate">{t.artist}</p>
                        </div>
                        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                          <button onClick={() => handleToggleVisibility(t)} className={`p-3 lg:p-4 rounded-full transition-all ${t.isHidden ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-zinc-400 bg-white/5 hover:text-white hover:bg-white/10'}`}>
                            {t.isHidden ? <EyeOff className="w-5 h-5 lg:w-6 lg:h-6" /> : <Eye className="w-5 h-5 lg:w-6 lg:h-6" />}
                          </button>
                          <button onClick={() => handleEditClick(t)} className="p-3 lg:p-4 text-zinc-400 hover:text-[#004aad] transition-colors bg-white/5 hover:bg-white/10 rounded-full">
                            <Edit2 className="w-5 h-5 lg:w-6 lg:h-6" />
                          </button>
                          <button onClick={() => { if(window.confirm('정말 삭제하시겠습니까?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', t.id)) }} className="p-3 lg:p-4 text-red-500/50 hover:text-red-500 transition-colors bg-red-500/5 hover:bg-red-500/10 rounded-full">
                            <Trash2 className="w-5 h-5 lg:w-6 lg:h-6" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="lg:col-span-4">
                  <div className={`p-8 lg:p-16 rounded-[3rem] lg:rounded-[6rem] text-black shadow-2xl transition-colors duration-500 ${editingId ? 'bg-emerald-400 shadow-emerald-500/20' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
                    <div className="mb-8 flex items-center justify-between">
                      <h3 className="font-black uppercase tracking-tighter text-2xl lg:text-3xl">{editingId ? 'Edit Artifact' : 'New Artifact'}</h3>
                      {editingId && <button onClick={handleCancelEdit} className="text-xs font-black uppercase bg-black/10 px-4 py-2 rounded-full hover:bg-black text-black hover:text-white transition-all">Cancel</button>}
                    </div>

                    <form onSubmit={handleAddOrUpdateTrack} className="space-y-6 lg:space-y-8">
                      <input required placeholder="TITLE" value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-black uppercase outline-none focus:border-black text-lg lg:text-xl placeholder:text-black/40" />
                      <input required placeholder="ARTIST" value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-black uppercase outline-none focus:border-black text-lg lg:text-xl placeholder:text-black/40" />
                      
                      <div className="space-y-4">
                        <div className="relative">
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <div className={`p-6 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-3 lg:gap-4`}>
                            {isUploadingImg ? <Loader2 className="w-8 h-8 lg:w-10 lg:h-10 animate-spin" /> : <Upload className="w-8 h-8 lg:w-10 lg:h-10 text-black/60" />}
                            <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-center text-black/60">Jacket Image<br/>(512x512 Auto-Fit)</span>
                          </div>
                        </div>
                        {newTrack.image && <div className="w-full aspect-square rounded-[2rem] lg:rounded-[3rem] overflow-hidden border-2 border-black shadow-2xl relative group">
                          <img src={newTrack.image} className="w-full h-full object-cover" alt="preview" />
                        </div>}
                      </div>

                      <input required placeholder="AUDIO SOURCE (URL)" value={newTrack.audioUrl} onChange={e => setNewTrack({...newTrack, audioUrl: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-black outline-none focus:border-black placeholder:text-black/40" />
                      <textarea placeholder="DESCRIPTION" value={newTrack.description} onChange={e => setNewTrack({...newTrack, description: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-medium text-xs lg:text-sm outline-none focus:border-black h-20 lg:h-32 resize-none placeholder:text-black/40" />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Lyrics (Direct Upload)</span>
                          <label className="cursor-pointer flex items-center gap-1 bg-black/10 px-3 py-1.5 rounded-full hover:bg-black/20 transition-colors">
                            <FileText className="w-3 h-3 text-black/70" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-black/70">.LRC 파일 첨부</span>
                            <input type="file" accept=".lrc,.txt" onChange={handleLrcUpload} className="hidden" />
                          </label>
                        </div>
                        <textarea placeholder="LYRICS (직접 입력 또는 상단 파일 첨부)" value={newTrack.lyrics} onChange={e => setNewTrack({...newTrack, lyrics: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-medium text-[10px] lg:text-xs outline-none focus:border-black h-32 lg:h-48 resize-none placeholder:text-black/40 leading-relaxed font-mono whitespace-pre" wrap="off" />
                      </div>

                      <button type="submit" disabled={isUploadingImg} className="w-full bg-black text-white py-6 lg:py-8 mt-6 lg:mt-10 rounded-[2rem] lg:rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] lg:text-xs shadow-2xl disabled:opacity-50">
                        {editingId ? 'Update Artifact' : 'Sync Artifact'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 우리가 분리했던 컴포넌트를 다시 가져와서 깨끗하게 붙입니다! */}
      <AudioPlayer 
        currentTrack={currentTrack}
        isPlayerExpanded={isPlayerExpanded}
        setIsPlayerExpanded={setIsPlayerExpanded}
        isPlaying={isPlaying}
        progressPct={progressPct}
        volume={volume}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        setVolume={setVolume}
        handleShare={handleShare}
        handleToggleLike={handleToggleLike}
        userLikes={userLikes}
        togglePlay={togglePlay}
        playTrack={playTrack}
        currentTrackIdx={currentTrackIdx}
        publicTracks={publicTracks}
        isBuffering={isBuffering}
        showLyrics={showLyrics}
        setShowLyrics={setShowLyrics}
        parsedLyrics={parsedLyrics}
        setParsedLyrics={setParsedLyrics}
        activeLyricIdx={activeLyricIdx}
        duration={duration}
        currentTime={currentTime}
        audioRef={audioRef}
        formatTime={formatTime}
      />

      {/* --- [Reward Celebrate Popup] --- */}
      <AnimatePresence>{newReward && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setNewReward(null)}><motion.div initial={{ scale: 0.8, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 100 }} className={`${glass} w-full max-w-md rounded-[3rem] lg:rounded-[5rem] p-8 lg:p-12 text-center space-y-8 lg:space-y-12 border-white/20 shadow-[0_0_100px_#004aad]/40`} onClick={e => e.stopPropagation()}><div className="space-y-4"><Star className="w-12 h-12 lg:w-16 lg:h-16 text-yellow-400 mx-auto animate-bounce" /><h2 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter text-[#004aad]">New Sticker!</h2><p className="text-[10px] lg:text-sm text-zinc-500 font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em]">축하합니다! 새로운 기록이 해제되었습니다.</p></div><div className="bg-zinc-950 p-6 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-white/5 space-y-4 lg:space-y-6 relative"><div className="w-16 h-16 lg:w-24 lg:h-24 bg-white/5 rounded-2xl lg:rounded-3xl mx-auto flex items-center justify-center border border-white/10"><newReward.icon className="w-8 h-8 lg:w-12 lg:h-12 text-[#004aad]" /></div><div className="space-y-1 lg:space-y-2"><h4 className="text-xl lg:text-2xl font-black uppercase tracking-tighter text-white">[{newReward.title}]</h4><p className="text-white mt-1 font-bold leading-relaxed lowercase text-sm">{newReward.desc}</p></div></div><div className="flex flex-col gap-3 lg:gap-4"><button onClick={(e) => handleShare(e, newReward, 'reward')} className="w-full py-4 lg:py-6 bg-white text-black rounded-2xl lg:rounded-3xl font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-[#004aad] hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3">{copiedId === 'reward' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} SNS 공유하기</button><button onClick={() => setNewReward(null)} className="text-[9px] lg:text-[10px] font-black uppercase text-zinc-500">나중에 하기</button></div></motion.div></motion.div>)}</AnimatePresence>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-4 lg:p-6 backdrop-blur-2xl" onClick={closeGuide}>
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }} className={`${glass} w-full max-w-4xl rounded-[2.5rem] lg:rounded-[4rem] flex flex-col relative overflow-hidden shadow-indigo-500/20 shadow-2xl max-h-[85vh]`} onClick={e => e.stopPropagation()}>
              <button onClick={closeGuide} className="absolute top-6 right-6 lg:top-8 lg:right-8 p-3 lg:p-4 rounded-full bg-white/5 hover:bg-[#004aad] text-white transition-all z-[600]"><X className="w-4 h-4 lg:w-5 lg:h-5" /></button>
              
              <div className="flex-1 overflow-y-auto p-8 lg:p-20 space-y-8 lg:space-y-12">
                <div className="space-y-3 lg:space-y-4"><h2 className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter text-[#004aad]">System Guide</h2><p className="text-[9px] lg:text-sm text-zinc-500 font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em]">Unframe: 당신을 위한 공간 이용법</p></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                   {[
                     { icon: Ghost, title: "Relationship", desc: "머무른 시간이 쌓일수록 Hello에서 Family까지 우리의 관계는 깊어집니다." },
                     { icon: Archive, title: "Sticker Book", desc: "첫 소리, 첫 하트, 첫 신호... 소중한 순간들을 스티커로 기록해 보세요." },
                     { icon: Sparkles, title: "Daily Play", desc: "하루 한 번, 소소한 놀이를 통해 Unframe의 세계관을 함께 완성합니다." },
                     { icon: Smartphone, title: "Install App", desc: "Safari/Chrome 메뉴에서 [홈 화면에 추가]를 눌러 앱처럼 감상하세요." }
                   ].map((item, i) => (
                     <div key={i} className="space-y-3 lg:space-y-4 p-6 lg:p-8 bg-white/5 rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 hover:border-[#004aad]/30 transition-all flex flex-col items-center text-center">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#004aad]/10 rounded-xl lg:rounded-2xl flex items-center justify-center"><item.icon className="w-5 h-5 lg:w-6 lg:h-6 text-[#004aad]" /></div>
                        <h4 className="text-base lg:text-lg font-black uppercase tracking-tight">{item.title}</h4>
                        <p className="text-[10px] lg:text-xs text-white/70 font-bold leading-relaxed">{item.desc}</p>
                     </div>
                   ))}
                </div>
                
                <div className="pt-6 lg:pt-8 border-t border-white/5 text-center">
                   <button onClick={closeGuide} className="bg-white text-black px-12 lg:px-16 py-4 lg:py-6 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-widest hover:bg-[#004aad] hover:text-white transition-all shadow-2xl shadow-indigo-500/30">가이드 종료</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toastMessage && (<motion.div initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed bottom-32 lg:bottom-40 left-1/2 z-[1000] bg-[#004aad] text-white px-6 lg:px-8 py-3 lg:py-4 rounded-full font-black uppercase text-[10px] lg:text-[11px] shadow-2xl flex items-center gap-2 lg:gap-3 shadow-indigo-500/20"><CheckCircle2 className="w-3 h-3 lg:w-4 lg:h-4" /> {toastMessage}</motion.div>)}</AnimatePresence>
      <AnimatePresence>{authError && (<motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed top-20 lg:top-24 left-1/2 z-[1000] bg-red-600 px-6 lg:px-8 py-4 lg:py-5 rounded-2xl lg:rounded-3xl font-black uppercase text-[10px] lg:text-[11px] flex items-center gap-3 lg:gap-4 shadow-2xl shadow-red-500/20"><AlertCircle className="w-4 h-4" /> {authError} <button onClick={() => setAuthError(null)} className="ml-4 lg:ml-6 opacity-60">X</button></motion.div>)}</AnimatePresence>

      <style>{`
        .italic-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.1); color: transparent; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wave { 0%, 100% { height: 4px; } 50% { height: 12px; } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #050505; } ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #004aad; }
        input[type=range]::-webkit-slider-thumb { appearance: none; height: 16px; width: 16px; border-radius: 50%; background: white; box-shadow: 0 0 15px rgba(0,74,173,1); cursor: pointer; }
        .pt-safe-top { padding-top: env(safe-area-inset-top, 20px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}