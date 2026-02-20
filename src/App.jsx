import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  query,
  updateDoc,
  increment
} from 'firebase/firestore';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Trash2, AlertCircle, Loader2, Music, X, Heart, Award, User, Share2,
  Volume2, VolumeX, ImageIcon, Upload, ArrowDown, ChevronRight, Disc, Eye, Archive, Check, Trophy, Calendar, TrendingUp, Medal, Zap, Clock, Sparkles, Sun, Moon, Ghost, HelpCircle, Camera, CheckCircle2, Star, Coffee, Waves
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

// --- [🔥 Firebase 설정] ---
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
const ADMIN_EMAILS = ['gallerykuns@gmail.com', 'cybog2004@gmail.com', 'sylove887@gmail.com']; 
const IMGBB_API_KEY = "6be30353a25316492323e20e066e4a2d"; 

// --- [🎨 디자인 시스템] ---
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
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '' });
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [newReward, setNewReward] = useState(null);
  
  const audioRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIdx] : null;

  // --- [🛠️ 유틸리티: 시간 포맷] ---
  const formatTime = useCallback((time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  }, []);

  // --- [🖼️ 유틸리티: 이미지 512x512 압축 리사이징] ---
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          // 정사각 크롭 및 리사이징 로직
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 512, 512);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
        };
      };
    });
  };

  // 🔐 [인증]
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

  // 📊 [데이터 실시간 동기화]
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
        const daysSinceJoin = Math.floor((Date.now() - (data.firstJoin || Date.now())) / 86400000);
        const currentHour = new Date().getHours();
        
        const checkList = [];
        if (data.listenCount > 0) checkList.push('first_sound');
        if (userLikes.length > 0) checkList.push('first_heart');
        if (data.shareCount > 0) checkList.push('first_signal');
        if (data.listenCount >= 10) checkList.push('moment_10');
        if (data.listenCount >= 100) checkList.push('moment_100');
        if (userLikes.length >= 50) checkList.push('heart_50');
        if (data.shareCount >= 10) checkList.push('signal_10');
        if (daysSinceJoin >= 30) checkList.push('loyal_30');
        if (daysSinceJoin >= 100) checkList.push('family_100');
        if (currentHour >= 2 && currentHour <= 4) checkList.push('night_owl');
        if (currentHour >= 6 && currentHour <= 8) checkList.push('early_bird');
        if (tracks.length > 0 && userLikes.length >= tracks.length) checkList.push('archive_master');
        
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
  }, [user, userLikes.length, tracks.length]);

  // 🏆 [티어 계산]
  const membership = useMemo(() => {
    const days = Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000);
    if (days >= 100) return { name: "Family", color: "text-purple-400", bg: "bg-purple-400/10", icon: Moon };
    if (days >= 30) return { name: "Regular", color: "text-[#004aad]", bg: "bg-[#004aad]/10", icon: Sun };
    if (days >= 7) return { name: "Friend", color: "text-green-400", bg: "bg-green-400/10", icon: Sparkles };
    return { name: "Hello", color: "text-zinc-500", bg: "bg-white/5", icon: Ghost };
  }, [userProfile?.firstJoin]);

  // 🔊 [핵심] 잠금화면 앨범아트 주입 (최적화 버전)
  const updateMediaMetadata = useCallback(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const artworkUrl = currentTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17";
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'Unframe Project UP',
        artwork: [
          { src: artworkUrl, sizes: '96x96',   type: 'image/png' },
          { src: artworkUrl, sizes: '128x128', type: 'image/png' },
          { src: artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        ]
      });

      // 재생 상태 동기화
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      // 시스템 컨트롤러 연결
      navigator.mediaSession.setActionHandler('play', () => playTrack());
      navigator.mediaSession.setActionHandler('pause', () => pauseTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => playTrack((currentTrackIdx - 1 + tracks.length) % tracks.length));
      navigator.mediaSession.setActionHandler('nexttrack', () => playTrack((currentTrackIdx + 1) % tracks.length));
    }
  }, [currentTrack, currentTrackIdx, tracks.length, isPlaying]);

  const handleToggleLike = async (e, trackId) => {
    e.stopPropagation();
    if (!user) return;
    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);
    if (userLikes.includes(trackId)) {
      await deleteDoc(likeDoc);
    } else {
      await setDoc(likeDoc, { likedAt: Date.now() });
      setToastMessage("아카이브에 기록되었습니다 💗");
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  // 🚀 [공유/복사 기능 최종 안정화]
  const handleShare = async (e, item, type = 'track') => {
    if (e) e.stopPropagation();
    if (user && type === 'track') updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { shareCount: increment(1) });

    const shareUrl = window.location.origin + window.location.pathname; 
    const shareTitle = type === 'reward' ? `UP 성취: ${item.title}` : `Unframe 아티팩트: ${item.title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: "Unframe에서 새로운 소리를 발견해 보세요.", url: shareUrl });
        return;
      } catch (err) {}
    }

    // 클립보드 강제 복사 로직 (Legacy 지원)
    try {
      const copyArea = document.createElement("textarea");
      copyArea.value = shareUrl;
      copyArea.style.position = "fixed";
      copyArea.style.opacity = "0";
      document.body.appendChild(copyArea);
      copyArea.focus();
      copyArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(copyArea);
      
      if(success) {
        setCopiedId(type === 'reward' ? 'reward' : item.id);
        setToastMessage("링크가 복사되었습니다 ✨");
        setTimeout(() => { setCopiedId(null); setToastMessage(null); }, 3000);
      }
    } catch (err) {
      setAuthError("복사에 실패했습니다.");
    }
  };

  const playTrack = async (idx) => {
    const audio = audioRef.current;
    if (!audio) return;
    const targetIdx = idx !== undefined ? idx : currentTrackIdx;
    const targetTrack = tracks[targetIdx];
    if (!targetTrack) return;
    const directUrl = getDirectLink(targetTrack.audioUrl);
    if (audio.src !== directUrl) { audio.src = directUrl; audio.load(); }
    if (idx !== undefined) setCurrentTrackIdx(idx);
    setIsPlaying(true);
    try { 
      await audio.play(); 
      updateMediaMetadata(); // 재생 시점에 확실히 주입
    } catch (e) { setIsPlaying(false); }
  };

  const pauseTrack = () => { setIsPlaying(false); audioRef.current?.pause(); navigator.mediaSession.playbackState = "paused"; };
  const togglePlay = () => isPlaying ? pauseTrack() : playTrack();

  // 🖼️ [리사이징 업로드] 512x512 압축 후 업로드
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingImg(true);
    try {
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressedBlob);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
      const result = await response.json();
      if (result.success) {
        setNewTrack(prev => ({ ...prev, image: result.data.url }));
      }
    } catch (err) { setAuthError("업로드 실패"); } finally { setIsUploadingImg(false); }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setIsUploadingProfile(true);
    try {
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressedBlob);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
      const result = await response.json();
      if (result.success) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { profileImg: result.data.url });
    } catch (err) { setAuthError("업로드 실패"); } finally { setIsUploadingProfile(false); }
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tracks'), { ...newTrack, createdAt: Date.now() });
      setNewTrack({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '' });
      setToastMessage("공간에 소리가 배포되었습니다 🚀");
    } catch (err) { setAuthError("권한 오류"); }
  };

  const closeGuide = async () => { setShowGuide(false); if (user) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { hasSeenGuide: true }); };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] overflow-x-hidden relative">
      <audio 
        ref={audioRef} 
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} 
        onDurationChange={(e) => setDuration(e.currentTarget.duration)} 
        onEnded={() => playTrack((currentTrackIdx + 1) % tracks.length)} 
        onWaiting={() => setIsBuffering(true)} 
        onPlaying={() => { setIsBuffering(false); updateMediaMetadata(); }} 
        onPlay={() => { if(user) updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { listenCount: increment(1), lastActive: Date.now() }); }} 
        playsInline 
      />
      
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#004aad] z-[110] origin-left" style={{ scaleX }} />

      {/* --- 네비게이션 --- */}
      <header className={`fixed top-0 w-full z-[100] transition-all duration-500 ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/5' : 'py-10'}`}>
        <div className="container mx-auto px-8 flex justify-between items-end">
          <div className="group cursor-pointer" onClick={() => setView('gallery')}>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#004aad] transition-colors">Unframe<span className="text-[#004aad]">.</span></h1>
            <p className={subTitle + " text-[10px] mt-1 hidden lg:block"}>Reactive Art Collective</p>
          </div>
          <nav className="flex items-center gap-4 lg:gap-10">
             <button onClick={() => setView('gallery')} className={`text-[11px] font-black uppercase tracking-widest ${view === 'gallery' ? 'text-[#004aad]' : 'opacity-30'}`}>Exhibit</button>
             <button onClick={() => setView('library')} className={`text-[11px] font-black uppercase tracking-widest ${view === 'library' ? 'text-[#004aad]' : 'opacity-30'}`}>Archive</button>
             <button onClick={() => setShowGuide(true)} className="p-2 text-zinc-600 hover:text-[#004aad] transition-all"><HelpCircle className="w-4 h-4" /></button>
             {isAdmin && <button onClick={() => setView('admin')} className={`text-[11px] font-black uppercase tracking-widest ${view === 'admin' ? 'text-[#004aad]' : 'opacity-30'}`}>Console</button>}
          </nav>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* [Hero Section] */}
            <section className="h-screen flex flex-col justify-center items-center relative px-8 overflow-hidden">
               <div className="absolute inset-0 z-0"><motion.div animate={{ scale: isPlaying ? [1, 1.2, 1] : 1, opacity: isPlaying ? [0.1, 0.2, 0.1] : 0.1 }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[95vw] bg-[#004aad] blur-[150px] rounded-full" /></div>
               <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 text-center">
                 <span className={subTitle + " text-sm mb-10 block"}>Listening Gallery Unit</span>
                 <h2 className={`${h1Title} text-[18vw] lg:text-[14rem] italic-outline`}>Reactive<br/><span className="not-italic text-[#004aad]">Sonic</span></h2>
                 <div className="flex items-center justify-center gap-4 mt-8 opacity-40"><div className="w-12 h-[1px] bg-white" /><span className="text-[10px] font-black uppercase tracking-widest">{tracks.length} Artifacts Digitized</span><div className="w-12 h-[1px] bg-white" /></div>
               </motion.div>
               <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-16 left-1/2 -translate-x-1/2 opacity-20"><ArrowDown className="w-6 h-6" /></motion.div>
            </section>

            <section className="py-60 bg-[#fdfbf7] text-black relative z-20 shadow-[0_-50px_100px_rgba(0,0,0,0.5)]">
               <div className="container mx-auto px-8 grid lg:grid-cols-12 gap-20">
                  <div className="lg:col-span-7"><span className="text-[#004aad] text-[10px] font-black uppercase tracking-[0.4em] mb-6 block">Philosophy</span><h2 className="text-[12vw] lg:text-[8rem] font-black uppercase tracking-tighter leading-[0.8] mb-12">Listening is<br/><span className="text-[#004aad]">Building</span></h2></div>
                  <div className="lg:col-span-5 flex flex-col justify-end space-y-10"><p className="text-2xl lg:text-3xl font-medium leading-tight text-zinc-800">우리는 소리를 통해 보이지 않는 구조를 설계합니다.</p><p className="text-lg text-zinc-500 font-light leading-relaxed italic border-l-4 border-zinc-200 pl-8">"전시장의 잔향은 일상에서 아티팩트로 다시 피어납니다. Unframe은 틀을 깨고 나온 소리가 당신의 일상을 재구성하는 통로입니다."</p></div>
               </div>
            </section>

            <section className="py-60 px-8 container mx-auto">
              <div className="mb-24 flex justify-between items-end border-b border-white/5 pb-12"><div><h3 className={subTitle}>Archive Collections</h3><p className="text-6xl lg:text-[8rem] font-black uppercase mt-6 italic italic-outline tracking-tighter leading-none">Sound Artifacts</p></div></div>
              <div className="grid grid-cols-1 gap-6">
                {tracks.map((track, idx) => (
                  <motion.div key={track.id} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} onClick={() => setSelectedTrack(track)} className={`${glass} p-10 lg:p-14 rounded-[4rem] flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all border-white/5 relative`}>
                    <div className="flex items-center gap-12 relative z-10"><span className="text-6xl lg:text-7xl font-thin italic text-white/5 group-hover:text-[#004aad]/30 transition-colors">{(idx + 1).toString().padStart(2, '0')}</span><div className="space-y-3"><h4 className="text-4xl lg:text-8xl font-black uppercase group-hover:italic transition-all duration-700 tracking-tighter leading-none">{track.title}</h4><div className="flex items-center gap-4"><p className="text-[11px] text-zinc-500 font-bold tracking-[0.5em] uppercase">{track.artist}</p><button onClick={(e) => handleShare(e, track, 'track')} className="p-3 opacity-0 group-hover:opacity-100 hover:text-[#004aad] transition-all bg-white/5 rounded-full"><Share2 className="w-4 h-4" /></button></div></div></div>
                    <div className="flex items-center gap-8 relative z-10">
                      <button onClick={(e) => handleToggleLike(e, track.id)} className={`transition-all ${userLikes.includes(track.id) ? 'text-red-500 scale-125' : 'text-white/20 hover:text-white'}`}><Heart className={`w-8 h-8 ${userLikes.includes(track.id) ? 'fill-current' : ''}`} /></button>
                      <div onClick={(e) => { e.stopPropagation(); if (currentTrackIdx === idx && isPlaying) pauseTrack(); else playTrack(idx); }} className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full border border-white/10 flex items-center justify-center transition-all ${currentTrackIdx === idx && isPlaying ? 'bg-[#004aad] border-[#004aad] shadow-2xl' : 'bg-white/5 group-hover:bg-white group-hover:text-black shadow-2xl'}`}>{currentTrackIdx === idx && isPlaying ? (isBuffering ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : <Pause className="w-8 h-8 fill-current" />) : <Play className="w-8 h-8 fill-current ml-1.5" />}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* [Section 4] Streaming Connect */}
            <section className="py-60 px-8 bg-black">
               <div className="container mx-auto text-center space-y-24">
                  <div className="space-y-6">
                     <span className={subTitle}>Streaming Connection</span>
                     <h2 className={`${h1Title} text-[8vw] lg:text-[7.5rem] leading-none`}>Carry the<br/><span className="text-[#004aad]">Vibe Outside</span></h2>
                  </div>
                  <div className="flex flex-col lg:flex-row justify-center gap-12 max-w-5xl mx-auto w-full">
                     <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-16 rounded-[4rem] bg-zinc-900/50 border border-white/5 hover:border-red-600 transition-all group flex flex-col items-center gap-8">
                        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Play className="w-10 h-10 fill-white text-white" /></div>
                        <p className="text-2xl font-black uppercase tracking-tighter">YouTube Music</p>
                     </a>
                     <a href="https://spotify.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-16 rounded-[4rem] bg-zinc-900/50 border border-white/5 hover:border-green-500 transition-all group flex flex-col items-center gap-8">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Disc className="w-10 h-10 text-black fill-black" /></div>
                        <p className="text-2xl font-black uppercase tracking-tighter">Spotify</p>
                     </a>
                  </div>
               </div>
            </section>

            <footer className="py-40 bg-[#fdfbf7] text-black border-t border-zinc-200 px-8 relative z-30">
               <div className="container mx-auto grid lg:grid-cols-4 gap-24 lg:gap-10 opacity-80">
                  <div className="space-y-10"><h1 className="text-5xl font-black uppercase tracking-tighter text-[#004aad]">Unframe<span className="text-black">.</span></h1><p className="text-[11px] font-black uppercase leading-loose text-zinc-400">© 2026 UNFRAME ART COLLECTIVE.</p></div>
                  <div className="space-y-8"><p className="text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> VISIT US</p><ul className="text-sm font-bold opacity-60"><li>서울특별시 종로구 인사동4길 17, 108호</li></ul></div>
                  <div className="space-y-8"><p className="text-[12px] font-black uppercase tracking-widest text-[#004aad] flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[#004aad] rounded-full" /> SYSTEM</p><ul className="text-sm font-bold opacity-80 underline"><li onClick={() => setView('admin')} className="cursor-pointer">Console</li></ul></div>
               </div>
            </footer>
          </motion.div>
        )}

        {/* --- [Sonic Identity Card] Archive View --- */}
        {view === 'library' && (
          <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-40 px-8 container mx-auto pb-40 min-h-screen relative z-20">
             <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
                <div className="lg:col-span-4 space-y-8">
                  <motion.div className={`${glass} p-12 rounded-[5rem] text-center space-y-10 relative border-white/20 shadow-2xl shadow-[#004aad]/10`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#004aad] opacity-30 shadow-[0_0_20px_#004aad]" />
                    <div className="relative inline-block">
                      <div className="w-40 h-40 bg-zinc-900 rounded-full mx-auto flex items-center justify-center shadow-2xl transition-transform duration-700 overflow-hidden border-4 border-white/10 relative group/profile">
                        {isUploadingProfile ? <Loader2 className="w-10 h-10 animate-spin text-[#004aad]" /> : (userProfile?.profileImg ? <img src={userProfile.profileImg} className="w-full h-full object-cover" alt="profile" /> : <User className="w-14 h-14 text-white/10" />)}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/profile:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity"><Camera className="w-6 h-6 mb-2" /><span className="text-[10px] font-black uppercase">Change</span><input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={isUploadingProfile} /></label>
                      </div>
                      <div className={`absolute -bottom-2 -right-2 px-6 py-2 rounded-full ${membership.bg} ${membership.color} text-[11px] font-black uppercase border border-white/10 shadow-2xl flex items-center gap-2`}>
                        {React.createElement(membership.icon, { className: "w-4 h-4" })} {membership.name}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2"><h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">너는 지금 {membership.name}야</h2><p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">함께한 지 {Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000) + 1}일째의 여행</p></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 border-t border-white/10 pt-10">
                      <div className="space-y-1"><Music className="w-4 h-4 mx-auto text-indigo-400"/><p className="text-[8px] font-black text-zinc-600 uppercase">순간</p><p className="text-xl font-black text-white">{userProfile?.listenCount || 0}</p></div>
                      <div className="space-y-1"><Heart className="w-4 h-4 mx-auto text-red-400"/><p className="text-[8px] font-black text-zinc-600 uppercase">하트</p><p className="text-xl font-black text-white">{userLikes.length}</p></div>
                      <div className="space-y-1"><Share2 className="w-4 h-4 mx-auto text-blue-400"/><p className="text-[8px] font-black text-zinc-600 uppercase">신호</p><p className="text-xl font-black text-white">{userProfile?.shareCount || 0}</p></div>
                      <div className="space-y-1"><Zap className="w-4 h-4 mx-auto text-yellow-400"/><p className="text-[8px] font-black text-zinc-600 uppercase">연속</p><p className="text-xl font-black text-white">{Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000) + 1}</p></div>
                    </div>
                    <button onClick={() => signOut(auth)} className="text-[9px] font-black uppercase underline opacity-20 hover:opacity-100 mt-10">Sign Out</button>
                  </motion.div>
                  
                  {/* [Sticker Book] - 설명 밝기 최대화(White) */}
                  <div className={`${glass} p-12 rounded-[5rem] space-y-10 border-white/10`}>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-4 text-zinc-400"><Archive className="w-4 h-4 text-[#004aad]" /> Sticker Book</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(STICKER_LIBRARY).map(([key, data]) => {
                        const isActive = userProfile.rewards?.includes(key);
                        return (
                          <div key={key} className={`aspect-square rounded-2xl flex items-center justify-center border transition-all duration-700 ${isActive ? 'border-[#004aad] bg-gradient-to-br from-[#004aad]/20 to-indigo-500/10 text-white shadow-[0_0_15px_rgba(0,74,173,0.3)]' : 'border-white/5 opacity-10'} relative group/badge`}>
                            <data.icon className={`w-6 h-6 ${isActive ? data.color : ''}`} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-5 bg-[#0a0a0a] border border-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-all scale-95 group-hover/badge:scale-100 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                               <p className={isActive ? data.color : 'text-[#004aad]'} style={{fontSize: '12px'}}>{data.title}</p>
                               <p className="text-white mt-1.5 font-bold leading-relaxed lowercase opacity-100">{data.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-16">
                   <section className={`${glass} p-12 rounded-[5rem] space-y-10 border-[#004aad]/20`}>
                      <div className="space-y-6"><div className="flex items-center gap-4"><span className="px-5 py-2 rounded-full bg-[#004aad]/20 text-[#004aad] text-[10px] font-black uppercase tracking-widest border border-[#004aad]/30 shadow-[0_0_15px_rgba(0,74,173,0.2)]">오늘의 UP 놀이</span>{userProfile?.listenCount > 0 && <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-3 h-3"/> 오늘도 들러줘서 고마워 💙</span>}</div><h3 className="text-4xl font-black uppercase italic tracking-tighter leading-none text-white">오늘 노래 1번 듣기</h3></div>
                      <div className="pt-8 border-t border-white/5 flex items-center gap-6"><div className="w-16 h-16 rounded-3xl bg-white/5 flex flex-col items-center justify-center border border-white/10 shadow-xl"><p className="text-[8px] font-black uppercase opacity-40">Rank</p><p className="text-2xl font-black italic tracking-tighter text-white">#3</p></div><p className="text-sm font-medium text-zinc-400">너는 지금 <span className="text-white font-black italic">조용히 자주 오는 사람들</span> 중 3번째야 🌙</p></div>
                   </section>
                   <section className="space-y-12">
                      <h2 className={`${h1Title} text-7xl lg:text-[9rem] tracking-tighter`}>My<br/>Hearts</h2>
                      <div className="grid gap-6">
                        {tracks.filter(t => userLikes.includes(t.id)).map(t => (
                          <div key={t.id} onClick={() => setSelectedTrack(t)} className={`${glass} p-12 rounded-[4rem] flex justify-between items-center group cursor-pointer border-white/5 hover:bg-[#004aad]/5 transition-all`}><div className="flex items-center gap-10"><div className="w-20 h-20 rounded-[2rem] overflow-hidden shadow-2xl"><img src={t.image} className="w-full h-full object-cover" alt="" /></div><div className="space-y-2"><p className="text-4xl font-black uppercase tracking-tighter leading-none">{t.title}</p><p className="text-[11px] font-bold text-[#004aad] tracking-[0.2em] uppercase">{t.artist}</p></div></div><div className="flex items-center gap-4"><button onClick={(e) => handleShare(e, t, 'track')} className="p-4 opacity-0 group-hover:opacity-100 hover:text-[#004aad] transition-all bg-white/5 rounded-full"><Share2 className="w-5 h-5" /></button><Heart className="w-10 h-10 fill-red-500 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" /></div></div>
                        ))}
                      </div>
                   </section>
                </div>
             </div>
          </motion.div>
        )}

        {/* --- [Console View] --- */}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-40 px-8 container mx-auto pb-40 relative z-20 min-h-screen">
             <div className="grid lg:grid-cols-12 gap-24">
              <div className="lg:col-span-8 space-y-16"><h2 className={h1Title + " text-8xl lg:text-[10rem]"}>Console</h2>
                {!isAdmin ? (<div className={glass + " p-32 rounded-[6rem] text-center space-y-10"}><ShieldCheck className="w-24 h-24 mx-auto text-[#004aad]" /><button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white text-black px-20 py-6 rounded-full font-black uppercase text-sm tracking-widest shadow-2xl">Verify Admin</button></div>) 
                : (<div className="space-y-6">{tracks.map(t => (<div key={t.id} className={`${glass} p-10 px-16 rounded-[4rem] flex justify-between items-center group`}><p className="font-black uppercase tracking-tight text-3xl">{t.title}</p><button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', t.id))} className="p-6 text-red-500/20 hover:text-red-500 transition-colors bg-red-500/5 rounded-full"><Trash2 className="w-8 h-8" /></button></div>))}</div>)}
              </div>
              {isAdmin && (
                <div className="lg:col-span-4"><div className="bg-indigo-600 p-16 rounded-[6rem] text-black shadow-2xl">
                    <form onSubmit={handleAddTrack} className="space-y-8">
                       <input required placeholder="TITLE" value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-black uppercase outline-none focus:border-black text-xl" />
                       <input required placeholder="ARTIST" value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-black uppercase outline-none focus:border-black text-xl" />
                       <div className="space-y-4">
                         <div className="relative"><input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className={`p-8 rounded-[3rem] border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-4`}>{isUploadingImg ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10" />}<span className="text-xs font-black uppercase tracking-widest text-center">Jacket Image<br/>(512x512 Auto-Fit)</span></div></div>
                         {newTrack.image && <div className="w-full aspect-square rounded-[3rem] overflow-hidden border-2 border-black shadow-2xl"><img src={newTrack.image} className="w-full h-full object-cover" alt="preview" /></div>}
                       </div>
                       <input required placeholder="AUDIO SOURCE (URL)" value={newTrack.audioUrl} onChange={e => setNewTrack({...newTrack, audioUrl: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-black outline-none focus:border-black" />
                       <textarea placeholder="DESCRIPTION" value={newTrack.description} onChange={e => setNewTrack({...newTrack, description: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-3 font-medium text-sm outline-none focus:border-black h-32 resize-none" />
                       <button type="submit" disabled={isUploadingImg} className="w-full bg-black text-white py-8 mt-10 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl disabled:opacity-50">Sync Artifact</button>
                    </form>
                </div></div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- [Floating Player] --- */}
      <AnimatePresence>
      {currentTrack && view !== 'admin' && (
        <motion.div initial={{ y: 150 }} animate={{ y: 0 }} exit={{ y: 150 }} transition={{ type: "spring", stiffness: 150, damping: 20 }} className="fixed bottom-10 left-0 w-full z-[200] px-4 lg:px-8 flex justify-center pointer-events-none">
          <div className={`${glass} w-full max-w-5xl p-6 px-8 lg:px-16 rounded-full flex flex-col lg:flex-row items-center gap-6 lg:gap-16 pointer-events-auto border-white/20 shadow-2xl relative group/player`}>
            <div className="flex items-center gap-8 min-w-0 flex-1">
              <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 relative shadow-2xl group cursor-pointer" onClick={() => setSelectedTrack(currentTrack)}>
                <img src={currentTrack.image} className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`} alt="" />
                <div className={`absolute inset-0 bg-[#004aad]/20 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />
              </div>
              <div className="truncate pr-4 flex-1"><p className="text-2xl font-black uppercase truncate tracking-tighter leading-none">{currentTrack.title}</p><div className="flex items-center gap-4 mt-3"><p className="text-[13px] text-[#004aad] font-bold uppercase tracking-[0.2em]">{currentTrack.artist}</p>{isPlaying && <div className="flex gap-1 h-3 items-end"><span className="w-1 bg-[#004aad] animate-[wave_0.8s_infinite]" /><span className="w-1 bg-[#004aad] animate-[wave_1.2s_infinite]" /><span className="w-1 bg-[#004aad] animate-[wave_1.0s_infinite]" /></div>}</div></div>
              <div className="flex items-center gap-4">
                <button onClick={() => playTrack((currentTrackIdx - 1 + tracks.length) % tracks.length)} className="p-2 text-zinc-600 hover:text-white transition-colors"><SkipBack className="w-7 h-7 fill-current" /></button>
                <button onClick={togglePlay} className="w-16 h-16 lg:w-20 lg:h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl">{isPlaying ? (isBuffering ? <Loader2 className="w-8 h-8 animate-spin" /> : <Pause className="w-8 h-8 fill-current" />) : <Play className="w-8 h-8 fill-current ml-1.5" />}</button>
                <button onClick={() => playTrack((currentTrackIdx + 1) % tracks.length)} className="p-2 text-zinc-600 hover:text-white transition-colors"><SkipForward className="w-7 h-7 fill-current" /></button>
              </div>
            </div>
            <div className="flex items-center gap-8 w-full lg:w-[350px] px-4 lg:px-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0">
               <div className="flex-1 flex flex-col gap-2">
                 <div className="flex justify-between text-[10px] font-black uppercase opacity-30 tracking-widest"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                 <div className="h-2 bg-white/10 rounded-full relative overflow-hidden group/bar"><div className="absolute inset-y-0 left-0 bg-[#004aad] rounded-full" style={{ width: `${(currentTime/duration)*100}%` }} /><input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value); }} className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" /></div>
               </div>
               <div className="flex items-center gap-5 ml-2">
                 <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-white transition-colors">{isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}</button>
                 <button onClick={(e) => handleShare(e, currentTrack, 'track')} className="text-zinc-600 hover:text-[#004aad] transition-all"><Share2 className="w-5 h-5" /></button>
                 <button onClick={(e) => handleToggleLike(e, currentTrack.id)} className={`ml-2 transition-all ${userLikes.includes(currentTrack.id) ? 'text-red-500 scale-110' : 'text-zinc-600 hover:text-white'}`}><Heart className={`w-7 h-7 ${userLikes.includes(currentTrack.id) ? 'fill-current' : ''}`} /></button>
               </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- [Reward Celebrate Popup] --- */}
      <AnimatePresence>
        {newReward && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setNewReward(null)}>
            <motion.div initial={{ scale: 0.8, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 100 }} className={`${glass} w-full max-w-md rounded-[5rem] p-12 text-center space-y-12 border-white/20`} onClick={e => e.stopPropagation()}>
              <div className="space-y-4"><Star className="w-16 h-16 text-yellow-400 mx-auto animate-bounce" /><h2 className="text-4xl font-black uppercase italic tracking-tighter text-[#004aad]">New Sticker!</h2><p className="text-sm text-zinc-500 font-bold uppercase tracking-[0.3em]">축하합니다! 새로운 기록이 해제되었습니다.</p></div>
              <div className="bg-zinc-950 p-8 rounded-[3rem] border border-white/5 space-y-6 relative"><div className="w-24 h-24 bg-white/5 rounded-3xl mx-auto flex items-center justify-center border border-white/10"><newReward.icon className="w-12 h-12 text-[#004aad]" /></div><div className="space-y-2"><h4 className="text-2xl font-black uppercase tracking-tighter text-white">[{newReward.title}]</h4><p className="text-white mt-1 font-bold leading-relaxed lowercase">{newReward.desc}</p></div></div>
              <div className="flex flex-col gap-4">
                <button onClick={(e) => handleShare(e, newReward, 'reward')} className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-[#004aad] hover:text-white transition-all shadow-2xl flex items-center justify-center gap-3">{copiedId === 'reward' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} SNS 공유하기</button>
                <button onClick={() => setNewReward(null)} className="text-[10px] font-black uppercase text-zinc-500">나중에 하기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed bottom-32 left-1/2 z-[500] bg-[#004aad] text-white px-8 py-4 rounded-full font-black uppercase text-[11px] shadow-2xl flex items-center gap-3"><CheckCircle2 className="w-4 h-4" /> {toastMessage}</motion.div>
        )}
        {authError && (<motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed top-24 left-1/2 z-[500] bg-red-600 px-8 py-5 rounded-3xl font-black uppercase text-[11px] flex items-center gap-4 shadow-2xl"><AlertCircle className="w-4 h-4" /> {authError} <button onClick={() => setAuthError(null)} className="ml-6 opacity-60">X</button></motion.div>)}
      </AnimatePresence>

      {/* [Track Detail Modal] */}
      <AnimatePresence>
        {selectedTrack && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 lg:p-20" onClick={() => setSelectedTrack(null)}>
            <motion.div initial={{ scale: 0.95, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 50 }} className={`${glass} w-full max-w-7xl rounded-[6rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl relative`} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedTrack(null)} className="absolute top-12 right-12 p-6 rounded-full bg-white/5 hover:bg-[#004aad] text-white transition-all z-50 shadow-2xl"><X className="w-8 h-8" /></button>
              <div className="lg:w-1/2 h-[50vh] lg:h-auto bg-zinc-950 flex items-center justify-center relative group"><img src={selectedTrack.image} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-1000" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" /></div>
              <div className="lg:w-1/2 p-12 lg:p-32 flex flex-col justify-between">
                <div className="space-y-16"><div><span className={subTitle + " text-sm mb-6 block"}>{selectedTrack.artist}</span><h3 className={h1Title + " text-6xl lg:text-[7.5rem] tracking-tighter leading-[0.8]"}>{selectedTrack.title}</h3></div><p className="text-xl lg:text-3xl text-white font-bold leading-relaxed italic border-l-8 border-[#004aad] pl-12">"{selectedTrack.description || 'Reactive audio artifact derived from coordinates.'}"</p></div>
                <div className="flex gap-8 items-center mt-20">
                  <button onClick={() => { const idx = tracks.findIndex(t => t.id === selectedTrack.id); playTrack(idx); setSelectedTrack(null); }} className="flex-1 bg-[#004aad] text-white py-10 rounded-[3rem] font-black uppercase text-sm hover:bg-white hover:text-black transition-all shadow-2xl flex items-center justify-center gap-4"><Play className="w-6 h-6 fill-current" /> Initialize Artifact</button>
                  <button onClick={(e) => handleShare(e, selectedTrack, 'track')} className="p-12 rounded-[3rem] border border-white/10 hover:text-[#004aad] transition-all"><Share2 className="w-10 h-10" /></button>
                  <button onClick={(e) => handleToggleLike(e, selectedTrack.id)} className={`p-12 rounded-[3rem] border border-white/10 ${userLikes.includes(selectedTrack.id) ? 'text-red-500 bg-red-500/5' : 'text-zinc-500 hover:text-white'} transition-all`}><Heart className={`w-10 h-10 ${userLikes.includes(selectedTrack.id) ? 'fill-current' : ''}`} /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .italic-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.1); color: transparent; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wave { 0%, 100% { height: 4px; } 50% { height: 12px; } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #050505; } ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #004aad; }
        input[type=range]::-webkit-slider-thumb { appearance: none; height: 16px; width: 16px; border-radius: 50%; background: white; cursor: pointer; }
      `}</style>
    </div>
  );
}