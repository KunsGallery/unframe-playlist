import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  signInWithCustomToken
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
  Trash2, LogIn, ShieldCheck, AlertCircle,
  Loader2, Music, X, Heart, Award, User, Smartphone, Globe, Share,
  Volume2, VolumeX, Volume1
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// --- [🎨 디자인 시스템] ---
const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('gallery'); 
  const [selectedTrack, setSelectedTrack] = useState(null);
  
  const [tracks, setTracks] = useState([]);
  const [userLikes, setUserLikes] = useState([]);
  const [userProfile, setUserProfile] = useState({ listenCount: 0, rewards: [] });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', image: '', description: '', tag: 'Artifact', audioUrl: '' });
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const audioIntensityRef = useRef(0);

  // 1. [🔐 인증 로직]
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (isMounted) {
        if (!u) {
          try { await signInAnonymously(auth); } catch (e) { console.error(e); }
        }
        setUser(u);
        setIsAdmin(u && u.email && ADMIN_EMAILS.includes(u.email));
        setLoading(false);
      }
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  // 2. [📊 데이터 실시간 동기화]
  useEffect(() => {
    if (!user) return;
    const tracksRef = collection(db, 'artifacts', appId, 'public', 'data', 'tracks');
    const unsubTracks = onSnapshot(query(tracksRef), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTracks(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });

    const likesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'likes');
    const unsubLikes = onSnapshot(likesRef, (snap) => {
      setUserLikes(snap.docs.map(d => d.id));
    });

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
      else setDoc(profileRef, { listenCount: 0, rewards: [], firstJoin: Date.now() });
    });

    return () => { unsubTracks(); unsubLikes(); unsubProfile(); };
  }, [user]);

  // 3. [🔊 모바일 대응 핵심 오디오 제어]
  const currentTrack = tracks[currentTrackIdx] || null;

  const unlockAudio = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
    }
  };

  // 모바일에서 끊김 없는 재생을 위해 Audio 객체에 직접 접근하는 함수
  const playTrack = async (idx) => {
    unlockAudio();
    const audio = audioRef.current;
    if (!audio) return;

    const targetIdx = idx !== undefined ? idx : currentTrackIdx;
    const targetTrack = tracks[targetIdx];
    if (!targetTrack) return;

    // 만약 다른 곡이라면 src를 먼저 교체
    if (audio.src !== targetTrack.audioUrl) {
      audio.src = targetTrack.audioUrl;
      audio.load();
    }

    if (idx !== undefined) setCurrentTrackIdx(idx);
    setIsPlaying(true);

    try {
      // 사용자의 클릭 이벤트 핸들러 내에서 즉시 호출되어야 함
      await audio.play();
    } catch (e) {
      console.error("Mobile Play Blocked:", e);
      setIsPlaying(false);
    }
  };

  const pauseTrack = () => {
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  const togglePlay = () => {
    if (isPlaying) pauseTrack();
    else playTrack();
  };

  // 볼륨 동기화
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // 4. [✨ 배경 애니메이션]
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const createParticles = () => {
      particles = [];
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          baseR: Math.random() * 300 + 200, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
          color: i % 2 === 0 ? 'rgba(0, 74, 173, 0.15)' : 'rgba(120, 40, 200, 0.1)'
        });
      }
    };
    const draw = () => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const intensity = isPlaying ? 0.4 : 0;
      audioIntensityRef.current = intensity;
      particles.forEach(p => {
        const currentR = p.baseR * (1 + audioIntensityRef.current);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentR);
        grad.addColorStop(0, p.color); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2); ctx.fill();
        p.x += p.vx * (1 + intensity * 6); p.y += p.vy * (1 + intensity * 6);
        if (p.x < -currentR) p.x = canvas.width + currentR;
        if (p.x > canvas.width + currentR) p.x = -currentR;
        if (p.y < -currentR) p.y = canvas.height + currentR;
        if (p.y > canvas.height + currentR) p.y = -currentR;
      });
      animationFrameId = requestAnimationFrame(draw);
    };
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; createParticles(); };
    handleResize(); draw();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', () => setScrolled(window.scrollY > 50));
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize); };
  }, [isPlaying]);

  // --- [🚀 핸들러 로직] ---
  const handleToggleLike = async (e, trackId) => {
    e.stopPropagation();
    if (!user) return;
    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);
    if (userLikes.includes(trackId)) await deleteDoc(likeDoc);
    else await setDoc(likeDoc, { likedAt: Date.now() });
  };

  const recordPlayHistory = async () => {
    if (!user || !tracks[currentTrackIdx]) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    await updateDoc(profileRef, { listenCount: increment(1) });
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tracks'), { ...newTrack, createdAt: Date.now() });
      setNewTrack({ title: '', artist: '', image: '', description: '', tag: 'Artifact', audioUrl: '' });
    } catch (err) { setAuthError("Artifact 등록 실패"); }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const likedTracks = tracks.filter(t => userLikes.includes(t.id));

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] overflow-x-hidden relative" onClick={unlockAudio}>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      
      {/* 🔊 네이티브 오디오 (가장 안쪽 레벨에서 상시 유지) */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => playTrack((currentTrackIdx + 1) % tracks.length)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onPlay={recordPlayHistory}
        onError={() => setAuthError("재생 실패: 링크가 올바른지 확인하세요.")}
        playsInline
      />

      <header className={`fixed top-0 w-full z-[100] transition-all duration-500 ${scrolled ? 'py-4 bg-black/40 backdrop-blur-xl border-b border-white/5' : 'py-10'}`}>
        <div className="container mx-auto px-8 flex justify-between items-end">
          <div className="group cursor-pointer" onClick={() => setView('gallery')}>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#004aad] transition-colors">Unframe<span className="text-[#004aad]">.</span></h1>
            <p className={subTitle + " text-[10px] mt-1"}>Reactive Art Collective</p>
          </div>
          <nav className="flex items-center gap-10">
             <button onClick={() => setView('gallery')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${view === 'gallery' ? 'text-[#004aad]' : 'opacity-30 hover:opacity-100'}`}>Gallery</button>
             <button onClick={() => setView('library')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${view === 'library' ? 'text-[#004aad]' : 'opacity-30 hover:opacity-100'}`}>Archive</button>
             <button onClick={() => setView('admin')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${view === 'admin' ? 'text-[#004aad]' : 'opacity-30 hover:opacity-100'}`}>Console</button>
          </nav>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* --- Gallery View --- */}
        {view === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-20 pt-40 px-8 pb-40">
            <section className="container mx-auto mb-32 text-center lg:text-left">
              <span className={subTitle + " text-sm mb-6 block"}>Sound as Invisible Architecture</span>
              <h2 className={`${h1Title} text-[15vw] lg:text-[12rem] italic-outline`}>Artifacts<br/><span className="not-italic text-[#004aad]">Launch</span></h2>
            </section>
            <section className="container mx-auto grid grid-cols-1 gap-6">
              {tracks.map((track, idx) => (
                <div key={track.id} onClick={() => setSelectedTrack(track)} className={`${glass} p-8 lg:p-12 rounded-[3.5rem] flex items-center justify-between group cursor-pointer hover:scale-[1.01] transition-transform`}>
                  <div className="flex items-center gap-10">
                    <span className="text-5xl font-thin italic text-white/5 group-hover:text-[#004aad]/20 transition-colors">{(idx + 1).toString().padStart(2, '0')}</span>
                    <div className="space-y-2">
                      <h4 className="text-4xl lg:text-7xl font-black uppercase group-hover:italic transition-all duration-500">{track.title}</h4>
                      <p className="text-xs text-zinc-500 font-bold tracking-[0.4em] uppercase">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <button onClick={(e) => handleToggleLike(e, track.id)} className={`transition-all ${userLikes.includes(track.id) ? 'text-red-500 scale-125' : 'text-white/20 hover:text-white'}`}><Heart className={`w-6 h-6 ${userLikes.includes(track.id) ? 'fill-current' : ''}`} /></button>
                    <div onClick={(e) => { e.stopPropagation(); if (currentTrackIdx === idx && isPlaying) pauseTrack(); else playTrack(idx); }} className={`w-16 h-16 rounded-full border border-white/10 flex items-center justify-center transition-all ${currentTrackIdx === idx && isPlaying ? 'bg-[#004aad] border-[#004aad]' : 'bg-white/5 group-hover:bg-white group-hover:text-black'}`}>
                      {currentTrackIdx === idx && isPlaying ? (isBuffering ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Pause className="w-6 h-6 fill-current" />) : <Play className="w-6 h-6 fill-current ml-1" />}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </motion.div>
        )}

        {/* --- Archive (Library) View --- */}
        {view === 'library' && (
          <motion.div key="library" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-20 pt-40 px-8 container mx-auto pb-40">
            {user?.isAnonymous ? (
              <div className="max-w-2xl mx-auto py-20 text-center"><div className={`${glass} p-16 rounded-[4rem]`}><Smartphone className="w-16 h-16 mx-auto mb-8 text-[#004aad]" /><h2 className="text-4xl font-black uppercase italic tracking-tighter">Sync Archive</h2><button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="mt-12 bg-white text-black px-16 py-6 rounded-full font-black uppercase text-xs hover:bg-[#004aad] hover:text-white transition-all shadow-2xl">Connect Google Account</button></div></div>
            ) : (
              <div className="grid lg:grid-cols-12 gap-16">
                <div className="lg:col-span-4 space-y-8"><div className={`${glass} p-10 rounded-[3rem] text-center`}><div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl"><User className="w-10 h-10 text-white" /></div><h2 className="text-2xl font-black uppercase italic tracking-tighter">{user?.displayName}</h2><div className="grid grid-cols-2 gap-4 mt-12 border-t border-white/5 pt-10"><div><p className="text-[9px] font-black text-zinc-600 uppercase">Records</p><p className="text-3xl font-black text-[#004aad]">{userProfile.listenCount || 0}</p></div><div><p className="text-[9px] font-black text-zinc-600 uppercase">Collection</p><p className="text-3xl font-black text-white">{userLikes.length}</p></div></div><button onClick={() => signOut(auth)} className="mt-10 text-[10px] uppercase underline opacity-30 hover:opacity-100 transition-opacity">Sign Out</button></div></div>
                <div className="lg:col-span-8 space-y-12"><h2 className={`${h1Title} text-7xl lg:text-9xl`}>Personal Library</h2><div className="grid gap-4">
                  {likedTracks.map(t => (
                    <div key={t.id} onClick={() => setSelectedTrack(t)} className={`${glass} p-8 rounded-[2.5rem] flex justify-between items-center group cursor-pointer`}><p className="text-2xl font-black uppercase">{t.title} <span className="text-xs opacity-30 ml-4">{t.artist}</span></p><button onClick={(e) => handleToggleLike(e, t.id)} className="p-4 text-red-500"><Heart className="w-6 h-6 fill-current" /></button></div>
                  ))}
                  {likedTracks.length === 0 && <div className="py-20 text-center opacity-20"><Music className="w-12 h-12 mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-xs">수집된 아티팩트가 없습니다.</p></div>}
                </div></div>
              </div>
            )}
          </motion.div>
        )}

        {/* --- Console View --- */}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-40 px-8 container mx-auto pb-40 relative z-20">
             <div className="grid lg:grid-cols-12 gap-20">
              <div className="lg:col-span-8 space-y-12"><h2 className={h1Title + " text-7xl lg:text-9xl"}>Console</h2>
                {!isAdmin ? (<div className={glass + " p-20 rounded-[4rem] text-center"}><ShieldCheck className="w-16 h-16 mx-auto mb-8 text-[#004aad]" /><button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-[#004aad] text-white px-16 py-6 rounded-full font-black uppercase text-xs hover:bg-white hover:text-black transition-all">Verify via Google</button></div>) 
                : (<div className="space-y-4">{tracks.map(t => (
                  <div key={t.id} className={`${glass} p-6 px-10 rounded-3xl flex justify-between items-center`}><p className="font-black uppercase tracking-tight text-xl">{t.title}</p>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', t.id))} className="p-3 text-red-500/30 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}</div>)}
              </div>
              {isAdmin && (
                <div className="lg:col-span-4"><div className="bg-indigo-600 p-12 rounded-[4rem] text-black shadow-2xl"><h3 className="text-4xl font-black uppercase italic mb-10 leading-none">Deployment</h3>
                    <form onSubmit={handleAddTrack} className="space-y-6">
                       <input required placeholder="TITLE" value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 font-black uppercase outline-none focus:border-black" />
                       <input required placeholder="ARTIST" value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 font-black uppercase outline-none focus:border-black" />
                       <input required placeholder="AUDIO URL (?dl=1)" value={newTrack.audioUrl} onChange={e => setNewTrack({...newTrack, audioUrl: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 font-black outline-none focus:border-black" />
                       <input placeholder="IMAGE URL" value={newTrack.image} onChange={e => setNewTrack({...newTrack, image: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 font-black outline-none focus:border-black" />
                       <textarea placeholder="DESCRIPTION" value={newTrack.description} onChange={e => setNewTrack({...newTrack, description: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 font-medium text-sm outline-none focus:border-black h-24 resize-none" />
                       <button type="submit" className="w-full bg-black text-white py-5 mt-6 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-900 transition-all">Artifact Sync</button>
                    </form>
                </div></div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Floating Player Bar --- */}
      <AnimatePresence>
      {currentTrack && (
        <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }} className="fixed bottom-10 left-0 w-full z-[200] px-4 lg:px-8 flex justify-center pointer-events-none">
          <div className={`${glass} w-full max-w-4xl p-5 px-6 lg:px-10 rounded-full flex flex-col lg:flex-row items-center gap-4 lg:gap-10 pointer-events-auto border-white/20 shadow-2xl relative`}>
            <div className="flex items-center gap-6 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 relative shadow-2xl group cursor-pointer" onClick={() => setSelectedTrack(currentTrack)}>
                <img src={currentTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17"} className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`} alt="" />
              </div>
              <div className="truncate pr-4 flex-1">
                <p className="text-lg font-black uppercase truncate leading-none">{currentTrack.title}</p>
                <p className="text-[11px] text-[#004aad] font-bold uppercase tracking-[0.2em] mt-1">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => playTrack((currentTrackIdx - 1 + tracks.length) % tracks.length)} className="p-2 text-zinc-600 hover:text-white transition-colors"><SkipBack className="w-5 h-5 fill-current" /></button>
                <button onClick={togglePlay} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl">
                  {isPlaying ? (isBuffering ? <Loader2 className="w-6 h-6 animate-spin" /> : <Pause className="w-6 h-6 fill-current" />) : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
                <button onClick={() => playTrack((currentTrackIdx + 1) % tracks.length)} className="p-2 text-zinc-600 hover:text-white transition-colors"><SkipForward className="w-5 h-5 fill-current" /></button>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full lg:w-64 px-4 lg:px-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0">
               <div className="flex-1 flex flex-col gap-1">
                 <div className="flex justify-between text-[8px] font-black uppercase opacity-40"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                 <div className="h-1.5 bg-white/10 rounded-full relative overflow-hidden group">
                   <div className="absolute inset-y-0 left-0 bg-[#004aad] rounded-full" style={{ width: `${(currentTime/duration)*100}%` }} />
                   <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value); }} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                 </div>
               </div>
               <div className="flex items-center gap-3 ml-2">
                 <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-white">
                   {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                 </button>
                 <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 h-1 bg-white/10 rounded-full appearance-none accent-[#004aad]" />
                 <button onClick={(e) => handleToggleLike(e, currentTrack.id)} className={`ml-4 transition-all ${userLikes.includes(currentTrack.id) ? 'text-red-500' : 'text-zinc-600'}`}><Heart className={`w-5 h-5 ${userLikes.includes(currentTrack.id) ? 'fill-current' : ''}`} /></button>
               </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- Detail Modal --- */}
      <AnimatePresence>
        {selectedTrack && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setSelectedTrack(null)}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className={`${glass} w-full max-w-6xl rounded-[5rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl`} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedTrack(null)} className="absolute top-10 right-10 p-4 rounded-full bg-white/5 hover:bg-[#004aad] text-white transition-all z-50"><X className="w-6 h-6" /></button>
              <div className="lg:w-1/2 h-96 lg:h-auto bg-zinc-950 flex items-center justify-center relative"><img src={selectedTrack.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"} className="w-full h-full object-cover opacity-50" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" /></div>
              <div className="lg:w-1/2 p-12 lg:p-24 flex flex-col justify-between">
                <div className="space-y-12"><div><span className={subTitle + " text-sm"}>{selectedTrack.artist}</span><h3 className={h1Title} style={{ fontSize: '4.5rem' }}>{selectedTrack.title}</h3></div><p className="text-xl lg:text-2xl text-zinc-400 font-light leading-relaxed italic border-l-4 border-[#004aad] pl-10 opacity-70">"{selectedTrack.description || 'Sonic artifact derived from exhibition coordinates.'}"</p></div>
                <div className="flex gap-4 items-center">
                  <button onClick={() => { const idx = tracks.findIndex(t => t.id === selectedTrack.id); playTrack(idx); setSelectedTrack(null); }} className="flex-1 bg-[#004aad] text-white py-8 rounded-[2rem] font-black uppercase text-sm mt-12 hover:bg-white hover:text-black transition-all shadow-2xl">Launch Artifact</button>
                  <button onClick={(e) => handleToggleLike(e, selectedTrack.id)} className={`p-8 rounded-[2rem] border border-white/10 mt-12 ${userLikes.includes(selectedTrack.id) ? 'text-red-500 bg-red-500/5' : 'text-zinc-500'}`}><Heart className={`w-6 h-6 ${userLikes.includes(selectedTrack.id) ? 'fill-current' : ''}`} /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{authError && (<motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }} className="fixed top-24 left-1/2 z-[500] bg-red-600 px-8 py-4 rounded-3xl font-black uppercase text-[10px] flex items-center gap-4 shadow-2xl"><AlertCircle className="w-4 h-4" /> {authError} <button onClick={() => setAuthError(null)} className="ml-4 opacity-50">X</button></motion.div>)}</AnimatePresence>

      <style>{`
        .italic-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.15); color: transparent; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #050505; } ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: #004aad; }
        input[type=range]::-webkit-slider-thumb { appearance: none; height: 12px; width: 12px; border-radius: 50%; background: white; box-shadow: 0 0 10px rgba(0,74,173,0.5); cursor: pointer; }
      `}</style>
    </div>
  );
}