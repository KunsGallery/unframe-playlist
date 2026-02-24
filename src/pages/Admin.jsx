// src/pages/Admin.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Trash2, Eye, EyeOff, Edit2, Upload, Loader2, FileText, Sparkles, Save, Type, ListMusic, Settings2, Plus, CheckCircle2 } from 'lucide-react';
import { doc, addDoc, updateDoc, deleteDoc, collection, getDoc, setDoc } from 'firebase/firestore'; 

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const IMGBB_API_KEY = "d1d66a67fff0404d782a4a001dfb40e2";

const Admin = ({ isAdmin, user, signInWithPopup, tracks, playlists, db, appId, setToastMessage, setAuthError }) => {
  const [activeTab, setActiveTab] = useState('tracks'); 
  
  // 트랙/플레이리스트 관리 상태
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '', lyrics: '' });
  const [newPlaylist, setNewPlaylist] = useState({ title: '', desc: '', image: '', trackIds: [] });
  const [editingId, setEditingId] = useState(null); 
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isUploadingPLImg, setIsUploadingPLImg] = useState(false);

  // 사이트 설정
  const [featuredData, setFeaturedData] = useState({ headline: '', subHeadline: '', quote: '', description: '', linkedTrackId: '' });
  const [siteConfig, setSiteConfig] = useState({ phil_title: "", phil_sub: "Philosophy", phil_desc: "", phil_quote: "", guide_1: "", guide_2: "", guide_3: "", guide_4: "" });

  useEffect(() => {
    if (!db || !isAdmin) return;
    const fetchData = async () => {
        const pickSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'featured', 'directors_pick'));
        if (pickSnap.exists()) setFeaturedData(pickSnap.data());
        const configSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts'));
        if (configSnap.exists()) setSiteConfig(prev => ({ ...prev, ...configSnap.data() }));
    };
    fetchData();
  }, [db, isAdmin, appId]);

  // 🚀 [플레이리스트 저장/수정]
  const handleAddOrUpdatePlaylist = async (e) => {
    e.preventDefault(); if (!isAdmin) return;
    try {
        if (editingPlaylistId) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'playlists', editingPlaylistId), { ...newPlaylist, updatedAt: Date.now() });
            setToastMessage("플레이리스트 수정 완료 ✨");
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'playlists'), { ...newPlaylist, createdAt: Date.now() });
            setToastMessage("새 플레이리스트 생성 성공 🚀");
        }
        setEditingPlaylistId(null);
        setNewPlaylist({ title: '', desc: '', image: '', trackIds: [] });
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

  const handleSaveAll = async () => {
    if (!isAdmin) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'featured', 'directors_pick'), featuredData);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts'), siteConfig);
        setToastMessage("설정 저장 완료 ✨");
    } catch (err) { setAuthError("저장 실패"); }
  };

  const handleImageUpload = async (e) => { const file = e.target.files[0]; if (!file) return; setIsUploadingImg(true); try { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = async (event) => { const img = new Image(); img.src = event.target.result; img.onload = async () => { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d'); const minSide = Math.min(img.width, img.height); const sx = (img.width - minSide) / 2; const sy = (img.height - minSide) / 2; ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 512, 512); const dataUrl = canvas.toDataURL('image/jpeg', 0.85); const base64Data = dataUrl.split(',')[1]; const formData = new FormData(); formData.append("image", base64Data); const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData }); const result = await response.json(); if (result.success) setNewTrack(prev => ({ ...prev, image: result.data.url })); setIsUploadingImg(false); }; }; } catch (err) { setAuthError("업로드 실패"); setIsUploadingImg(false); } };
  const handleLrcUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { setNewTrack(prev => ({ ...prev, lyrics: event.target.result })); setToastMessage("가사 로드 완료 🎤"); }; reader.readAsText(file); };
  const handleAddOrUpdateTrack = async (e) => { e.preventDefault(); if (!isAdmin) return; try { if (editingId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', editingId), { ...newTrack, updatedAt: Date.now() }); setToastMessage("수정 완료 🛠️"); } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tracks'), { ...newTrack, isHidden: false, createdAt: Date.now() }); setToastMessage("등록 성공 🚀"); } handleCancelEdit(); } catch (err) { setAuthError("권한 오류"); } };
  const handleEditClick = (track) => { setEditingId(track.id); setNewTrack({ title: track.title || '', artist: track.artist || '', image: track.image || '', description: track.description || '', tag: track.tag || 'Ambient', audioUrl: track.audioUrl || '', lyrics: track.lyrics || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleCancelEdit = () => { setEditingId(null); setNewTrack({ title: '', artist: '', image: '', description: '', tag: 'Ambient', audioUrl: '', lyrics: '' }); };
  const handleToggleVisibility = async (track) => { if (!isAdmin) return; try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', track.id), { isHidden: !track.isHidden }); setToastMessage(track.isHidden ? "공개됨 👁️" : "숨김 처리됨 🚫"); } catch (err) {} };

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
                    <button onClick={() => setActiveTab('config')} className={`px-6 py-3 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'config' ? 'bg-[#004aad] text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}><Settings2 className="w-4 h-4" /> Config</button>
                </div>

                <AnimatePresence mode="wait">
                    {/* [Tab 1] 트랙 관리 */}
                    {activeTab === 'tracks' && (
                        <motion.div key="tracks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 space-y-4">
                                {tracks.map(t => (<div key={t.id} className={`${glass} p-6 rounded-4xl flex justify-between items-center group shadow-lg ${t.isHidden ? 'opacity-50 border-dashed' : 'border-white/5'}`}><div className="flex-1 min-w-0 pr-4"><div className="flex items-center gap-2 mb-1">{t.isHidden && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] rounded font-bold uppercase">Hidden</span>}<p className="font-black uppercase text-xl truncate">{t.title}</p></div><p className="text-xs text-zinc-500 font-bold uppercase tracking-widest truncate">{t.artist}</p></div><div className="flex items-center gap-2 shrink-0"><button onClick={() => handleToggleVisibility(t)} className={`p-3 rounded-full ${t.isHidden ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 bg-white/5 hover:bg-white/10'}`}><Eye className="w-5 h-5" /></button><button onClick={() => handleEditClick(t)} className="p-3 text-zinc-400 bg-white/5 hover:bg-white/10 rounded-full"><Edit2 className="w-5 h-5" /></button><button onClick={() => { if(window.confirm('삭제?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tracks', t.id)) }} className="p-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-full"><Trash2 className="w-5 h-5" /></button></div></div>))}
                            </div>
                            <div className="lg:col-span-5"><div className={`p-8 lg:p-12 rounded-[3rem] text-black shadow-2xl transition-colors duration-500 sticky top-32 ${editingId ? 'bg-emerald-400' : 'bg-white'}`}><div className="mb-8 flex items-center justify-between"><h3 className="font-black uppercase tracking-tighter text-2xl lg:text-3xl">{editingId ? 'Edit Artifact' : 'New Artifact'}</h3>{editingId && <button onClick={handleCancelEdit} className="text-xs font-black uppercase bg-black/10 px-4 py-2 rounded-full">Cancel</button>}</div><form onSubmit={handleAddOrUpdateTrack} className="space-y-6"><input required placeholder="TITLE" value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-black uppercase outline-none focus:border-black text-xl rounded-xl" /><input required placeholder="ARTIST" value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-black uppercase outline-none focus:border-black text-xl rounded-xl" /><div className="space-y-4"><div className="relative group cursor-pointer"><input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className={`p-8 rounded-[2.5rem] border-2 border-dashed border-black/20 flex flex-col items-center justify-center gap-4`}>{isUploadingImg ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10 text-black/60" />}<span className="text-xs font-black uppercase tracking-widest text-black/60">Upload Cover Art</span></div></div>{newTrack.image && <div className="w-full aspect-square rounded-[2.5rem] overflow-hidden border-2 border-black shadow-2xl"><img src={newTrack.image} className="w-full h-full object-cover" alt="" /></div>}</div><input required placeholder="AUDIO SOURCE (URL)" value={newTrack.audioUrl} onChange={e => setNewTrack({...newTrack, audioUrl: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-black outline-none focus:border-black rounded-xl" /><textarea placeholder="DESCRIPTION" value={newTrack.description} onChange={e => setNewTrack({...newTrack, description: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-medium text-sm outline-none focus:border-black h-24 resize-none rounded-xl" /><div className="space-y-2"><div className="flex justify-between items-end px-2"><span className="text-[10px] font-black uppercase tracking-widest text-black/60">Lyrics</span><label className="cursor-pointer flex items-center gap-1 bg-black/10 px-3 py-1.5 rounded-full hover:bg-black/20 transition-colors"><FileText className="w-3 h-3 text-black/70" /><span className="text-[9px] font-black uppercase tracking-widest text-black/70">.LRC File</span><input type="file" accept=".lrc,.txt" onChange={handleLrcUpload} className="hidden" /></label></div><textarea placeholder="Paste lyrics here..." value={newTrack.lyrics} onChange={e => setNewTrack({...newTrack, lyrics: e.target.value})} className="w-full bg-black/5 border-b-2 border-black/10 p-4 font-medium text-xs outline-none focus:border-black h-32 resize-none leading-relaxed font-mono rounded-xl" wrap="off" /></div><button type="submit" disabled={isUploadingImg} className="w-full bg-black text-white py-6 mt-6 rounded-4xl font-black uppercase tracking-widest text-sm shadow-2xl disabled:opacity-50">{editingId ? 'Update Artifact' : 'Sync Artifact'}</button></form></div></div>
                        </motion.div>
                    )}

                    {/* 🚀 [Tab 2] 플레이리스트 관리 */}
                    {activeTab === 'playlists' && (
                        <motion.div key="playlists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 space-y-4">
                                {playlists.map(pl => (
                                    <div key={pl.id} className={`${glass} p-6 rounded-4xl flex justify-between items-center group shadow-lg border-white/5`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden"><img src={pl.image} className="w-full h-full object-cover" alt="" /></div>
                                            <div className="min-w-0 pr-4">
                                                <p className="font-black uppercase text-xl truncate">{pl.title}</p>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{pl.trackIds?.length || 0} Tracks</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => { setEditingPlaylistId(pl.id); setNewPlaylist(pl); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 text-zinc-400 bg-white/5 hover:bg-white/10 rounded-full"><Edit2 className="w-5 h-5" /></button>
                                            <button onClick={() => { if(window.confirm('플레이리스트를 삭제하시겠습니까?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'playlists', pl.id)) }} className="p-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-full"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="lg:col-span-5">
                                <div className="p-8 lg:p-12 rounded-[3rem] bg-zinc-900 border border-white/10 text-white shadow-2xl sticky top-32">
                                    <h3 className="font-black uppercase tracking-tighter text-2xl mb-8">{editingPlaylistId ? 'Edit Playlist' : 'Create Playlist'}</h3>
                                    <form onSubmit={handleAddOrUpdatePlaylist} className="space-y-6">
                                        <input required placeholder="PLAYLIST TITLE" value={newPlaylist.title} onChange={e => setNewPlaylist({...newPlaylist, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl font-bold uppercase outline-none focus:border-[#004aad]" />
                                        <input placeholder="DESCRIPTION" value={newPlaylist.desc} onChange={e => setNewPlaylist({...newPlaylist, desc: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-[#004aad]" />
                                        
                                        <div className="relative group cursor-pointer">
                                            <input type="file" accept="image/*" onChange={handlePLImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            <div className="p-6 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                                                {isUploadingPLImg ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                <span className="text-[10px] font-black uppercase tracking-widest">Playlist Cover</span>
                                            </div>
                                        </div>
                                        {newPlaylist.image && <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/20 mx-auto"><img src={newPlaylist.image} className="w-full h-full object-cover" alt="" /></div>}

                                        {/* 곡 선택기 */}
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004aad]">Select Tracks</p>
                                            <div className="h-60 overflow-y-auto no-scrollbar bg-black/40 rounded-2xl border border-white/5 p-4 space-y-2">
                                                {tracks.map(t => (
                                                    <div key={t.id} onClick={() => toggleTrackInPL(t.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${newPlaylist.trackIds.includes(t.id) ? 'bg-[#004aad]/20 border border-[#004aad]/50' : 'hover:bg-white/5'}`}>
                                                        <div className="w-8 h-8 rounded bg-zinc-800 shrink-0 overflow-hidden"><img src={t.image} className="w-full h-full object-cover" alt="" /></div>
                                                        <p className="text-xs font-bold truncate flex-1">{t.title}</p>
                                                        {newPlaylist.trackIds.includes(t.id) && <CheckCircle2 className="w-4 h-4 text-[#004aad]" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#004aad] hover:text-white transition-all shadow-xl">
                                            {editingPlaylistId ? 'Update Playlist' : 'Create Playlist'}
                                        </button>
                                        {editingPlaylistId && <button type="button" onClick={() => { setEditingPlaylistId(null); setNewPlaylist({ title: '', desc: '', image: '', trackIds: [] }); }} className="w-full text-[10px] font-black uppercase text-zinc-500 mt-2">Cancel</button>}
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* [Tab 3] 사이트 설정 */}
                    {activeTab === 'config' && (
                        <motion.div key="config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-zinc-900 border border-white/10 p-8 lg:p-12 rounded-[3rem] space-y-12 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><Type className="w-32 h-32 text-[#004aad]" /></div>
                            <div className="grid lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-black uppercase text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#004aad]"/> Director's Pick</h3>
                                    <div className="space-y-4">
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Headline</p><input value={featuredData.headline} onChange={e => setFeaturedData({...featuredData, headline: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad]" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Sub Headline</p><input value={featuredData.subHeadline} onChange={e => setFeaturedData({...featuredData, subHeadline: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad]" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Quote</p><input value={featuredData.quote} onChange={e => setFeaturedData({...featuredData, quote: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad]" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Description</p><textarea value={featuredData.description} onChange={e => setFeaturedData({...featuredData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad] h-32 resize-none" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Target Track</p><select value={featuredData.linkedTrackId} onChange={e => setFeaturedData({...featuredData, linkedTrackId: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-[#004aad] font-bold outline-none cursor-pointer"><option value="">-- 트랙 선택 --</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-xl font-black uppercase text-white flex items-center gap-2"><FileText className="w-5 h-5 text-[#004aad]"/> Text Config</h3>
                                    <div className="space-y-4">
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Philosophy Title</p><input value={siteConfig.phil_title} onChange={e => setSiteConfig({...siteConfig, phil_title: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad]" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Philosophy Desc</p><textarea value={siteConfig.phil_desc} onChange={e => setSiteConfig({...siteConfig, phil_desc: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad] h-24 resize-none" /></div>
                                        <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Philosophy Quote</p><textarea value={siteConfig.phil_quote} onChange={e => setSiteConfig({...siteConfig, phil_quote: e.target.value})} className="w-full bg-black/30 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#004aad] h-20 resize-none" /></div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Guide 1</p><input value={siteConfig.guide_1} onChange={e => setSiteConfig({...siteConfig, guide_1: e.target.value})} className="bg-black/30 border border-white/10 p-3 rounded-xl text-xs text-white w-full" /></div>
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Guide 2</p><input value={siteConfig.guide_2} onChange={e => setSiteConfig({...siteConfig, guide_2: e.target.value})} className="bg-black/30 border border-white/10 p-3 rounded-xl text-xs text-white w-full" /></div>
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Guide 3</p><input value={siteConfig.guide_3} onChange={e => setSiteConfig({...siteConfig, guide_3: e.target.value})} className="bg-black/30 border border-white/10 p-3 rounded-xl text-xs text-white w-full" /></div>
                                            <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Guide 4</p><input value={siteConfig.guide_4} onChange={e => setSiteConfig({...siteConfig, guide_4: e.target.value})} className="bg-black/30 border border-white/10 p-3 rounded-xl text-xs text-white w-full" /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSaveAll} className="w-full bg-[#004aad] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 shadow-xl"><Save className="w-5 h-5" /> Save Changes</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        )}
    </motion.div>
  );
};

export default Admin;