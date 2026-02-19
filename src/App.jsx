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
  query
} from 'firebase/firestore';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Plus, Trash2, LogIn, LogOut, ShieldCheck, AlertCircle,
  Loader2, Music, RefreshCw
} from 'lucide-react';

// --- [🔥 필수] Firebase 설정 및 환경 변수 처리 ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? (typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config)
  : {
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'unframe-playlist-v1';

// 관리자 이메일 목록
const ADMIN_EMAILS = ['gallerykuns@gmail.com', 'cybog2004@gmail.com', 'sylove887@gmail.com']; 

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('user');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [authError, setAuthError] = useState(null);
  const canvasRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [exhibitionInfo, setExhibitionInfo] = useState({
    heroTitle: "Breaking Frames",
    heroSubtitle: "Project UP",
    heroDescription: "전시의 공기는 캔버스를 넘어 당신의 이어폰 속으로 흐릅니다.",
    tagline: "Resonance Builder"
  });

  const [newTrack, setNewTrack] = useState({
    title: '', artist: '', duration: '', image: '', description: '', tag: 'Ambient'
  });

  // 1. [RULE 3] 인증 로직 강화
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        if (auth.currentUser) {
          if (isMounted) {
            setUser(auth.currentUser);
            setLoading(false);
          }
          return;
        }

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          try {
            await signInAnonymously(auth);
          } catch (anonErr) {
            console.error("Anonymous Auth Error:", anonErr);
            if (isMounted) {
              setAuthError(
                anonErr.code === 'auth/admin-restricted-operation' 
                ? "Firebase 콘솔에서 '익명 로그인' 기능을 활성화해야 합니다." 
                : "인증 서버 응답 오류가 발생했습니다."
              );
            }
          }
        }
      } catch (err) {
        console.error("Critical Auth Error:", err);
        if (isMounted) setAuthError("인증 초기화 중 오류가 발생했습니다.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        setIsAdmin(currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email));
        if (currentUser) {
          setLoading(false);
          setAuthError(null);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. [RULE 1, 2] 데이터 동기화
  useEffect(() => {
    if (!user) return;

    const tracksCollection = collection(db, 'artifacts', appId, 'public', 'data', 'tracks');
    const unsubscribeTracks = onSnapshot(query(tracksCollection), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTracks(data);
    }, (err) => {
      console.error("Tracks Sync Error:", err);
      if (err.code === 'permission-denied') {
        setAuthError("데이터베이스 접근 권한이 없습니다.");
      }
    });

    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsDoc, (docSnap) => {
      if (docSnap.exists()) setExhibitionInfo(docSnap.data());
    }, (err) => {
      console.error("Settings Sync Error:", err);
    });

    return () => {
      unsubscribeTracks();
      unsubscribeSettings();
    };
  }, [user]);

  // 3. 배경 애니메이션
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let offset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `rgba(0, 74, 173, ${isPlaying ? 0.08 : 0.04})`;
      
      for (let i = 0; i < canvas.height; i += 12) {
        const y = (i + offset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      offset += isPlaying ? 0.8 : 0.2;
      animationFrameId = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    draw();
    window.addEventListener('resize', handleResize);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isPlaying]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setAuthError(null);
    } catch (err) {
      console.error("Login Error:", err);
      setAuthError("로그인 실패: 팝업이 차단되었거나 도메인이 승인되지 않았습니다.");
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      signInAnonymously(auth).catch(() => {});
    });
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const tracksRef = collection(db, 'artifacts', appId, 'public', 'data', 'tracks');
      await addDoc(tracksRef, { ...newTrack, createdAt: Date.now() });
      setNewTrack({ title: '', artist: '', duration: '', image: '', description: '', tag: 'Ambient' });
    } catch (err) {
      setAuthError("트랙 추가 권한이 없습니다.");
    }
  };

  const handleDeleteTrack = async (id) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', id));
    } catch (err) {
      setAuthError("삭제 권한이 없습니다.");
    }
  };

  const currentTrack = tracks[currentTrackIdx] || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-[#004aad]" />
        <p className="text-[10px] font-black tracking-widest uppercase opacity-40 animate-pulse">Initializing Terminal...</p>
      </div>
    );
  }

  if (!user && authError) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-white">Connection Interrupted</h2>
        <div className="max-w-md bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 mb-8 backdrop-blur-xl">
          <p className="text-xs text-zinc-400 leading-relaxed uppercase tracking-wide">
            {authError}
          </p>
          <div className="pt-4 border-t border-white/5 text-[10px] text-zinc-500 text-left space-y-2">
            <p className="font-bold text-indigo-400">해결 방법:</p>
            <p>1. Firebase Console &gt; Authentication &gt; Sign-in method에서 '익명' 사용 설정</p>
            <p>2. Authentication &gt; Settings &gt; Authorized domains에 현재 도메인 추가</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-black uppercase text-[10px] hover:bg-indigo-500 hover:text-white transition-all shadow-xl"
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] selection:text-white overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-10"></div>

      {/* Navigation */}
      <header className={`fixed top-0 w-full z-[100] transition-all duration-700 ${scrolled ? 'py-4 bg-black/80 backdrop-blur-2xl border-b border-white/5' : 'py-10'}`}>
        <div className="container mx-auto px-8 flex justify-between items-end">
          <div className="group cursor-pointer" onClick={() => setView('user')}>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#004aad] transition-colors">Unframe<span className="text-[#004aad]">.</span></h1>
            <p className="text-[9px] font-bold tracking-[0.4em] uppercase text-zinc-500 mt-1">{exhibitionInfo.tagline}</p>
          </div>
          <nav className="flex items-center gap-8">
             <button onClick={() => setView('user')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${view === 'user' ? 'text-[#004aad]' : 'opacity-40 hover:opacity-100'}`}>Gallery</button>
             <button onClick={() => setView('admin')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${view === 'admin' ? 'text-[#004aad]' : 'opacity-40 hover:opacity-100'}`}>Console</button>
          </nav>
        </div>
      </header>

      {view === 'admin' ? (
        <div className="min-h-screen pt-40 pb-40 px-8 container mx-auto relative z-20">
          {!user || user.isAnonymous ? (
            <div className="max-w-md mx-auto py-24 bg-white/5 border border-white/10 rounded-[3rem] text-center space-y-8 backdrop-blur-3xl">
              <LogIn className="w-12 h-12 text-[#004aad] mx-auto" />
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Admin Access</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest leading-relaxed px-10">승인된 관리자 이메일로 로그인해야<br/>데이터를 편집할 수 있습니다.</p>
              </div>
              <button onClick={handleLogin} className="bg-white text-black px-12 py-5 rounded-full font-black uppercase text-[10px] hover:bg-[#004aad] hover:text-white transition-all active:scale-95 shadow-xl">
                Google 계정으로 로그인
              </button>
            </div>
          ) : !isAdmin ? (
            <div className="max-w-md mx-auto py-24 bg-red-500/5 border border-red-500/10 rounded-[3rem] text-center space-y-8 backdrop-blur-3xl">
              <ShieldCheck className="w-12 h-12 text-red-500 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Access Denied</h2>
                <p className="text-xs text-red-500/60 uppercase tracking-widest px-10 break-all">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="text-[10px] font-black uppercase text-white/40 hover:text-white underline underline-offset-8 transition-all">다른 계정으로 로그인</button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-between items-end mb-20 border-b border-white/10 pb-10">
                <div>
                  <h2 className="text-7xl font-black tracking-tighter uppercase italic leading-none">Console</h2>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">{user.email}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-[10px] font-black uppercase border border-white/10 px-6 py-4 rounded-xl hover:bg-red-600 transition-colors">Sign Out</button>
              </div>

              <div className="grid lg:grid-cols-12 gap-16">
                <div className="lg:col-span-7 space-y-16">
                  <section>
                    <h3 className="text-[10px] font-black uppercase text-zinc-600 mb-8 flex items-center gap-4">
                      <span className="h-[1px] w-8 bg-zinc-800"></span> Live Tracks
                    </h3>
                    <div className="grid gap-2">
                      {tracks.map(t => (
                        <div key={t.id} className="bg-white/5 p-5 rounded-2xl flex justify-between items-center group border border-transparent hover:border-[#004aad]/30 hover:bg-[#004aad]/5 transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden">
                              <img src={t.image || "https://via.placeholder.com/100"} className="w-full h-full object-cover opacity-60" alt="" />
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-tight">{t.title}</p>
                              <p className="text-[9px] text-zinc-500 uppercase mt-1 font-bold tracking-widest">{t.artist}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteTrack(t.id)} className="text-zinc-600 hover:text-red-500 p-2 transition-colors"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-5">
                   <div className="bg-[#004aad] p-10 text-black rounded-[2.5rem] sticky top-32 shadow-2xl shadow-[#004aad]/20 animate-in slide-in-from-right-4 duration-700">
                     <h3 className="text-4xl font-black italic uppercase leading-none mb-10">Deploy Artifact</h3>
                     <form onSubmit={handleAddTrack} className="space-y-6">
                       {[
                         { label: 'Name', key: 'title' },
                         { label: 'Artist', key: 'artist' },
                         { label: 'Image URL', key: 'image' }
                       ].map(field => (
                         <div key={field.key} className="space-y-1">
                           <label className="text-[9px] font-black uppercase opacity-60">{field.label}</label>
                           <input 
                             required={field.key !== 'image'} 
                             value={newTrack[field.key]} 
                             onChange={e => setNewTrack({...newTrack, [field.key]: e.target.value})} 
                             className="w-full bg-black/10 border-b-2 border-black/20 p-2 focus:border-black outline-none font-bold uppercase transition-colors" 
                           />
                         </div>
                       ))}
                       <button type="submit" className="w-full bg-black text-white py-6 mt-8 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-900 transition-all active:scale-95">Deploy Track</button>
                     </form>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <main className="relative z-20">
          <section className="min-h-screen pt-40 pb-20 px-8 flex flex-col justify-end">
            <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
              <div className="lg:col-span-8">
                <span className="inline-block animate-bounce text-[#004aad] text-xs font-black tracking-[0.5em] uppercase mb-4">{exhibitionInfo.heroSubtitle}</span>
                <h2 className="text-[12vw] lg:text-[11rem] font-black leading-[0.85] tracking-[-0.05em] uppercase italic italic-outline">
                  {exhibitionInfo.heroTitle.split(' ').map((word, i) => (
                    <React.Fragment key={i}>
                      {i % 2 === 0 ? <span className="not-italic text-[#004aad]">{word} </span> : <span>{word} </span>}
                      {i === 0 && <br className="hidden lg:block"/>}
                    </React.Fragment>
                  ))}
                </h2>
              </div>
              <div className="lg:col-span-4 space-y-8">
                <p className="text-xl font-light text-zinc-400 leading-relaxed italic border-l-2 border-[#004aad] pl-6">"{exhibitionInfo.heroDescription}"</p>
                <div className="flex gap-4 items-center">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${user ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`}></span>
                    {user ? "Cloud Sync Active" : "Connecting..."}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-40 px-8 bg-gradient-to-b from-transparent to-black">
            <div className="container mx-auto">
              <div className="flex items-center gap-6 mb-20">
                <div className="h-[1px] flex-1 bg-white/10"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[1em] text-zinc-700">Artifact List</h3>
                <div className="h-[1px] flex-1 bg-white/10"></div>
              </div>
              
              <div className="grid grid-cols-1">
                {tracks.map((track, idx) => (
                  <div 
                    key={track.id}
                    onClick={() => {setCurrentTrackIdx(idx); setIsPlaying(true);}}
                    className="group relative py-14 border-b border-white/5 cursor-pointer flex items-center justify-between transition-all hover:bg-[#004aad]/5 px-8 rounded-2xl"
                  >
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-0 group-hover:opacity-20 transition-all duration-700 pointer-events-none z-0">
                      <img src={track.image || "https://via.placeholder.com/400"} className="w-full h-full object-cover scale-50 group-hover:scale-100 rotate-12 group-hover:rotate-0 transition-transform duration-1000 blur-2xl" alt="" />
                    </div>
                    
                    <div className="flex items-center gap-16 relative z-10">
                      <span className="text-5xl font-thin italic text-zinc-800 transition-colors group-hover:text-[#004aad]">{(idx + 1).toString().padStart(2, '0')}</span>
                      <div className="space-y-2">
                        <h4 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase group-hover:italic transition-all duration-500">{track.title}</h4>
                        <div className="flex items-center gap-4">
                          <p className="text-xs text-zinc-500 font-bold tracking-[0.3em] uppercase">{track.artist}</p>
                          <span className="w-1 h-1 bg-[#004aad] rounded-full"></span>
                          <span className="text-[9px] font-black uppercase text-[#004aad]/50 tracking-widest">{track.tag || 'Audio'}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`w-16 h-16 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 ${currentTrackIdx === idx && isPlaying ? 'bg-[#004aad] border-[#004aad] scale-110 shadow-lg shadow-[#004aad]/20' : 'group-hover:bg-white group-hover:text-black group-hover:scale-105'}`}>
                      {currentTrackIdx === idx && isPlaying ? <Pause className="w-7 h-7 fill-current text-white" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                    </div>
                  </div>
                ))}
                {tracks.length === 0 && !authError && (
                  <div className="py-40 text-center space-y-4">
                    <Music className="w-12 h-12 mx-auto text-zinc-800 animate-pulse" />
                    <p className="text-zinc-800 font-black uppercase text-2xl italic tracking-tighter">Waiting for artifacts...</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Persistent Player */}
      {view === 'user' && currentTrack && (
        <div className="fixed bottom-10 left-0 w-full z-[200] px-8 pointer-events-none animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="container mx-auto flex justify-center">
            <div className="w-full max-w-2xl bg-zinc-900/90 backdrop-blur-3xl border border-white/10 rounded-full p-2.5 pl-8 pr-5 flex items-center justify-between pointer-events-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-6 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 relative flex-shrink-0 shadow-inner">
                    <img src={currentTrack.image || "https://via.placeholder.com/100"} className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`} alt="" />
                    <div className="absolute inset-0 bg-black/20"></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase truncate tracking-tighter">{currentTrack.title}</p>
                    <p className="text-[10px] text-[#004aad] font-bold uppercase truncate tracking-widest">{currentTrack.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentTrackIdx(prev => (prev - 1 + tracks.length) % tracks.length)} className="p-3 text-zinc-500 hover:text-white transition-colors"><SkipBack className="w-4 h-4 fill-current" /></button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  <button onClick={() => setCurrentTrackIdx(prev => (prev + 1) % tracks.length)} className="p-3 text-zinc-500 hover:text-white transition-colors"><SkipForward className="w-4 h-4 fill-current" /></button>
                </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-black py-40 border-t border-white/5 text-center relative z-20">
         <div className="max-w-xs mx-auto space-y-8">
           <h4 className="text-[10px] font-black tracking-[1em] text-zinc-800 uppercase italic">UNFRAME</h4>
           <p className="text-[10px] text-zinc-600 font-bold uppercase leading-relaxed tracking-widest opacity-40">Breaking frames, Building resonance. The air of the exhibition flows beyond the canvas.</p>
           <div className="pt-8 border-t border-white/5">
             <p className="text-[9px] text-zinc-900 font-bold uppercase italic">© 2026 UNFRAME ART COLLECTIVE. ALL RIGHTS RESERVED.</p>
           </div>
         </div>
      </footer>

      <style>{`
        .italic-outline { -webkit-text-stroke: 1px rgba(255,255,255,0.15); color: transparent; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #004aad; }
      `}</style>
    </div>
  );
}