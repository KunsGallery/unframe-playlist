import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Plus, Trash2, LogIn, LogOut, ShieldCheck, AlertCircle,
  Loader2, Music, X, Info, Heart, Award, User, Smartphone, Globe, Upload, FileAudio
} from 'lucide-react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';

// --- [🔥 Firebase 설정] ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? (typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config)
  : { /* 기본값 */ };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'unframe-playlist-v1';
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
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const audioIntensityRef = useRef(0);

  // 1. [🔐 인증 로직]
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!auth.currentUser) {
          await signInAnonymously(auth).catch(() => {});
        }
      } catch (err) { console.error(err); } 
      finally { if (isMounted) setLoading(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u);
        setIsAdmin(u && u.email && ADMIN_EMAILS.includes(u.email));
      }
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  // 2. [📊 데이터 동기화]
  useEffect(() => {
    if (!user) return;
    const tracksRef = collection(db, 'artifacts', appId, 'public', 'data', 'tracks');
    const unsubTracks = onSnapshot(query(tracksRef), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...doc.data() || d.data() }));
      setTracks(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    const likesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'likes');
    const unsubLikes = onSnapshot(query(likesRef), (snap) => {
      setUserLikes(snap.docs.map(d => d.id));
    });
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
      else setDoc(profileRef, { listenCount: 0, rewards: [], firstJoin: Date.now() });
    });
    return () => { unsubTracks(); unsubLikes(); unsubProfile(); };
  }, [user]);

  // 3. [🔊 오디오 비주얼라이저 엔진]
  const setupVisualizer = () => {
    if (audioContextRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    
    // Note: Cross-origin restriction might block Analyzer on YouTube/SoundCloud.
    // Works best with direct files from Firebase Storage.
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = audioCtx;
  };

  useEffect(() => {
    if (isPlaying) {
      setupVisualizer();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  }, [isPlaying]);

  // 4. [✨ 비주얼라이저 연동 배경 애니메이션]
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
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          baseR: Math.random() * 300 + 200,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          color: i % 2 === 0 ? 'rgba(0, 74, 173, 0.15)' : 'rgba(120, 40, 200, 0.1)'
        });
      }
    };

    const draw = () => {
      // 1. 오디오 데이터 분석
      let intensity = 0;
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
        intensity = sum / dataArrayRef.current.length / 255; // 0 ~ 1 사이 값
        audioIntensityRef.current = intensity;
      } else {
        audioIntensityRef.current = audioIntensityRef.current * 0.95; // 서서히 감소
      }

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        // 음악 강도에 따라 반지름과 속도 조절
        const currentR = p.baseR * (1 + audioIntensityRef.current * 0.5);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentR);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx * (1 + audioIntensityRef.current * 5);
        p.y += p.vy * (1 + audioIntensityRef.current * 5);

        if (p.x < -currentR) p.x = canvas.width + currentR;
        if (p.x > canvas.width + currentR) p.x = -currentR;
        if (p.y < -currentR) p.y = canvas.height + currentR;
        if (p.y > canvas.height + currentR) p.y = -currentR;
      });

      // 비주얼 그리드 라인
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.01 + audioIntensityRef.current * 0.05})`;
      for (let i = 0; i < canvas.width; i += 80) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    resize(); draw();
    window.addEventListener('resize', resize);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', resize); window.removeEventListener('scroll', handleScroll); };
  }, [isPlaying]);

  // --- [🚀 비즈니스 로직 핸들러] ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `audio/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error(error);
        setIsUploading(false);
        setAuthError("파일 업로드에 실패했습니다.");
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setNewTrack(prev => ({ ...prev, audioUrl: downloadURL }));
          setIsUploading(false);
          setUploadProgress(0);
        });
      }
    );
  };

  const handleToggleLike = async (e, trackId) => {
    e.stopPropagation();
    if (!user) return;
    const likeDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'likes', trackId);
    if (userLikes.includes(trackId)) await deleteDoc(likeDoc);
    else await setDoc(likeDoc, { likedAt: Date.now() });
  };

  const recordPlayHistory = async () => {
    if (!user || !currentTrack) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
    await updateDoc(profileRef, { listenCount: increment(1), lastPlayed: currentTrack.title });
    
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: [{ src: currentTrack.image || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }]
      });
    }
  };

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { setAuthError("로그인 실패"); }
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tracks'), { ...newTrack, createdAt: Date.now() });
    setNewTrack({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '' });
  };

  const currentTrack = tracks[currentTrackIdx] || null;
  const likedTracks = tracks.filter(t => userLikes.includes(t.id));
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#004aad]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] overflow-x-hidden relative">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-10 mix-blend-overlay"></div>

      {currentTrack && (
        <ReactPlayer
          url={currentTrack.audioUrl}
          playing={isPlaying}
          width="0" height="0"
          playsinline={true} 
          onProgress={(s) => setPlayed(s.played)}
          onDuration={setDuration}
          onStart={recordPlayHistory}
          onEnded={() => setCurrentTrackIdx(p => (p + 1) % tracks.length)}
          config={{ youtube: { playerVars: { origin: window.location.origin } } }}
        />
      )}

      {/* --- Navigation --- */}
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
        {/* Gallery View */}
        {view === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-20 pt-40 px-8 pb-40">
            <section className="container mx-auto mb-32">
              <span className={subTitle + " text-sm mb-6 block"}>Sound as Invisible Architecture</span>
              <h2 className={`${h1Title} text-[15vw] lg:text-[12rem] italic-outline`}>
                Sonic<br/><span className="not-italic text-[#004aad]">Artifacts</span>
              </h2>
            </section>

            <section className="container mx-auto grid grid-cols-1 gap-6">
              {tracks.map((track, idx) => (
                <motion.div key={track.id} whileHover={{ scale: 1.01 }} className={`${glass} p-8 lg:p-12 rounded-[3.5rem] flex items-center justify-between group cursor-pointer`} onClick={() => setSelectedTrack(track)}>
                  <div className="flex items-center gap-10 lg:gap-16">
                    <span className="text-5xl font-thin italic text-white/5 transition-colors group-hover:text-[#004aad]/20">{(idx + 1).toString().padStart(2, '0')}</span>
                    <div className="space-y-2">
                      <h4 className="text-4xl lg:text-7xl font-black uppercase group-hover:italic transition-all duration-500">{track.title}</h4>
                      <p className="text-xs text-zinc-500 font-bold tracking-[0.4em] uppercase">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <button onClick={(e) => handleToggleLike(e, track.id)} className={`transition-all ${userLikes.includes(track.id) ? 'text-red-500 scale-125' : 'text-white/20 hover:text-white'}`}>
                      <Heart className={`w-6 h-6 ${userLikes.includes(track.id) ? 'fill-current' : ''}`} />
                    </button>
                    <div onClick={(e) => { e.stopPropagation(); setCurrentTrackIdx(idx); setIsPlaying(true); }} className={`w-16 h-16 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 ${currentTrackIdx === idx && isPlaying ? 'bg-[#004aad] border-[#004aad]' : 'bg-white/5 group-hover:bg-white group-hover:text-black'}`}>
                      {currentTrackIdx === idx && isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </section>
          </motion.div>
        )}

        {/* My Archive View */}
        {view === 'library' && (
          <motion.div key="library" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-20 pt-40 px-8 container mx-auto pb-40">
            {user?.isAnonymous ? (
              <div className="max-w-2xl mx-auto py-20 text-center space-y-10">
                <div className={`${glass} p-16 rounded-[4rem]`}>
                  <Smartphone className="w-16 h-16 mx-auto mb-8 text-[#004aad]" />
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">Stay Connected</h2>
                  <p className="text-zinc-500 text-sm font-medium tracking-widest mt-6">로그인하면 어느 기기에서나 당신의 기록을 불러옵니다.</p>
                  <button onClick={handleLogin} className="mt-12 bg-white text-black px-16 py-6 rounded-full font-black uppercase text-xs hover:bg-[#004aad] hover:text-white transition-all">Connect Google</button>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-12 gap-16">
                <div className="lg:col-span-4 space-y-8">
                  <div className={`${glass} p-10 rounded-[3rem] text-center`}>
                    <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center"><User className="w-10 h-10 text-white" /></div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{user?.displayName}</h2>
                    <div className="grid grid-cols-2 gap-4 mt-12 border-t border-white/5 pt-10">
                      <div><p className="text-[9px] font-black text-zinc-600 uppercase">Records</p><p className="text-3xl font-black text-[#004aad]">{userProfile.listenCount || 0}</p></div>
                      <div><p className="text-[9px] font-black text-zinc-600 uppercase">Collection</p><p className="text-3xl font-black text-white">{userLikes.length}</p></div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-8 space-y-12">
                  <h2 className={`${h1Title} text-7xl lg:text-9xl`}>Personal<br/>Library</h2>
                  <div className="grid gap-4">
                    {likedTracks.map(t => (
                      <div key={t.id} className={`${glass} p-8 rounded-[2.5rem] flex justify-between items-center group`}>
                        <p className="text-2xl font-black uppercase">{t.title}</p>
                        <button onClick={(e) => handleToggleLike(e, t.id)} className="p-4 text-red-500"><Heart className="w-6 h-6 fill-current" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Admin Console with Storage Upload */}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-40 px-8 container mx-auto pb-40 relative z-20">
             <div className="grid lg:grid-cols-12 gap-20">
              <div className="lg:col-span-8 space-y-12">
                <h2 className={h1Title + " text-7xl lg:text-9xl"}>Console</h2>
                {!isAdmin ? (
                   <div className={glass + " p-20 rounded-[4rem] text-center"}>
                     <ShieldCheck className="w-16 h-16 mx-auto mb-8 text-[#004aad]" />
                     <button onClick={handleLogin} className="bg-[#004aad] text-white px-16 py-6 rounded-full font-black uppercase text-xs hover:bg-white hover:text-black transition-all">Verify Identity</button>
                   </div>
                ) : (
                  <div className="space-y-4">
                    {tracks.map(t => (
                      <div key={t.id} className={`${glass} p-6 px-10 rounded-3xl flex justify-between items-center`}>
                        <p className="font-black uppercase tracking-tight text-xl">{t.title}</p>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', t.id))} className="p-3 text-red-500/30 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="lg:col-span-4">
                  <div className="bg-indigo-600 p-12 rounded-[4rem] text-black shadow-2xl">
                    <h3 className="text-4xl font-black uppercase italic mb-10 leading-none">Artifact<br/>Deployment</h3>
                    <form onSubmit={handleAddTrack} className="space-y-6">
                       <input required placeholder="TITLE" value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 font-black uppercase outline-none" />
                       <input required placeholder="ARTIST" value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 font-black uppercase outline-none" />
                       
                       {/* Storage Upload UI */}
                       <div className="space-y-3 pt-4">
                         <label className="text-[9px] font-black uppercase tracking-widest block opacity-50">Audio Source</label>
                         <div className="relative group">
                           <input type="file" accept="audio/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isUploading} />
                           <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all ${isUploading ? 'bg-black/20 border-black/50' : 'bg-black/5 border-black/20 group-hover:border-black'}`}>
                             {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                             <span className="text-[10px] font-black uppercase">{isUploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload MP3/WAV'}</span>
                           </div>
                         </div>
                         <p className="text-[8px] font-bold opacity-40 uppercase">Or paste direct URL below:</p>
                         <input placeholder="https://..." value={newTrack.audioUrl} onChange={e => setNewTrack({...newTrack, audioUrl: e.target.value})} className="w-full bg-black/10 border-b-2 border-black/30 p-2 text-xs outline-none" />
                       </div>

                       <button type="submit" disabled={!newTrack.audioUrl || isUploading} className="w-full bg-black text-white py-6 mt-6 rounded-3xl font-black uppercase text-xs hover:bg-zinc-900 disabled:opacity-50 transition-all shadow-xl">Deploy</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Player with Visualizer Hint */}
      {currentTrack && (
        <motion.div initial={{ y: 120 }} animate={{ y: 0 }} className="fixed bottom-10 left-0 w-full z-[200] px-8 flex justify-center pointer-events-none">
          <div className={`${glass} w-full max-w-3xl p-5 px-10 rounded-full flex flex-col gap-3 pointer-events-auto border-white/20 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 min-w-0">
                <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 relative shadow-2xl group cursor-pointer" onClick={() => setSelectedTrack(currentTrack)}>
                  <img src={currentTrack.image || "https://via.placeholder.com/200"} className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`} />
                  <div className={`absolute inset-0 bg-[#004aad]/20 mix-blend-overlay transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                <div>
                  <p className="text-lg font-black uppercase truncate leading-none">{currentTrack.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-[10px] text-[#004aad] font-bold uppercase tracking-[0.2em]">{currentTrack.artist}</p>
                    {isPlaying && <span className="flex gap-0.5 items-end h-2 w-4"><span className="w-1 bg-[#004aad] animate-[wave_0.8s_ease-in-out_infinite]"></span><span className="w-1 bg-[#004aad] animate-[wave_1.1s_ease-in-out_infinite]"></span><span className="w-1 bg-[#004aad] animate-[wave_0.9s_ease-in-out_infinite]"></span></span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={(e) => handleToggleLike(e, currentTrack.id)} className={`p-2 transition-transform hover:scale-110 ${userLikes.includes(currentTrack.id) ? 'text-red-500' : 'text-zinc-600'}`}><Heart className={`w-6 h-6 ${userLikes.includes(currentTrack.id) ? 'fill-current' : ''}`} /></button>
                <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl">
                  {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Track Detail Modal */}
      <AnimatePresence>
        {selectedTrack && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setSelectedTrack(null)}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className={`${glass} w-full max-w-6xl rounded-[5rem] overflow-hidden flex flex-col lg:flex-row`} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedTrack(null)} className="absolute top-10 right-10 p-4 rounded-full bg-white/5 hover:bg-[#004aad] text-white transition-all z-50"><X className="w-6 h-6" /></button>
              <div className="lg:w-1/2 h-96 lg:h-auto bg-zinc-950">
                <img src={selectedTrack.image || "https://via.placeholder.com/800"} className="w-full h-full object-cover opacity-50" />
              </div>
              <div className="lg:w-1/2 p-12 lg:p-24 flex flex-col justify-between">
                <div className="space-y-12">
                  <div>
                    <span className={subTitle + " text-sm"}>{selectedTrack.artist}</span>
                    <h3 className={h1Title} style={{ fontSize: '4.5rem' }}>{selectedTrack.title}</h3>
                  </div>
                  <p className="text-xl text-zinc-400 font-light leading-relaxed italic border-l-4 border-[#004aad] pl-10 opacity-70">"{selectedTrack.description || 'Reactive audio artifact derived from exhibition coordinates.'}"</p>
                </div>
                <button onClick={() => { setCurrentTrackIdx(tracks.findIndex(t => t.id === selectedTrack.id)); setIsPlaying(true); setSelectedTrack(null); }} className="bg-[#004aad] text-white w-full py-8 rounded-[2rem] font-black uppercase text-sm mt-12 hover:bg-white hover:text-black transition-all">Launch Artifact</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .italic-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.15); color: transparent; }
        @keyframes wave { 0%, 100% { height: 2px; } 50% { height: 12px; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #004aad; }
      `}</style>
    </div>
  );
}