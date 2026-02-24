import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Loader2, Camera, Music, Heart, Share2, Zap, 
  Archive as ArchiveIcon, Trophy, Medal, Waves, Calendar, 
  Star, Moon, Coffee, Ghost, LogIn, CheckCircle2, Target, ArrowRight 
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore'; 

// 디자인 상수
const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2";

// 🚀 스티커 라이브러리 (공유 이미지 오류 방지를 위해 헥사 색상 고정)
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

const Archive = ({ 
  user, userProfile, membership, userLikes, tracks, 
  handleShare, signOut, setSelectedTrack, db, appId,
  handleGoogleLogin, rankingTheme, allUsers 
}) => {
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  // 🚀 [실시간 데이터 기반] 내 등수 계산 로직
  const myRank = useMemo(() => {
      if (!user || !allUsers || allUsers.length === 0) return '?';
      // 전체 유저 목록(public_stats)에서 내 UID와 같은 유저의 인덱스를 찾습니다.
      const index = allUsers.findIndex(u => u.id === user.uid);
      // 인덱스는 0부터 시작하므로 +1을 해줍니다.
      return index === -1 ? allUsers.length + 1 : index + 1;
  }, [user, allUsers]);

  // 프로필 이미지 업로드 로직 (ImgBB 연동)
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0]; 
    if (!file || !user) return;
    setIsUploadingProfile(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512;
            const ctx = canvas.getContext('2d');
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 512, 512);
            const base64Data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

            const formData = new FormData(); 
            formData.append("image", base64Data);
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const result = await response.json();
            if (result.success) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats'), { profileImg: result.data.url });
            }
            setIsUploadingProfile(false);
        };
      };
    } catch (err) { 
      setIsUploadingProfile(false); 
      alert("업로드 실패"); 
    } 
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 lg:pt-40 px-6 lg:px-8 container mx-auto pb-32 lg:pb-40 min-h-screen relative z-20">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-20">
        
        {/* Left Column: Profile & Sticker Book */}
        <div className="lg:col-span-4 space-y-6 lg:space-y-8">
            <motion.div className={`${glass} p-8 lg:p-12 rounded-[3rem] lg:rounded-[5rem] text-center space-y-8 lg:space-y-10 relative border-white/20 shadow-2xl`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-[#004aad] opacity-30 shadow-[0_0_20px_#004aad]" />
                <div className="relative inline-block">
                    <div className="w-32 h-32 lg:w-40 lg:h-40 bg-zinc-900 rounded-full mx-auto flex items-center justify-center shadow-2xl transition-transform duration-700 overflow-hidden border-4 border-white/10 relative group/profile">
                    {isUploadingProfile ? (
                        <Loader2 className="w-8 h-8 lg:w-10 lg:h-10 animate-spin text-[#004aad]" />
                    ) : (
                        userProfile?.profileImg ? <img src={userProfile.profileImg} className="w-full h-full object-cover" alt="profile" /> : <User className="w-10 h-10 lg:w-14 lg:h-14 text-white/10" />
                    )}
                    {!user?.isAnonymous && (
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/profile:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
                            <Camera className="w-5 h-5 lg:w-6 lg:h-6 mb-1 lg:mb-2" />
                            <span className="text-[9px] lg:text-[10px] font-black uppercase">Change</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} disabled={isUploadingProfile} />
                        </label>
                    )}
                    </div>
                    <div className={`absolute -bottom-2 -right-2 px-4 lg:px-6 py-1.5 lg:py-2 rounded-full ${membership.bg} ${membership.color} text-[9px] lg:text-[11px] font-black uppercase border border-white/10 shadow-2xl flex items-center gap-1.5 lg:gap-2`} style={{ color: membership.color, backgroundColor: membership.bg }}>
                        {React.createElement(membership.icon, { className: "w-3 h-3 lg:w-4 lg:h-4" })} {membership.name}
                    </div>
                </div>
                <div className="space-y-3 lg:space-y-4">
                    {user?.isAnonymous ? (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">Guest User</h2>
                            <button onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black uppercase text-xs hover:bg-[#004aad] hover:text-white transition-all shadow-xl mx-auto"><LogIn className="w-4 h-4"/> Sign In</button>
                        </div>
                    ) : (
                        <div className="space-y-1.5 lg:space-y-2">
                            <h2 className="text-2xl lg:text-4xl font-black uppercase italic tracking-tighter leading-none">{user?.displayName || "Member"}</h2>
                            <p className="text-[9px] lg:text-[11px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">Journey: {Math.floor((Date.now() - (userProfile?.firstJoin || Date.now())) / 86400000) + 1} Days</p>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-white/10 pt-6 lg:pt-10">
                    <div className="space-y-1"><Music className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-indigo-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Listen</p><p className="text-lg lg:text-xl font-black text-white">{userProfile?.listenCount || 0}</p></div>
                    <div className="space-y-1"><Heart className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-red-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Hearts</p><p className="text-lg lg:text-xl font-black text-white">{userLikes.length}</p></div>
                    <div className="space-y-1"><Share2 className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-blue-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Signal</p><p className="text-lg lg:text-xl font-black text-white">{userProfile?.shareCount || 0}</p></div>
                    <div className="space-y-1"><Zap className="w-3 h-3 lg:w-4 lg:h-4 mx-auto text-yellow-400"/><p className="text-[7px] font-black text-zinc-600 uppercase">Streak</p><p className="text-lg lg:text-xl font-black text-white">7</p></div>
                </div>
                {!user?.isAnonymous && <button onClick={() => signOut()} className="text-[8px] lg:text-[9px] font-black uppercase underline opacity-20 hover:opacity-100 mt-6 lg:mt-10">Sign Out</button>}
            </motion.div>
            
            <div className={`${glass} p-8 lg:p-12 rounded-[3rem] lg:rounded-[5rem] space-y-6 border-white/10`}>
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-zinc-400"><ArchiveIcon className="w-3 h-3 text-[#004aad]" /> Sticker Book</h3>
                <div className="grid grid-cols-4 gap-3">
                    {Object.entries(STICKER_LIBRARY).map(([key, data]) => {
                        const isActive = userProfile.rewards?.includes(key);
                        return (
                            <div key={key} 
                                onClick={(e) => isActive && handleShare(e, { ...data, id: key }, 'reward')} 
                                className={`aspect-square rounded-2xl flex items-center justify-center border transition-all duration-700 ${isActive ? 'cursor-pointer hover:scale-105 border-[#004aad] bg-[#004aad]/10 text-white' : 'border-white/5 opacity-10'} group/badge`}
                            >
                                <data.icon className="w-4 h-4 lg:w-6 lg:h-6" style={{ color: isActive ? data.color : 'inherit' }} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-3 bg-black border border-white/10 rounded-xl text-[8px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-all z-50">
                                    <p style={{ color: data.color }}>{data.title}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Right Column: Quest & My Hearts */}
        <div className="lg:col-span-8 space-y-10 lg:space-y-16">
            
            {/* 🚀 오늘의 UP 놀이 (Quest Card) - 실시간 랭킹 테마 및 등수 연동 */}
            <section className="bg-gradient-to-br from-[#004aad] to-[#001f4d] p-8 lg:p-12 rounded-[3rem] lg:rounded-[5rem] relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10 -rotate-12">
                    {rankingTheme && React.createElement(rankingTheme.icon, { size: 180, color: 'white' })}
                </div>
                
                <div className="relative z-10 space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <span className="px-4 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-widest border border-white/30">Today's Quest</span>
                            <h3 className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter leading-none text-white">Daily Artifact Collector</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-white/60 mb-1">Rank in "{rankingTheme?.title || 'System'}"</p>
                            {/* 🚀 실시간 내 등수 표시! */}
                            <p className="text-4xl lg:text-6xl font-black italic tracking-tighter text-white">#{myRank}</p>
                        </div>
                    </div>

                    <div className="bg-black/20 p-6 rounded-[2rem] lg:rounded-4xl border border-white/10 space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-white">오늘 노래 1번 듣기 ({userProfile?.listenCount > 0 ? '1' : '0'}/1)</p>
                            <span className="text-[10px] font-black uppercase text-white/50">Reward: Tier Card</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                            {/* 실제 재생 횟수에 따라 진행도 반영 (1회 이상이면 100%) */}
                            <motion.div initial={{ width: 0 }} animate={{ width: userProfile?.listenCount > 0 ? '100%' : '0%' }} className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 pt-2">
                            {userProfile?.listenCount > 0 ? (
                                <p className="text-xs font-bold text-green-300 flex items-center gap-2 flex-1"><CheckCircle2 className="w-4 h-4" /> 퀘스트 완료! 오늘 하루도 깊게 머물러 주셨네요.</p>
                            ) : (
                                <p className="text-xs font-bold text-zinc-400 flex items-center gap-2 flex-1">아티팩트를 감상하고 오늘의 기록을 해제하세요.</p>
                            )}
                            
                            {/* 🚀 티어 카드 발급 버튼 (실제 랭킹 데이터가 박힌 이미지가 생성됨) */}
                            <button 
                                onClick={(e) => handleShare(e, { title: rankingTheme.title }, 'tier')}
                                className="bg-white text-[#004aad] px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-100 transition-all flex items-center gap-2 shadow-xl shrink-0"
                            >
                                <Trophy className="w-3.5 h-3.5" /> 티어 카드 발급
                            </button>
                        </div>
                    </div>
                    
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">RANKING UPDATES EVERY 4 HOURS</p>
                </div>
            </section>

            {/* My Hearts List: 내가 좋아요 한 곡 목록 */}
            <section className="space-y-8">
                <h2 className={`${h1Title} text-5xl lg:text-[9rem]`}>My<br/>Hearts</h2>
                <div className="grid gap-4">
                    {tracks.filter(t => userLikes.includes(t.id)).map(t => (
                        <div key={t.id} onClick={() => setSelectedTrack(t)} className={`${glass} p-6 lg:p-12 rounded-2xl lg:rounded-4xl flex justify-between items-center group cursor-pointer border-white/5 hover:bg-[#004aad]/5 transition-all shadow-xl`}>
                            <div className="flex items-center gap-6 lg:gap-10">
                                <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-[1.2rem] lg:rounded-4xl overflow-hidden shadow-2xl shrink-0">
                                    <img src={t.image} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="space-y-1 lg:space-y-2 truncate">
                                    <p className="text-2xl lg:text-4xl font-black uppercase tracking-tighter leading-none truncate">{t.title}</p>
                                    <p className="text-[9px] lg:text-[11px] font-bold text-[#004aad] tracking-[0.2em] uppercase truncate">{t.artist}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <Heart className="w-6 h-6 lg:w-10 lg:h-10 fill-red-500 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            </div>
                        </div>
                    ))}
                    {userLikes.length === 0 && (
                        <div className="py-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No hearts yet. Start exploring.</div>
                    )}
                </div>
            </section>
        </div>
        </div>
    </motion.div>
  );
};

export default Archive;