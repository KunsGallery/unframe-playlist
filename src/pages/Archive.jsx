import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Loader2, Camera, Music, Heart, Share2, Zap, 
  Archive as ArchiveIcon, Trophy, Medal, Waves, Calendar, 
  Star, Moon, Coffee, Ghost, LogIn, CheckCircle2, Target, 
  ArrowRight, Lock, Clock, MapPin, Repeat, Navigation, 
  Smartphone, Sparkles, Gift, Sunrise, Crown, BookOpen, Layers, Flame
} from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'; 

// 디자인 상수
const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2";

// 🚀 [좌측] Achievements Library (16종)
const ACHIEVEMENT_LIBRARY = {
  first_sound: { title: "첫 소리", desc: "아티팩트를 처음 활성화함", icon: Music, color: "#a78bfa", glow: "rgba(167, 139, 250, 0.5)" },
  moment_10: { title: "10번의 순간", desc: "10곡의 소리를 깊게 감상함", icon: Zap, color: "#fbbf24", glow: "rgba(251, 191, 36, 0.5)" },
  moment_100: { title: "심오한 감상자", desc: "100곡 이상의 소리를 기록함", icon: Trophy, color: "#fb7185", glow: "rgba(251, 113, 133, 0.5)" },
  heart_1: { title: "첫 하트", desc: "취향의 기록을 시작함", icon: Heart, color: "#f87171", glow: "rgba(248, 113, 113, 0.5)" },
  heart_50: { title: "취향 컬렉터", desc: "50개 이상의 아티팩트를 수집함", icon: Medal, color: "#f472b6", glow: "rgba(244, 114, 182, 0.5)" },
  signal_1: { title: "첫 신호", desc: "소리의 파동을 외부로 전달함", icon: Share2, color: "#34d399", glow: "rgba(52, 211, 153, 0.5)" },
  signal_10: { title: "신호의 대가", desc: "10회 이상 소리를 공유함", icon: Navigation, color: "#22d3ee", glow: "rgba(34, 211, 238, 0.5)" },
  loyal_7: { title: "단골 거주자", desc: "7일 동안 공간에 머무름", icon: Calendar, color: "#fb923c", glow: "rgba(251, 146, 60, 0.5)" },
  loyal_30: { title: "공간의 역사", desc: "30일 넘게 함께한 멤버", icon: Star, color: "#fef08a", glow: "rgba(254, 240, 138, 0.5)" },
  night_owl: { title: "심야의 동반자", desc: "새벽 2시, 소리에 귀 기울임", icon: Moon, color: "#818cf8", glow: "rgba(129, 140, 248, 0.5)" },
  early_bird: { title: "얼리 버드", desc: "아침의 시작을 소리와 함께함", icon: Coffee, color: "#f59e0b", glow: "rgba(245, 158, 11, 0.5)" },
  weekend_art: { title: "주말의 여유", desc: "주말의 공기를 소리로 채움", icon: Sparkles, color: "#c084fc", glow: "rgba(192, 132, 252, 0.5)" },
  repeater_3: { title: "다시 듣기", desc: "하나의 소리를 세 번 반복함", icon: Repeat, color: "#fb7185", glow: "rgba(251, 113, 133, 0.5)" },
  nfc_explorer: { title: "공간의 교감", desc: "NFC를 통해 공간과 연결됨", icon: Smartphone, color: "#2dd4bf", glow: "rgba(45, 212, 191, 0.5)" },
  long_voyage: { title: "긴 항해", desc: "1시간 이상 소리를 여행함", icon: Clock, color: "#94a3b8", glow: "rgba(148, 163, 184, 0.5)" },
  archive_master: { title: "완벽한 아카이브", desc: "모든 곡을 수집함", icon: Ghost, color: "#f4f4f5", glow: "rgba(255, 255, 255, 0.4)" }
};

// 🚀 [우측] Collective Library (초기멤버 스티커 포함)
const COLLECTIVE_LIBRARY = {
  eternal_origin: { title: "Eternal Signal: The Origin", desc: "UNFRAME의 시작을 함께한 위대한 개척자", icon: Flame, color: "#ef4444", shape: 'hex' },
  unframe_genesis: { title: "The Genesis", desc: "갤러리 정식 오픈 멤버", icon: Crown, color: "#fbbf24", shape: 'circle' },
  new_year_2026: { title: "2026 First Light", desc: "2026년 첫 해돋이 기록", icon: Sunrise, color: "#fb7185", shape: 'hex' },
  pioneer_26: { title: "Pioneer 26", desc: "프로젝트 초기 개척자", icon: Target, color: "#2dd4bf", shape: 'hex' },
  insadong_wave: { title: "Insadong First Wave", desc: "인사동 공간의 첫 번째 파동", icon: Waves, color: "#3b82f6", shape: 'circle' }
};

const Archive = ({ 
  user, userProfile, membership, userLikes, tracks, 
  handleShare, signOut, setSelectedTrack, db, appId,
  handleGoogleLogin, rankingTheme, allUsers 
}) => {
  const [activeTab, setActiveTab] = useState('hearts'); 
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [hoveredSticker, setHoveredSticker] = useState(null);

  const myRank = useMemo(() => {
      if (!user || !allUsers || allUsers.length === 0) return '?';
      const index = allUsers.findIndex(u => u.id === user.uid);
      return index === -1 ? allUsers.length + 1 : index + 1;
  }, [user, allUsers]);

  const totalUnlocked = useMemo(() => userProfile?.rewards?.length || 0, [userProfile]);
  const progressPercent = useMemo(() => Math.min((totalUnlocked / 100) * 100, 100), [totalUnlocked]);

  const profileBorderStyle = useMemo(() => {
    if (membership?.name === 'Family' || userProfile?.rewards?.includes('archive_master')) {
      return "before:absolute before:inset-[-6px] before:rounded-full before:bg-gradient-to-r before:from-[#a78bfa] before:via-[#fb7185] before:to-[#60a5fa] before:animate-spin-slow before:-z-10 shadow-[0_0_35px_rgba(167,139,250,0.4)]";
    }
    return "border-4 border-white/10";
  }, [membership, userProfile]);

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file || !user) return;
    setIsUploadingProfile(true);
    try {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = async (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = async () => {
            const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, (img.width - 512) / 2, (img.height - 512) / 2, 512, 512, 0, 0, 512, 512);
            const base64Data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
            const formData = new FormData(); formData.append("image", base64Data);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const result = await response.json();
            if (result.success) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { profileImg: result.data.url });
            setIsUploadingProfile(false);
        };
      };
    } catch (err) { setIsUploadingProfile(false); alert("업로드 실패"); } 
  };

  const StickerItem = ({ id, data, isActive, type }) => {
    const isHex = data.shape === 'hex';
    const isCelestial = type === 'achievement';

    return (
        <div 
            onMouseEnter={() => setHoveredSticker(id)}
            onMouseLeave={() => setHoveredSticker(null)}
            onClick={(e) => isActive && handleShare(e, { ...data, id }, 'reward')} 
            className={`relative aspect-square flex items-center justify-center transition-all duration-500 ${isActive ? 'cursor-pointer hover:scale-110' : 'opacity-40 hover:opacity-70'} group/badge`}
        >
            <div className={`w-full h-full flex items-center justify-center border-2 overflow-hidden transition-all duration-700
                ${isCelestial ? 'rounded-2xl bg-zinc-900/50' : (isHex ? 'hex-shape' : 'rounded-full')}
                ${isActive ? 'border-white/20' : 'border-white/5 bg-black/20'}`}
                style={{ 
                    boxShadow: (isActive && isCelestial) ? `0 0 20px ${data.glow}` : 'none',
                    background: (isActive && isCelestial) ? `radial-gradient(circle at center, ${data.glow} 0%, transparent 70%)` : ''
                }}
            >
                <data.icon className={`w-1/2 h-1/2 ${isActive ? '' : 'grayscale opacity-30'}`} style={{ color: isActive ? data.color : 'white' }} />
            </div>
            {!isActive && <Lock className="absolute w-4 h-4 text-white/20 z-10" />}
            <AnimatePresence>
                {hoveredSticker === id && (
                    <motion.div initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 z-[200] w-56 pointer-events-none">
                        <div className="bg-[#0c0c0e] border border-white/20 p-4 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] text-center backdrop-blur-3xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: isActive ? data.color : '#71717a' }}>{isActive ? 'Unlocked' : 'Locked Artifact'}</p>
                            <h4 className="text-sm font-black text-white mb-1 uppercase tracking-tight">{data.title}</h4>
                            <p className="text-[10px] leading-relaxed text-zinc-400 font-bold uppercase">{isActive ? data.desc : "아직 기록되지 않은 순간입니다."}</p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0c0c0e] border-r border-b border-white/20 rotate-45 -translate-y-1.5" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
  };

  // 🚀 [복구] 로그인이 아예 안 된 경우 보여줄 화면
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative z-30">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8 max-w-md">
          <h1 className={`${h1Title} text-6xl lg:text-8xl opacity-10`}>Private<br/>Archive</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs leading-relaxed">
            당신의 감상 기록과 수집한 아티팩트를 보관하려면<br/>공식 계정 연결이 필요합니다.
          </p>
          <button 
            onClick={handleGoogleLogin} 
            className="px-10 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-[#004aad] hover:text-white transition-all rounded-full shadow-2xl flex items-center gap-3 mx-auto"
          >
            <LogIn size={16} /> Connect Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 lg:pt-40 px-6 lg:px-8 container mx-auto pb-32 lg:pb-40 min-h-screen relative z-20 overflow-visible">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 overflow-visible">
        
        {/* Left: Profile & Achievements */}
        <div className="lg:col-span-4 space-y-6 lg:space-y-8 overflow-visible">
            <motion.div className={`${glass} p-8 lg:p-12 rounded-[4rem] text-center space-y-8 relative border-white/20 shadow-2xl`}>
                <div className="relative inline-block">
                    <div className={`w-32 h-32 lg:w-40 lg:h-40 bg-zinc-900 rounded-full mx-auto flex items-center justify-center relative transition-all duration-700 overflow-visible ${profileBorderStyle}`}>
                        <div className="w-full h-full rounded-full overflow-hidden relative z-10 bg-black flex items-center justify-center">
                            {userProfile?.profileImg ? <img src={userProfile.profileImg} className="w-full h-full object-cover" alt="profile" /> : <User className="w-10 h-10 lg:w-14 lg:h-14 text-white/10" />}
                            {!user?.isAnonymous && (
                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/profile:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity z-20">
                                    <Camera className="w-5 h-5 mb-1" /><input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={isUploadingProfile} />
                                </label>
                            )}
                        </div>
                    </div>
                    {membership && (
                      <div className={`absolute -bottom-2 -right-2 px-4 py-1.5 rounded-full ${membership.bg} ${membership.color} text-[9px] lg:text-[10px] font-black uppercase border border-white/10 shadow-2xl flex items-center gap-1.5 z-30`} style={{ color: membership.color, backgroundColor: membership.bg }}>
                          {React.createElement(membership.icon, { className: "w-3 h-3" })} {membership.name}
                      </div>
                    )}
                </div>
                
                <div className="space-y-4">
                    {user?.isAnonymous ? (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold uppercase tracking-tighter italic">Guest Collector</h2>
                            <button onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#004aad] hover:text-white transition-all shadow-xl mx-auto">
                              <LogIn size={14}/> Sign In Official
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h2 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter leading-none">{user?.displayName || "Collector"}</h2>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em]">No. {user?.uid?.slice(0, 8)}</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-4 gap-2 border-t border-white/10 pt-8">
                    <div className="space-y-1"><Music className="w-3 h-3 mx-auto text-indigo-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Listen</p><p className="text-lg font-black">{userProfile?.listenCount || 0}</p></div>
                    <div className="space-y-1"><Heart className="w-3 h-3 mx-auto text-red-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Saved</p><p className="text-lg font-black">{userLikes.length}</p></div>
                    <div className="space-y-1"><Share2 className="w-3 h-3 mx-auto text-blue-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Share</p><p className="text-lg font-black">{userProfile?.shareCount || 0}</p></div>
                    <div className="space-y-1"><Zap className="w-3 h-3 mx-auto text-yellow-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Rank</p><p className="text-lg font-black">#{myRank}</p></div>
                </div>
            </motion.div>

            {/* Achievements Section */}
            <div className={`${glass} p-8 lg:p-10 rounded-[3rem] space-y-6 border-white/10 overflow-visible shadow-2xl`}>
                <div className="flex justify-between items-center">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-zinc-400"><Medal className="w-3 h-3 text-[#a78bfa]" /> Achievements</h3>
                    <p className="text-[8px] font-black text-[#a78bfa]">{userProfile?.rewards?.filter(r => ACHIEVEMENT_LIBRARY[r]).length || 0} / 16</p>
                </div>
                <div className="grid grid-cols-4 gap-3 relative overflow-visible">
                    {Object.entries(ACHIEVEMENT_LIBRARY).map(([key, data]) => (
                        <StickerItem key={key} id={key} data={data} isActive={userProfile?.rewards?.includes(key)} type="achievement" />
                    ))}
                </div>
            </div>

            <button onClick={() => signOut()} className="w-full py-4 text-[9px] font-black uppercase tracking-widest border border-white/5 rounded-2xl opacity-20 hover:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-500">Terminate Session</button>
        </div>

        {/* Right Side: Tabbed Content */}
        <div className="lg:col-span-8 space-y-10 overflow-visible">
            <div className="flex gap-8 border-b border-white/10 pb-4 relative z-30">
                <button onClick={() => setActiveTab('hearts')} className={`px-2 py-2 text-[11px] font-black uppercase tracking-[0.4em] transition-all relative ${activeTab === 'hearts' ? 'text-[#004aad]' : 'text-zinc-500 hover:text-white'}`}>
                    01. Hearts {activeTab === 'hearts' && <motion.div layoutId="tab-underline" className="absolute bottom-[-17px] left-0 w-full h-[3px] bg-[#004aad]" />}
                </button>
                <button onClick={() => setActiveTab('stickers')} className={`px-2 py-2 text-[11px] font-black uppercase tracking-[0.4em] transition-all relative ${activeTab === 'stickers' ? 'text-[#004aad]' : 'text-zinc-500 hover:text-white'}`}>
                    02. Sticker Book {activeTab === 'stickers' && <motion.div layoutId="tab-underline" className="absolute bottom-[-17px] left-0 w-full h-[3px] bg-[#004aad]" />}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'hearts' ? (
                    <motion.section key="hearts" initial={{ opacity: 0, x: -30, rotateY: 10 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: 30, rotateY: -10 }} transition={{ duration: 0.5 }} className="space-y-10">
                        <h2 className={`${h1Title} text-6xl lg:text-[8.5rem] opacity-15`}>Liked<br/>Records</h2>
                        <div className="grid gap-4">
                            {tracks.filter(t => userLikes.includes(t.id)).map(t => (
                                <div key={t.id} onClick={() => setSelectedTrack(t)} className={`${glass} p-6 lg:p-10 rounded-3xl flex justify-between items-center group cursor-pointer border-white/5 hover:border-[#004aad]/30 hover:bg-[#004aad]/5 transition-all shadow-2xl`}>
                                    <div className="flex items-center gap-6 lg:gap-10">
                                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden shadow-2xl border border-white/10"><img src={t.image} className="w-full h-full object-cover" alt="" /></div>
                                        <div className="space-y-1.5 truncate">
                                            <p className="text-xl lg:text-3xl font-black uppercase tracking-tight leading-none truncate">{t.title}</p>
                                            <p className="text-[10px] font-bold text-[#004aad] tracking-[0.2em] uppercase truncate">{t.artist}</p>
                                        </div>
                                    </div>
                                    <Heart className="w-6 h-6 lg:w-8 lg:h-8 fill-red-500 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                </div>
                            ))}
                        </div>
                    </motion.section>
                ) : (
                    <motion.section key="stickers" initial={{ opacity: 0, x: 30, rotateY: -15 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: -30, rotateY: 15 }} transition={{ duration: 0.6, ease: "anticipate" }} className="space-y-12 overflow-visible">
                        <div className={`${glass} p-8 lg:p-12 rounded-[4rem] space-y-8 border-white/10 shadow-2xl`}>
                            <div className="flex justify-between items-end">
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-[#004aad]">Progress Status</p>
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">Spatial Artifacts</h3>
                                </div>
                                <div className="text-right"><p className="text-4xl font-black italic text-white">{userProfile?.rewards?.filter(r => COLLECTIVE_LIBRARY[r]).length || 0}<span className="text-xl text-zinc-600 ml-1">/ 30</span></p></div>
                            </div>
                            <div className="h-4 bg-black/40 rounded-full overflow-hidden p-1 border border-white/5 shadow-inner">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(userProfile?.rewards?.filter(r => COLLECTIVE_LIBRARY[r]).length / 30) * 100}%` }} className="h-full bg-gradient-to-r from-[#fb7185] via-[#fbbf24] to-[#34d399] rounded-full shadow-[0_0_20px_rgba(251,113,133,0.6)]" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5 lg:gap-6 overflow-visible">
                            {Object.entries(COLLECTIVE_LIBRARY).map(([key, data]) => (
                                <StickerItem key={key} id={key} data={data} isActive={userProfile?.rewards?.includes(key)} type="collective" />
                            ))}
                            {[...Array(25)].map((_, i) => (
                                <div key={i} className="aspect-square bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center opacity-10"><Layers size={18} /></div>
                            ))}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
        </div>
        <style>{`
            .hex-shape { clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%); }
            @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .animate-spin-slow { animation: spin-slow 12s linear infinite; }
            .container { perspective: 2000px; }
        `}</style>
    </motion.div>
  );
};

export default Archive;