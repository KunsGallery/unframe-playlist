// src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown, Disc, ExternalLink, Heart, Play, Sparkles, MoveRight,
  Headphones, ListMusic, X, Search, User
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import WaveBackground from '../components/WaveBackground';

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

// ✅ src="" 방지
const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

export default function Home({
  tracks = [],
  playlists = [],
  isPlaying = false,
  playTrack,
  userLikes = [],
  handleToggleLike,
  setSelectedTrack,
  db,
  siteConfig,
  rankingTheme,
  allUsers = [],
}) {
  const [featuredData, setFeaturedData] = useState(null);
  const [featuredTrack, setFeaturedTrack] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [displayTracks, setDisplayTracks] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  const scrollContainerRef = useRef(null);

  // ✅ 1.1: rankingTheme undefined 방지
  const safeRankingTheme = useMemo(
    () => rankingTheme ?? { title: "심야의 감상자", desc: "", icon: Sparkles },
    [rankingTheme]
  );

  // ✅ 1.4(성능/안정성): id->track map
  const trackMap = useMemo(() => {
    const m = new Map();
    (tracks || []).forEach(t => { if (t?.id) m.set(t.id, t); });
    return m;
  }, [tracks]);

  // ✅ top3: 정렬 후 slice
  const topThree = useMemo(() => {
    const arr = Array.isArray(allUsers) ? [...allUsers] : [];
    arr.sort((a, b) => (b?.listenCount || 0) - (a?.listenCount || 0));
    return arr.slice(0, 3);
  }, [allUsers]);

  // ✅ 내가 좋아요한 트랙
  const myLikedTracks = useMemo(() => {
    const likeSet = new Set(userLikes || []);
    return (tracks || []).filter(t => t?.id && likeSet.has(t.id));
  }, [tracks, userLikes]);

  // ✅ 1.2: 안전 재생 래퍼
  const safePlay = useCallback((idx, queue) => {
    if (typeof playTrack !== "function") return;
    const q = Array.isArray(queue) ? queue.filter(Boolean) : [];
    if (q.length === 0) return;
    const i = Math.max(0, Math.min(idx ?? 0, q.length - 1));
    playTrack(i, q);
  }, [playTrack]);

  // IG widget script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.lightwidget.com/widgets/lightwidget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  // Featured fetch
  useEffect(() => {
    if (!db) return;

    const fetchFeatured = async () => {
      try {
        const docRef = doc(db, 'artifacts', 'unframe-playlist-v1', 'public', 'data', 'featured', 'directors_pick');
        const snap = await getDoc(docRef);
        if (!snap.exists()) return;

        const data = snap.data();
        setFeaturedData(data);

        if (data?.linkedTrackId) {
          const found = tracks.find(t => t?.id === data.linkedTrackId);
          if (found) setFeaturedTrack(found);
        }
      } catch {}
    };

    fetchFeatured();
  }, [db, tracks]);

  // 랜덤 추천 (검색 없을 때)
  useEffect(() => {
    if (!tracks?.length) return;
    if (searchTerm !== "") return;

    const shuffled = [...tracks].filter(Boolean).sort(() => 0.5 - Math.random());
    setDisplayTracks(shuffled.slice(0, 9));
  }, [tracks, searchTerm]);

  // 검색 결과
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    setDisplayTracks(
      (tracks || []).filter(t => {
        const title = (t?.title || "").toLowerCase();
        const artist = (t?.artist || "").toLowerCase();
        return title.includes(term) || artist.includes(term);
      })
    );
  }, [searchTerm, tracks]);

  // horizontal wheel
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // ✅ 1.3: 모달 데이터 정규화(절대 안 터짐)
  const normalizedSelectedPlaylist = useMemo(() => {
    if (!selectedPlaylist) return null;
    return {
      ...selectedPlaylist,
      title: selectedPlaylist.title ?? "Playlist",
      desc: selectedPlaylist.desc ?? "",
      image: selectedPlaylist.image ?? "",
      items: Array.isArray(selectedPlaylist.items) ? selectedPlaylist.items.filter(Boolean) : [],
      isLike: !!selectedPlaylist.isLike,
    };
  }, [selectedPlaylist]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-24 lg:pb-0">
      {/* Playlists Modal */}
      <AnimatePresence>
        {normalizedSelectedPlaylist && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-500 bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl"
            onClick={() => setSelectedPlaylist(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
              className={`${glass} w-full max-w-4xl h-[80vh] rounded-[3rem] p-8 lg:p-12 border-white/20 shadow-2xl flex flex-col relative overflow-hidden`}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedPlaylist(null)} className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-white/20 transition-all">
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-8">
                <div className="w-40 h-40 lg:w-64 lg:h-64 rounded-4xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl shrink-0 overflow-hidden">
                  {normalizedSelectedPlaylist.isLike ? (
                    <Heart className="w-16 h-16 text-red-500 fill-current" />
                  ) : (
                    safeSrc(normalizedSelectedPlaylist.image)
                      ? <img src={safeSrc(normalizedSelectedPlaylist.image)} className="w-full h-full object-cover" alt="" />
                      : <ListMusic className="w-12 h-12 text-white/30" />
                  )}
                </div>

                <div className="flex flex-col justify-end items-start space-y-4">
                  <span className="px-3 py-1 rounded-full border border-[#004aad] text-[#004aad] text-[10px] font-black uppercase tracking-widest">
                    Playlist
                  </span>

                  <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter leading-none">
                    {normalizedSelectedPlaylist.title}
                  </h2>

                  <p className="text-zinc-400 text-sm">
                    {normalizedSelectedPlaylist.desc} • {normalizedSelectedPlaylist.items.length} tracks
                  </p>

                  <button
                    onClick={() => { safePlay(0, normalizedSelectedPlaylist.items); setSelectedPlaylist(null); }}
                    className="px-8 py-3 bg-[#004aad] text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2 shadow-xl mt-4"
                  >
                    <Play className="w-4 h-4 fill-current" /> Play Playlist
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {normalizedSelectedPlaylist.items.map((track, idx) => {
                  const tImg = safeSrc(track?.image);
                  return (
                    <div
                      key={track?.id ?? `${idx}`}
                      onClick={() => safePlay(idx, normalizedSelectedPlaylist.items)}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="w-8 text-center text-zinc-600 font-bold text-xs">{idx + 1}</div>

                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
                        {tImg ? <img src={tImg} className="w-full h-full object-cover" alt="" /> : <ListMusic className="w-5 h-5 text-white/30" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{track?.title ?? "Untitled"}</p>
                        <p className="text-xs text-zinc-500 truncate">{track?.artist ?? ""}</p>
                      </div>

                      <button className="text-zinc-600 group-hover:text-white">
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="h-screen flex flex-col justify-center items-center relative px-6 lg:px-8 overflow-hidden">
        <WaveBackground isPlaying={isPlaying} />
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 text-center relative pointer-events-none">
          <span className="inline-block px-4 py-1.5 border border-white/20 text-white/60 font-bold tracking-[0.5em] uppercase mb-6 lg:mb-10 backdrop-blur-md rounded-full text-[8px] lg:text-[9px]">
            Listening Gallery
          </span>
          <h2 className={`${h1Title} text-[20vw] lg:text-[14rem] italic-outline`}>
            Project<br /><span className="not-italic text-[#004aad]">UP</span>
          </h2>
          <p className="mt-8 lg:mt-12 text-zinc-500 uppercase tracking-[0.4em] lg:tracking-[0.6em] font-bold text-[9px] lg:text-[10px] max-w-sm mx-auto leading-loose opacity-60">
            전시의 공기를 음악으로 치환하여<br />당신의 일상으로 연결합니다.
          </p>
        </motion.div>
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-24 lg:bottom-16 left-1/2 -translate-x-1/2 opacity-20 z-10">
          <ArrowDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* Philosophy */}
      <section className="py-40 lg:py-60 bg-[#fdfbf7] text-black relative z-20 shadow-[0_-50px_100px_rgba(0,0,0,0.5)]">
        <div className="container mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-7">
            <span className="text-[#004aad] text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] mb-4 lg:mb-6 block">
              {siteConfig?.phil_sub || "Philosophy"}
            </span>
            <h2 className="text-[14vw] lg:text-[8rem] font-black uppercase tracking-tighter leading-[0.8] mb-8 lg:mb-12 whitespace-pre-wrap">
              {siteConfig?.phil_title || "Watching\nBeyond Listening"}
            </h2>
            <div className="h-2 w-24 lg:w-40 bg-black rounded-full" />
          </div>
          <div className="lg:col-span-5 flex flex-col justify-end space-y-6 lg:space-y-10">
            <p className="text-xl lg:text-3xl font-medium leading-tight text-zinc-800">
              {siteConfig?.phil_desc || "'UP'은 전시장의 잔향을 일상의 이어폰 속으로 옮겨오는 프로젝트입니다."}
            </p>
            <p className="text-base lg:text-lg text-zinc-500 font-light leading-relaxed italic border-l-4 border-zinc-200 pl-6 lg:pl-8">
              "{siteConfig?.phil_quote || "전시장의 공기는 눈으로만 보는 것이 아니라, 귀로 들리고 피부로 느껴지는 입체적인 경험입니다."}"
            </p>
          </div>
        </div>
      </section>

      {/* Curator's Atelier */}
      <section className="py-40 lg:py-60 bg-black/40 relative">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 lg:space-y-12">
              <div>
                <h3 className={subTitle}>{featuredData?.subHeadline || "Director's Pick"}</h3>
                <p className="text-4xl lg:text-6xl font-black uppercase mt-4 tracking-tighter italic leading-tight whitespace-pre-wrap">
                  {featuredData?.headline || "Sounds of Silence"}
                </p>
              </div>
              <div className="space-y-6">
                <p className="text-lg lg:text-xl font-bold text-white border-l-4 border-[#004aad] pl-6">
                  "{featuredData?.quote || '큐레이터의 코멘트가 준비중입니다.'}"
                </p>
                <p className="text-sm lg:text-base text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {featuredData?.description || "아직 선정된 큐레이션 트랙이 없습니다."}
                </p>
              </div>

              {featuredTrack && (
                <button
                  onClick={(e) => { e.stopPropagation(); safePlay(0, [featuredTrack]); }}
                  className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-black uppercase text-xs tracking-widest hover:bg-[#004aad] hover:text-white transition-all"
                >
                  <Play className="w-4 h-4 fill-current" /> Play Selection
                </button>
              )}
            </div>

            <div className="relative group cursor-pointer" onClick={() => featuredTrack && setSelectedTrack?.(featuredTrack)}>
              <div className="absolute inset-0 bg-linear-to-tr from-[#004aad] to-purple-600 rounded-[3rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" />
              <div className={`${glass} p-8 rounded-[3rem] relative`}>
                <div className="aspect-square rounded-4xl overflow-hidden mb-6 relative bg-white/5 flex items-center justify-center">
                  {safeSrc(featuredTrack?.image) ? (
                    <img src={safeSrc(featuredTrack?.image)} className="w-full h-full object-cover" alt="Featured" />
                  ) : (
                    <ListMusic className="w-12 h-12 text-white/20" />
                  )}

                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); safePlay(0, [featuredTrack]); }}>
                      <Play className="w-16 h-16 text-white fill-white hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="min-w-0 pr-4">
                    <p className="text-[#004aad] font-black uppercase tracking-widest text-xs mb-2">Featured Track</p>
                    <h4 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter text-white truncate">
                      {featuredTrack?.title || "No Track Selected"}
                    </h4>
                    <p className="text-zinc-500 font-bold mt-1 truncate">{featuredTrack?.artist || "Artist"}</p>
                  </div>
                  <Headphones className="w-8 h-8 text-zinc-600 shrink-0" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Dynamic Honor Hall */}
      <section className="py-40 lg:py-60 px-6 lg:px-8 container mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          <div className={`${glass} p-8 lg:p-12 rounded-[3rem] relative overflow-hidden group min-h-100`}>
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-50 transition-opacity">
              {safeRankingTheme?.icon ? React.createElement(safeRankingTheme.icon, { className: "w-32 h-32 text-[#004aad]" }) : null}
            </div>
            <h4 className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter mb-8 lg:mb-12">
              {safeRankingTheme.title}<br />
              <span className="text-[#004aad] not-italic text-sm lg:text-base tracking-normal opacity-60">
                {safeRankingTheme.desc || ""}
              </span>
            </h4>

            <div className="space-y-4">
              {topThree.map((u, idx) => (
                <div key={u?.id ?? idx} className="flex items-center gap-4 lg:gap-6 p-4 rounded-2xl hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                  <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center font-black text-lg lg:text-2xl ${idx === 0 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : idx === 1 ? 'bg-zinc-400 text-black' : 'bg-orange-700 text-white'}`}>
                    {idx + 1}
                  </div>

                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                    {safeSrc(u?.profileImg) ? <img src={safeSrc(u?.profileImg)} className="w-full h-full object-cover" alt="" /> : <User size={16} className="text-white/20" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg lg:text-xl truncate">{u?.displayName ?? "Collector"}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u?.membership || 'HELLO'}</p>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-2xl lg:text-3xl text-[#004aad]">{u?.listenCount || 0}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase">Points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${glass} p-8 lg:p-12 rounded-[3rem] relative overflow-hidden group min-h-100`}>
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-50 transition-opacity">
              <Sparkles className="w-32 h-32 text-red-500" />
            </div>
            <h4 className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter mb-8 lg:mb-12">
              Trending<br /><span className="text-red-500 not-italic text-lg lg:text-xl tracking-normal">지금 가장 뜨거운 소리</span>
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {(tracks || []).slice(0, 2).map((track, idx) => {
                const tImg = safeSrc(track?.image);
                return (
                  <div key={track?.id ?? idx} onClick={() => setSelectedTrack?.(track)} className="flex items-center gap-4 lg:gap-6 cursor-pointer hover:bg-white/5 p-3 rounded-2xl transition-all">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
                      {tImg ? <img src={tImg} className="w-full h-full object-cover" alt="" /> : <ListMusic className="w-10 h-10 text-white/20" />}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <span className="font-black text-white text-2xl italic">#{idx + 1}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xl lg:text-2xl font-black uppercase truncate tracking-tight">{track?.title ?? "Untitled"}</p>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{track?.artist ?? ""}</p>
                    </div>

                    <button onClick={(e) => { e.stopPropagation(); safePlay(idx, tracks); }} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#004aad] hover:text-white transition-all">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Playlists Section */}
      <section className="py-40 lg:py-60 px-0 container mx-auto">
        <div className="px-6 lg:px-8 mb-12 flex flex-col lg:flex-row justify-between lg:items-end gap-4">
          <div>
            <h3 className={subTitle}>Your Playlists</h3>
            <p className="text-5xl lg:text-[8rem] font-black uppercase mt-4 italic italic-outline tracking-tighter leading-none">Curated Sets</p>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-xs tracking-widest">
            <MoveRight className="w-4 h-4 animate-pulse" /> Scroll to Explore
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex overflow-x-auto gap-6 pb-20 px-6 lg:px-8 snap-x snap-mandatory no-scrollbar">
          {/* Liked Songs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="snap-start shrink-0 w-32 md:w-40 lg:w-48 group cursor-pointer"
            onClick={() => setSelectedPlaylist({ title: "My Liked Songs", desc: "내가 수집한 취향의 조각들", isLike: true, items: myLikedTracks })}
          >
            <div className="aspect-square rounded-3xl overflow-hidden mb-4 relative shadow-lg border border-white/10 bg-linear-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
              <Heart className="w-10 h-10 text-red-500 fill-current drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <ListMusic className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-base lg:text-lg font-black uppercase tracking-tight truncate text-white group-hover:text-red-500 transition-colors">Liked Songs</h4>
              <p className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase truncate">{myLikedTracks.length} Tracks</p>
            </div>
          </motion.div>

          {/* Curated playlists */}
          {(playlists || []).map((pl, idx) => {
            const plItems = pl?.trackIds ? pl.trackIds.map(id => trackMap.get(id)).filter(Boolean) : [];
            const plImg = safeSrc(pl?.image);

            return (
              <motion.div
                key={pl?.id ?? idx}
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: 0.1 * idx }}
                className="snap-start shrink-0 w-32 md:w-40 lg:w-48 group cursor-pointer"
                onClick={() => setSelectedPlaylist({ ...pl, items: plItems })}
              >
                <div className="aspect-square rounded-3xl overflow-hidden mb-4 relative shadow-lg border border-white/10 bg-zinc-900 flex items-center justify-center">
                  {plImg ? (
                    <img src={plImg} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all" alt="" />
                  ) : (
                    <ListMusic className="w-10 h-10 text-white/20" />
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <ListMusic className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base lg:text-lg font-black uppercase tracking-tight truncate text-white group-hover:text-[#004aad] transition-colors">
                    {pl?.title ?? "Playlist"}
                  </h4>
                  <p className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase truncate">{plItems.length} Tracks</p>
                </div>
              </motion.div>
            );
          })}

          <div className="snap-start shrink-0 w-32 md:w-40 lg:w-48 flex items-center justify-center rounded-3xl border-2 border-dashed border-white/10 text-zinc-600 font-black uppercase tracking-widest text-[10px]">
            End
          </div>
        </div>
      </section>

      {/* Search Console */}
      <section className="py-20 lg:py-40 px-6 lg:px-8 bg-zinc-950/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
            <div>
              <h3 className={subTitle}>Sound Discovery</h3>
              <p className="text-3xl font-black uppercase text-white mt-2">Find Your Vibe</p>
            </div>

            <div className="relative w-full md:w-96 group">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search artist or title..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder:text-zinc-600 focus:bg-white/10 focus:border-[#004aad] outline-none transition-all font-bold uppercase text-xs tracking-widest"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#004aad] transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4">
            {displayTracks.length > 0 ? displayTracks.map((track) => {
              const img = safeSrc(track?.image);
              return (
                <div
                  key={track?.id}
                  onClick={() => setSelectedTrack?.(track)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors border-b border-white/5 last:border-0 md:border-0"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
                    {img ? <img src={img} className="w-full h-full object-cover" alt="" /> : <ListMusic className="w-6 h-6 text-white/20" />}
                    <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          safePlay(displayTracks.findIndex(t => t?.id === track?.id), displayTracks);
                        }}
                      >
                        <Play className="w-4 h-4 fill-white text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{track?.title ?? "Untitled"}</p>
                    <p className="text-xs text-zinc-500 truncate">{track?.artist ?? ""}</p>
                  </div>

                  <button
                    onClick={(e) => handleToggleLike?.(e, track?.id)}
                    className={`p-2 transition-all ${userLikes.includes(track?.id) ? 'text-red-500' : 'text-zinc-600 hover:text-white'}`}
                  >
                    <Heart size={18} className={userLikes.includes(track?.id) ? 'fill-current' : ''} />
                  </button>
                </div>
              );
            }) : (
              <div className="col-span-full py-20 text-center text-zinc-600">
                <p className="text-xl font-bold uppercase">No tracks found</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Instagram Signal */}
      <section className="px-6 lg:px-8 container mx-auto py-32 border-t border-white/5 overflow-hidden">
        <div className="mb-12 flex justify-between items-end">
          <div>
            <span className={subTitle + " text-[10px] mb-3 block italic"}>Live Vibe</span>
            <h2 className={`${h1Title} text-5xl lg:text-7xl`}>Signal<br />Moments</h2>
          </div>
          <a href="https://instagram.com/unframe.playlist" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-2">
            Follow Us <ExternalLink size={14} />
          </a>
        </div>

        <div className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40">
          <iframe
            src="//lightwidget.com/widgets/2c45aca067de5705bece3725c4e2ca5d.html"
            scrolling="no"
            allowtransparency="true"
            className="lightwidget-widget"
            style={{ width: '100%', border: '0', overflow: 'hidden' }}
            title="instagram"
          />
        </div>
      </section>

      {/* Connection */}
      <section className="py-40 lg:py-60 px-6 lg:px-8 bg-black relative overflow-hidden">
        <div className="container mx-auto text-center space-y-16 lg:space-y-24 relative z-10">
          <div className="space-y-4 lg:space-y-6">
            <span className={subTitle}>Streaming Connection</span>
            <h2 className={`${h1Title} text-[12vw] lg:text-[7.5rem] leading-none`}>
              Carry the<br /><span className="text-[#004aad]">Vibe Outside</span>
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row justify-center gap-6 lg:gap-12 max-w-5xl mx-auto w-full">
            <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-12 lg:py-16 rounded-4xl lg:rounded-[4rem] bg-zinc-900/50 border border-white/5 hover:border-red-600 transition-all group flex flex-col items-center gap-6 lg:gap-8 shadow-xl">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-red-600/20 shadow-2xl">
                <Play className="w-8 h-8 lg:w-10 lg:h-10 fill-white text-white" />
              </div>
              <p className="text-xl lg:text-2xl font-black uppercase tracking-tighter">YouTube Music</p>
            </a>

            <a href="https://spotify.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-12 lg:py-16 rounded-4xl lg:rounded-[4rem] bg-zinc-900/50 border border-white/5 hover:border-green-500 transition-all group flex flex-col items-center gap-6 lg:gap-8 shadow-xl">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-green-500/20 shadow-2xl">
                <Disc className="w-8 h-8 lg:w-10 lg:h-10 text-black fill-black" />
              </div>
              <p className="text-xl lg:text-2xl font-black uppercase tracking-tighter">Spotify</p>
            </a>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,74,173,0.1)_0%,transparent_70%)] z-0 pointer-events-none" />
      </section>
    </motion.div>
  );
}