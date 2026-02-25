import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Trash2, Eye, EyeOff, Edit2, Upload, Loader2, FileText, Sparkles, 
  Save, Type, ListMusic, Settings2, Plus, CheckCircle2, Users, Search, Award, Lock, 
  Flame, Crown, Sunrise, Target, Waves, Music, Heart, Share2, Zap, Medal, Navigation, 
  Calendar, Star, Moon, Coffee, Ghost, Repeat, Smartphone, Clock, User, ArrowRight, MousePointer2,
  Trophy 
} from 'lucide-react';
import { doc, addDoc, updateDoc, deleteDoc, collection, getDoc, setDoc, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore'; 

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2";

// 🚀 [업적 데이터] 아이콘 및 컬러 매핑 (Archive.jsx와 100% 동기화)
const ACHIEVEMENT_DATA = {
  first_sound: { title: "첫 소리", icon: Music, color: "#a78bfa" },
  moment_10: { title: "10번의 순간", icon: Zap, color: "#fbbf24" },
  moment_100: { title: "심오한 감상자", icon: Trophy, color: "#fb7185" },
  heart_1: { title: "첫 하트", icon: Heart, color: "#f87171" },
  heart_50: { title: "취향 컬렉터", icon: Medal, color: "#f472b6" },
  signal_1: { title: "첫 신호", icon: Share2, color: "#34d399" },
  signal_10: { title: "신호의 대가", icon: Navigation, color: "#22d3ee" },
  loyal_7: { title: "단골 거주자", icon: Calendar, color: "#fb923c" },
  loyal_30: { title: "공간의 역사", icon: Star, color: "#fef08a" },
  night_owl: { title: "심야의 동반자", icon: Moon, color: "#818cf8" },
  early_bird: { title: "얼리 버드", icon: Coffee, color: "#f59e0b" },
  weekend_art: { title: "주말의 여유", icon: Sparkles, color: "#c084fc" },
  repeater_3: { title: "다시 듣기", icon: Repeat, color: "#fb7185" },
  nfc_explorer: { title: "공간의 교감", icon: Smartphone, color: "#2dd4bf" },
  long_voyage: { title: "긴 항해", icon: Clock, color: "#94a3b8" },
  archive_master: { title: "완벽한 아카이브", icon: Ghost, color: "#f4f4f5" }
};

const COLLECTIVE_DATA = {
  eternal_origin: { title: "The Origin (초기멤버)", icon: Flame, color: "#ef4444" },
  unframe_genesis: { title: "The Genesis", icon: Crown, color: "#fbbf24" },
  new_year_2026: { title: "2026 First Light", icon: Sunrise, color: "#fb7185" },
  pioneer_26: { title: "Pioneer 26", icon: Target, color: "#2dd4bf" },
  insadong_wave: { title: "Insadong Wave", icon: Waves, color: "#3b82f6" }
};

const Admin = ({ isAdmin, user, signInWithPopup, tracks, playlists, db, appId, setToastMessage, setAuthError }) => {
  const [activeTab, setActiveTab] = useState('tracks'); 
  
  // 트랙 관리 상태
  const [newTrack, setNewTrack] = useState({ 
    title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '', lyrics: '' 
  });
  const [editingId, setEditingId] = useState(null); 
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  // 플레이리스트 관리 상태
  const [newPlaylist, setNewPlaylist] = useState({ title: '', desc: '', image: '', trackIds: [] });
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [isUploadingPLImg, setIsUploadingPLImg] = useState(false);

  // 사이트 설정 상태 (인트로 팝업 포함)
  const [featuredData, setFeaturedData] = useState({ headline: '', subHeadline: '', quote: '', description: '', linkedTrackId: '' });
  const [siteConfig, setSiteConfig] = useState({ 
    intro_title: "UNFRAME PLAYLIST",
    intro_desc: "감각의 프레임을 넘어선 소리의 아카이브",
    intro_btn: "ENTER SPACE",
    phil_title: "", 
    phil_sub: "Philosophy", 
    phil_desc: "", 
    phil_quote: "", 
    guide_1: "", guide_2: "", guide_3: "", guide_4: "" 
  });

  // 유저 관리 상태
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserForSticker, setSelectedUserForSticker] = useState(null);

  // 데이터 로드
  useEffect(() => {
    if (!db || !isAdmin) return;
    const fetchData = async () => {
        try {
          const pickSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'featured', 'directors_pick'));
          if (pickSnap.exists()) setFeaturedData(prev => ({...prev, ...pickSnap.data()}));
          const configSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts'));
          if (configSnap.exists()) setSiteConfig(prev => ({ ...prev, ...configSnap.data() }));
        } catch (e) { console.error(e); }
    };
    fetchData();
  }, [db, isAdmin, appId]);

  // 유저 리스트 조회
  const fetchUsers = async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public_stats'));
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersData);
    } catch (e) { 
        console.error("유저 로드 실패:", e);
        setAuthError("유저 정보를 불러올 수 없습니다."); 
    } finally { setIsLoadingUsers(false); }
  };

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) fetchUsers();
  }, [activeTab, isAdmin]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
      u.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  }, [allUsers, userSearchTerm]);

  // 🚀 [핵심 수정] 스티커 지급/회수 로직 보강
  const handleStickerToggle = async (targetUid, stickerId, isGiving) => {
    if (!isAdmin) return;
    try {
      // 1. 유저의 개인 프로필 경로 (Archive.jsx에서 사용하는 진짜 데이터)
      const privateRef = doc(db, 'artifacts', appId, 'users', targetUid, 'profile', 'stats');
      // 2. 어드민 유저 목록에서 사용하는 공개 통계 경로
      const publicRef = doc(db, 'artifacts', appId, 'public_stats', targetUid);
      
      const updateData = { 
        rewards: isGiving ? arrayUnion(stickerId) : arrayRemove(stickerId) 
      };

      // updateDoc 대신 setDoc(merge: true)를 사용하여 문서가 없는 유저 대응
      await setDoc(privateRef, updateData, { merge: true });
      await setDoc(publicRef, updateData, { merge: true });
      
      setToastMessage(isGiving ? "스티커를 지급했습니다! 🎁" : "스티커를 회수했습니다. 🚫");
      
      // 로컬 상태 즉시 업데이트
      setAllUsers(prev => prev.map(u => u.id === targetUid ? { 
        ...u, 
        rewards: isGiving ? [...(u.rewards || []), stickerId] : (u.rewards || []).filter(id => id !== stickerId) 
      } : u));

      if (selectedUserForSticker?.id === targetUid) {
        setSelectedUserForSticker(prev => ({
          ...prev,
          rewards: isGiving ? [...(prev.rewards || []), stickerId] : (prev.rewards || []).filter(id => id !== stickerId)
        }));
      }
    } catch (e) {
      console.error("Sticker Update Error:", e);
      setAuthError("스티커 처리에 실패했습니다. 보안 규칙을 확인하세요.");
    }
  };

  // 트랙 관리
  const handleImageUpload = async (e) => { 
    const file = e.target.files[0]; if (!file) return; 
    setIsUploadingImg(true); 
    try { 
      const reader = new FileReader(); reader.readAsDataURL(file); 
      reader.onload = async (event) => { 
        const img = new Image(); img.src = event.target.result; 
        img.onload = async () => { 
          const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; 
          const ctx = canvas.getContext('2d'); const minSide = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - minSide) / 2, (img.height - minSide) / 2, minSide, minSide, 0, 0, 512, 512); 
          const base64Data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]; 
          const formData = new FormData(); formData.append("image", base64Data); 
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData }); 
          const result = await response.json(); 
          if (result.success) setNewTrack(prev => ({ ...prev, image: result.data.url })); 
          setIsUploadingImg(false); 
        }; 
      }; 
    } catch (err) { setIsUploadingImg(false); } 
  };

  const handleLrcUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = (event) => { 
      setNewTrack(prev => ({ ...prev, lyrics: event.target.result })); 
      setToastMessage("가사 로드 완료 🎤"); 
    }; 
    reader.readAsText(file); 
  };

  const handleAddOrUpdateTrack = async (e) => {
    e.preventDefault(); if (!isAdmin) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', editingId), { ...newTrack, updatedAt: Date.now() });
        setToastMessage("수정 완료 🛠️");
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tracks'), { ...newTrack, isHidden: false, createdAt: Date.now() });
        setToastMessage("등록 성공 🚀");
      }
      handleCancelEdit();
    } catch (err) { setAuthError("저장 권한 오류"); }
  };

  const handleEditClick = (track) => { setEditingId(track.id); setNewTrack({ ...track }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleCancelEdit = () => { setEditingId(null); setNewTrack({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '', lyrics: '' }); };
  const handleToggleVisibility = async (track) => { if (!isAdmin) return; try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', track.id), { isHidden: !track.isHidden }); setToastMessage(track.isHidden ? "공개됨 👁️" : "숨김 처리됨 🚫"); } catch (err) {} };

  // 플레이리스트 관리
  const handleAddOrUpdatePlaylist = async (e) => {
    e.preventDefault(); if (!isAdmin) return;
    try {
        if (editingPlaylistId) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'playlists', editingPlaylistId), { ...newPlaylist, updatedAt: Date.now() });
            setToastMessage("수정 완료 ✨");
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'playlists'), { ...newPlaylist, createdAt: Date.now() });
            setToastMessage("생성 완료 🚀");
        }
        setEditingPlaylistId(null); setNewPlaylist({ title: '', desc: '', image: '', trackIds: [] });
    } catch (err) { setAuthError("저장 실패"); }
  };

  const handlePLImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploadingPLImg(true);
    try {
        const base64 = await new Promise(resolve => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result.split(',')[1]); });
        const formData = new FormData(); formData.append("image", base64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const result = await response.json();
        if (result.success) setNewPlaylist(prev => ({ ...prev, image: result.data.url }));
    } catch (err) {} finally { setIsUploadingPLImg(false); }
  };

  const toggleTrackInPL = (trackId) => {
    setNewPlaylist(prev => {
        const exists = prev.trackIds.includes(trackId);
        return { ...prev, trackIds: exists ? prev.trackIds.filter(id => id !== trackId) : [...prev.trackIds, trackId] };
    });
  };

  const handleSaveAllConfig = async () => {
    if (!isAdmin) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'featured', 'directors_pick'), featuredData);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts'), siteConfig);
        setToastMessage("사이트 설정 저장 완료 ✨");
    } catch (err) { setAuthError("설정 저장 실패"); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-32 lg:pt-40 px-6 lg:px-8 container mx-auto pb-32 lg:pb-40 relative z-20 min-h-screen">
        <h2 className={h1Title + " text-6xl lg:text-[10rem] mb-12"}>Console</h2>
        
        {!isAdmin ? (
            <div className={glass + " p-16 lg:p-32 rounded-[3rem] text-center space-y-8"}><ShieldCheck className="w-16 h-16 lg:w-24 lg:h-24 mx-auto text-[#004aad]" /><button onClick={signInWithPopup} className="bg-white text-black px-12 lg:px-20 py-4 lg:py-6 rounded-full font-black uppercase text-xs lg:text-sm tracking-widest shadow-2xl">Verify Admin</button></div>
        ) : (
            <>
                <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
                    <button onClick={() => setActiveTab('tracks')} className={`px-6 py-3 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'tracks' ? 'bg-[#004aad] text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><ListMusic className="w-4 h-4" /> Tracks</button>
                    <button onClick={() => setActiveTab('playlists')} className={`px-6 py-3 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'playlists' ? 'bg-[#004aad] text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><Plus className="w-4 h-4" /> Playlists</button>
                    <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'users' ? 'bg-[#004aad] text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><Users className="w-4 h-4" /> Users</button>
                    <button onClick={() => setActiveTab('config')} className={`px-6 py-3 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'config' ? 'bg-[#004aad] text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><Settings2 className="w-4 h-4" /> Config</button>
                </div>

                <AnimatePresence mode="wait">
                    {/* 유저 관리 탭 */}
                    {activeTab === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-5 space-y-6">
                                <div className={`${glass} p-4 rounded-full flex items-center gap-4 px-6`}>
                                    <Search className="w-5 h-5 text-zinc-500" />
                                    <input placeholder="유저 닉네임 또는 UID 검색..." className="bg-transparent border-none outline-none flex-1 font-bold text-white uppercase text-sm" value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} />
                                    {isLoadingUsers && <Loader2 className="w-4 h-4 animate-spin text-[#004aad]" />}
                                </div>
                                <div className="space-y-3 max-h-175 overflow-y-auto no-scrollbar pr-2">
                                    {filteredUsers.map(u => (
                                        <div key={u.id} onClick={() => setSelectedUserForSticker(u)} className={`${glass} p-5 rounded-3xl flex justify-between items-center cursor-pointer transition-all border-white/5 hover:border-[#004aad]/50 ${selectedUserForSticker?.id === u.id ? 'bg-[#004aad]/10 border-[#004aad]/40' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10">{u.profileImg ? <img src={u.profileImg} className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-zinc-600" />}</div>
                                                <div className="min-w-0 pr-2"><p className="font-black uppercase text-lg truncate">{u.displayName || 'Guest'}</p><p className="text-[9px] text-zinc-500 font-bold">{u.id?.slice(0,16)}...</p></div>
                                            </div>
                                            <ArrowRight size={14} className="text-zinc-600" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:col-span-7">
                                {selectedUserForSticker ? (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={`${glass} p-8 lg:p-12 rounded-[4rem] border-white/10 space-y-12 shadow-2xl relative overflow-visible`}>
                                        <div className="flex items-center gap-6 pb-8 border-b border-white/10">
                                            <div className="w-20 h-20 rounded-full bg-zinc-900 border-2 border-[#004aad] p-1"><img src={selectedUserForSticker.profileImg || ""} className="w-full h-full rounded-full object-cover" /></div>
                                            <div className="flex-1"><h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">{selectedUserForSticker.displayName}</h3><p className="text-[10px] text-zinc-500 font-bold">{selectedUserForSticker.id}</p></div>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3"><Award className="w-4 h-4 text-[#a78bfa]" /><h4 className="text-xs font-black uppercase tracking-widest text-[#a78bfa]">Achievements</h4></div>
                                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                                {Object.entries(ACHIEVEMENT_DATA).map(([id, data]) => {
                                                    const hasIt = selectedUserForSticker.rewards?.includes(id);
                                                    return (
                                                        <button key={id} onClick={() => handleStickerToggle(selectedUserForSticker.id, id, !hasIt)} 
                                                          className={`aspect-square rounded-2xl border flex items-center justify-center transition-all ${hasIt ? 'bg-[#a78bfa]/20 border-[#a78bfa] text-white shadow-[0_0_15px_rgba(167,139,250,0.3)]' : 'bg-white/5 border-white/10 text-zinc-800 hover:border-white/30'}`} title={data.title}>
                                                          <data.icon size={20} style={{ color: hasIt ? data.color : 'inherit' }} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-[#fbbf24]" /><h4 className="text-xs font-black uppercase tracking-widest text-[#fbbf24]">Special Collections</h4></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(COLLECTIVE_DATA).map(([id, data]) => {
                                                    const hasIt = selectedUserForSticker.rewards?.includes(id);
                                                    return (
                                                        <button key={id} onClick={() => handleStickerToggle(selectedUserForSticker.id, id, !hasIt)} className={`p-5 rounded-3xl border flex items-center gap-4 transition-all text-left ${hasIt ? 'bg-[#fbbf24]/20 border-[#fbbf24] text-white shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'bg-white/5 border-white/10 text-zinc-500'}`}>
                                                            <data.icon size={20} style={{ color: hasIt ? data.color : 'inherit' }} />
                                                            <div className="min-w-0"><p className="text-[11px] font-black uppercase truncate">{data.title}</p><p className="text-[8px] opacity-60 font-bold uppercase">{hasIt ? 'Reward Granted' : 'Pending'}</p></div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className={`${glass} p-20 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-6 border-dashed border-white/10`}><Users size={64} className="text-zinc-800" /><p className="text-xs text-zinc-600 font-black uppercase">Select a user to grant records</p></div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* 사이트 설정 탭 */}
                    {activeTab === 'config' && (
                        <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                            <div className="bg-zinc-900 border border-white/10 p-8 lg:p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><MousePointer2 className="w-40 h-40 text-[#004aad]" /></div>
                                <div className="grid lg:grid-cols-2 gap-16">
                                    <div className="space-y-8">
                                        <h3 className="text-xl font-black uppercase text-white flex items-center gap-3"><Sparkles className="w-5 h-5 text-[#004aad]"/> Intro Page (Popup)</h3>
                                        <div className="space-y-5">
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Main Title</p><input value={siteConfig.intro_title} onChange={e => setSiteConfig({...siteConfig, intro_title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:border-[#004aad]" /></div>
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Sub Description</p><textarea value={siteConfig.intro_desc} onChange={e => setSiteConfig({...siteConfig, intro_desc: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad] h-24 resize-none" /></div>
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Entry Button Text</p><input value={siteConfig.intro_btn} onChange={e => setSiteConfig({...siteConfig, intro_btn: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[#004aad] font-black outline-none focus:border-white" /></div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <h3 className="text-xl font-black uppercase text-white flex items-center gap-3"><Type className="w-5 h-5 text-[#004aad]"/> Space Philosophy</h3>
                                        <div className="space-y-5">
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Headline</p><input value={siteConfig.phil_title} onChange={e => setSiteConfig({...siteConfig, phil_title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad]" /></div>
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Philosophy Description</p><textarea value={siteConfig.phil_desc} onChange={e => setSiteConfig({...siteConfig, phil_desc: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad] h-32 resize-none" /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-16 grid lg:grid-cols-4 gap-6">
                                    {['guide_1', 'guide_2', 'guide_3', 'guide_4'].map((g, i) => (
                                        <div key={g}><p className="text-[9px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Nav Guide {i+1}</p><input value={siteConfig[g]} onChange={e => setSiteConfig({...siteConfig, [g]: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white" /></div>
                                    ))}
                                </div>
                            </div>
                            <div className={`${glass} p-8 lg:p-12 rounded-[4rem] space-y-10`}>
                                <h3 className="text-xl font-black uppercase text-white flex items-center gap-3"><Sparkles className="w-5 h-5 text-[#004aad]"/> Featured Artifact (Directors Pick)</h3>
                                <div className="grid lg:grid-cols-2 gap-10">
                                    <div className="space-y-5">
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Headline</p><input value={featuredData.headline} onChange={e => setFeaturedData({...featuredData, headline: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad]" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Sub Headline</p><input value={featuredData.subHeadline} onChange={e => setFeaturedData({...featuredData, subHeadline: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad]" /></div>
                                    </div>
                                    <div className="space-y-5">
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Quote</p><input value={featuredData.quote} onChange={e => setFeaturedData({...featuredData, quote: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white italic outline-none focus:border-[#004aad]" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">Linked Track</p><select value={featuredData.linkedTrackId} onChange={e => setFeaturedData({...featuredData, linkedTrackId: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[#004aad] font-black outline-none cursor-pointer"><option value="">-- SELECT TRACK --</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSaveAllConfig} className="w-full bg-[#004aad] text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 shadow-2xl"><Save className="w-6 h-6" /> Deploy Site Changes</button>
                        </motion.div>
                    )}

                    {activeTab === 'tracks' && (
                        <motion.div key="tracks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 space-y-4">
                                {tracks.map(t => (<div key={t.id} className={`${glass} p-6 rounded-4xl flex justify-between items-center group shadow-lg ${t.isHidden ? 'opacity-50 border-dashed' : 'border-white/5'}`}><div className="flex-1 min-w-0 pr-4"><div className="flex items-center gap-2 mb-1">{t.isHidden && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] rounded font-bold uppercase">Hidden</span>}<p className="font-black uppercase text-xl truncate">{t.title}</p></div><p className="text-xs text-zinc-500 font-bold uppercase tracking-widest truncate">{t.artist}</p></div><div className="flex items-center gap-2 shrink-0"><button onClick={() => handleToggleVisibility(t)} className={`p-3 rounded-full ${t.isHidden ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 bg-white/5 hover:bg-white/10'}`}><Eye className="w-5 h-5" /></button><button onClick={() => handleEditClick(t)} className="p-3 text-zinc-400 bg-white/5 hover:bg-white/10 rounded-full"><Edit2 className="w-5 h-5" /></button><button onClick={() => { if(window.confirm('삭제?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', t.id)) }} className="p-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-full"><Trash2 className="w-5 h-5" /></button></div></div>))}
                            </div>
                            <div className="lg:col-span-5"><div className={`p-8 lg:p-12 rounded-[3rem] text-black shadow-2xl sticky top-32 ${editingId ? 'bg-emerald-400' : 'bg-white'}`}><div className="mb-8 flex items-center justify-between"><h3 className="font-black uppercase tracking-tighter text-2xl lg:text-3xl">{editingId ? 'Edit Artifact' : 'New Artifact'}</h3>{editingId && <button onClick={handleCancelEdit} className="text-xs font-black uppercase bg-black/10 px-4 py-2 rounded-full">Cancel</button>}</div><form onSubmit={handleAddOrUpdateTrack} className="space-y-6"><input required placeholder="TITLE" value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-black uppercase outline-none focus:border-black text-xl rounded-xl" /><input required placeholder="ARTIST" value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-black uppercase outline-none focus:border-black text-xl rounded-xl" /><div className="space-y-4"><div className="relative group cursor-pointer"><input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className={`p-8 rounded-[2.5rem] border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-4`}>{isUploadingImg ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10 text-black/60" />}<span className="text-xs font-black uppercase tracking-widest text-black/60">Upload Cover Art</span></div></div>{newTrack.image && <div className="w-full aspect-square rounded-[2.5rem] overflow-hidden border-2 border-black shadow-2xl"><img src={newTrack.image} className="w-full h-full object-cover" alt="" /></div>}</div><input required placeholder="AUDIO SOURCE (URL)" value={newTrack.audioUrl} onChange={e => setNewTrack({...newTrack, audioUrl: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-black outline-none focus:border-black rounded-xl" /><textarea placeholder="DESCRIPTION" value={newTrack.description} onChange={e => setNewTrack({...newTrack, description: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-medium text-sm outline-none focus:border-black h-24 resize-none rounded-xl" /><div className="space-y-2"><div className="flex justify-between items-end px-2"><span className="text-[10px] font-black uppercase tracking-widest text-black/60">Lyrics</span><label className="cursor-pointer flex items-center gap-1 bg-black/10 px-3 py-1.5 rounded-full hover:bg-black/20 transition-colors"><FileText className="w-3 h-3 text-black/70" /><span className="text-[9px] font-black uppercase tracking-widest text-black/70">.LRC File</span><input type="file" accept=".lrc,.txt" onChange={handleLrcUpload} className="hidden" /></label></div><textarea placeholder="Paste lyrics here..." value={newTrack.lyrics} onChange={e => setNewTrack({...newTrack, lyrics: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-medium text-xs outline-none focus:border-black h-32 resize-none font-mono rounded-xl" wrap="off" /></div><button type="submit" disabled={isUploadingImg} className="w-full bg-black text-white py-6 mt-6 rounded-4xl font-black uppercase tracking-widest text-sm shadow-2xl disabled:opacity-50">{editingId ? 'Update' : 'Sync'}</button></form></div></div>
                        </motion.div>
                    )}

                    {activeTab === 'playlists' && (
                        <motion.div key="playlists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 space-y-4">
                                {playlists.map(pl => (<div key={pl.id} className={`${glass} p-6 rounded-4xl flex justify-between items-center group shadow-lg border-white/5`}><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden"><img src={pl.image} className="w-full h-full object-cover" alt="" /></div><div className="min-w-0 pr-4"><p className="font-black uppercase text-xl truncate">{pl.title}</p><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{pl.trackIds?.length || 0} Tracks</p></div></div><div className="flex items-center gap-2 shrink-0"><button onClick={() => { setEditingPlaylistId(pl.id); setNewPlaylist(pl); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 text-zinc-400 bg-white/5 hover:bg-white/10 rounded-full"><Edit2 className="w-5 h-5" /></button><button onClick={() => { if(window.confirm('삭제?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'playlists', pl.id)) }} className="p-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-full"><Trash2 className="w-5 h-5" /></button></div></div>))}
                            </div>
                            <div className="lg:col-span-5"><div className="p-8 lg:p-12 rounded-[3rem] bg-zinc-900 border border-white/10 text-white shadow-2xl sticky top-32"><h3 className="font-black uppercase tracking-tighter text-2xl mb-8">{editingPlaylistId ? 'Edit Playlist' : 'Create Playlist'}</h3><form onSubmit={handleAddOrUpdatePlaylist} className="space-y-6"><input required placeholder="TITLE" value={newPlaylist.title} onChange={e => setNewPlaylist({...newPlaylist, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold uppercase outline-none focus:border-[#004aad]" /><input placeholder="DESC" value={newPlaylist.desc} onChange={e => setNewPlaylist({...newPlaylist, desc: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-[#004aad]" /><div className="relative group cursor-pointer"><input type="file" accept="image/*" onChange={handlePLImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className="p-6 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3">{isUploadingPLImg ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}<span className="text-[10px] font-black uppercase tracking-widest">Playlist Cover</span></div></div><div className="space-y-2"><p className="text-[10px] font-black uppercase text-[#004aad]">Select Tracks</p><div className="h-60 overflow-y-auto no-scrollbar bg-black/40 rounded-2xl border border-white/5 p-4 space-y-2">{tracks.map(t => (<div key={t.id} onClick={() => toggleTrackInPL(t.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${newPlaylist.trackIds.includes(t.id) ? 'bg-[#004aad]/20 border border-[#004aad]/50' : 'hover:bg-white/5'}`}><div className="w-8 h-8 rounded bg-zinc-800 shrink-0 overflow-hidden"><img src={t.image} className="w-full h-full object-cover" alt="" /></div><p className="text-xs font-bold truncate flex-1">{t.title}</p>{newPlaylist.trackIds.includes(t.id) && <CheckCircle2 className="w-4 h-4 text-[#004aad]" />}</div>))}</div></div><button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#004aad] hover:text-white shadow-xl">{editingPlaylistId ? 'Update' : 'Create'}</button></form></div></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        )}
    </motion.div>
  );
};

export default Admin;