// src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown,
  Disc,
  ExternalLink,
  Heart,
  Play,
  Sparkles,
  MoveRight,
  ChevronLeft,
  ChevronRight,
  Headphones,
  ListMusic,
  X,
  Search,
  User
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import WaveBackground from '../components/WaveBackground';

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

const GENRE_OPTIONS = [
  "All",
  "Ambient",
  "Lo-fi",
  "Jazz",
  "Classical",
  "Electronic",
  "Experimental",
  "Hip-Hop",
  "Blues",
  "Rock",
  "Pop",
  "R&B",
  "Soundtrack",
  "Vocal",
];

const getTrackGenre = (track) => track?.genre || track?.tag || "Ambient";

export default function Home({
  tracks = [],
  playlists = [],
  isPlaying = false,
  currentTrack,
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
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [displayTracks, setDisplayTracks] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const scrollContainerRef = useRef(null);

  const safeRankingTheme = useMemo(
    () => rankingTheme ?? { title: "심야의 감상자", desc: "", icon: Sparkles },
    [rankingTheme]
  );

  const trackMap = useMemo(() => {
    const m = new Map();
    (tracks || []).forEach(t => { if (t?.id) m.set(t.id, t); });
    return m;
  }, [tracks]);

  const topThree = useMemo(() => {
    const arr = Array.isArray(allUsers) ? [...allUsers] : [];
    arr.sort((a, b) => (b?.listenCount || 0) - (a?.listenCount || 0));
    return arr.slice(0, 3);
  }, [allUsers]);

  const myLikedTracks = useMemo(() => {
    const likeSet = new Set(userLikes || []);
    return (tracks || []).filter(t => t?.id && likeSet.has(t.id));
  }, [tracks, userLikes]);

  const genrePlaylists = useMemo(() => {
    return GENRE_OPTIONS
      .filter((genre) => genre !== "All")
      .map((genre) => {
        const items = (tracks || []).filter((track) => getTrackGenre(track) === genre);
        return {
          id: `genre-${genre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: genre,
          desc: `${genre} selection`,
          image: items?.[0]?.image || "",
          items,
        };
      })
      .filter((playlist) => playlist.items.length > 0);
  }, [tracks]);

  const latestTracks = useMemo(() => {
    return [...(tracks || [])]
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a?.createdAt?.seconds ? a.createdAt.seconds : (a?.createdAt || 0);
        const bTime = b?.createdAt?.seconds ? b.createdAt.seconds : (b?.createdAt || 0);
        return bTime - aTime;
      });
  }, [tracks]);

  const exhibitionOstTracks = useMemo(() => {
    const soundtrack = (tracks || []).filter((track) => getTrackGenre(track) === "Soundtrack");
    if (soundtrack.length > 0) return soundtrack.slice(0, 5);
    return latestTracks.slice(0, 5);
  }, [tracks, latestTracks]);

  const newAlbumTracks = useMemo(() => latestTracks.slice(0, 4), [latestTracks]);

  const featuredPlaylist = useMemo(() => {
    const firstCustomPlaylist = (playlists || []).find((pl) => Array.isArray(pl?.items) && pl.items.length > 0);
    if (firstCustomPlaylist) return firstCustomPlaylist;

    const firstGenrePlaylist = genrePlaylists[0];
    if (firstGenrePlaylist) return firstGenrePlaylist;

    return null;
  }, [playlists, genrePlaylists]);

  const safePlay = useCallback((idx, queue, context = null) => {
    if (typeof playTrack !== "function") return;
    const q = Array.isArray(queue) ? queue.filter(Boolean) : [];
    if (q.length === 0) return;
    const i = Math.max(0, Math.min(idx ?? 0, q.length - 1));
    playTrack(i, q, context ?? undefined);
  }, [playTrack]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.lightwidget.com/widgets/lightwidget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

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

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    let filtered = [...(tracks || [])].filter(Boolean);

    if (selectedGenre !== "All") {
      filtered = filtered.filter((track) => getTrackGenre(track) === selectedGenre);
    }

    if (term) {
      filtered = filtered.filter((track) => {
        const title = (track?.title || "").toLowerCase();
        const artist = (track?.artist || "").toLowerCase();
        const genre = getTrackGenre(track).toLowerCase();
        return title.includes(term) || artist.includes(term) || genre.includes(term);
      });
      setDisplayTracks(filtered);
      return;
    }

    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    setDisplayTracks(shuffled.slice(0, 9));
  }, [tracks, searchTerm, selectedGenre]);

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

  const heroSlides = useMemo(() => {
    const adminSlides = Array.isArray(siteConfig?.heroSlides)
      ? siteConfig.heroSlides.filter((slide) => slide?.isActive !== false)
      : [];

    if (adminSlides.length > 0) {
      return adminSlides
        .map((slide, idx) => {
          const linkedPlaylist = slide?.linkedPlaylistId
            ? (playlists || []).find((pl) => pl.id === slide.linkedPlaylistId)
            : null;

          const linkedTracks = Array.isArray(slide?.trackIds)
            ? slide.trackIds.map((id) => trackMap.get(id)).filter(Boolean)
            : [];

          const playlistItems = Array.isArray(linkedPlaylist?.items)
            ? linkedPlaylist.items.filter(Boolean)
            : [];

          const items = linkedTracks.length > 0 ? linkedTracks : playlistItems;

          const fallbackImage =
            safeSrc(slide?.coverImage) ||
            safeSrc(slide?.backgroundImage) ||
            safeSrc(items?.[0]?.image) ||
            safeSrc(linkedPlaylist?.image) ||
            "";

          return {
            id: slide?.id || `hero-slide-${idx + 1}`,
            type: slide?.type || "featured_playlist",
            eyebrow: slide?.eyebrow || "Featured",
            title: slide?.title || "Untitled Slide",
            subtitle: slide?.subtitle || "",
            description: slide?.description || "",
            buttonLabel: slide?.buttonLabel || "Open",
            backgroundImage: safeSrc(slide?.backgroundImage) || fallbackImage,
            coverImage: safeSrc(slide?.coverImage) || fallbackImage,
            items,
            sourcePlaylist: linkedPlaylist || null,
          };
        })
        .filter((slide) => slide.items?.length > 0 || slide.sourcePlaylist);
    }

    const slides = [];

    if (exhibitionOstTracks.length > 0) {
      slides.push({
        id: "hero-exhibition-ost",
        type: "exhibition_ost",
        eyebrow: "Exhibition OST",
        title: "Sound For The Space",
        subtitle: "전시의 공기를 음악으로 확장하는 큐레이션",
        description: "현재 전시의 무드와 서사를 사운드로 이어주는 OST 셀렉션입니다.",
        backgroundImage: safeSrc(exhibitionOstTracks[0]?.image),
        coverImage: safeSrc(exhibitionOstTracks[0]?.image),
        items: exhibitionOstTracks,
        buttonLabel: "Play OST",
      });
    }

    if (newAlbumTracks.length > 0) {
      slides.push({
        id: "hero-new-album",
        type: "new_album",
        eyebrow: "New Release",
        title: newAlbumTracks[0]?.title || "New Album",
        subtitle: newAlbumTracks[0]?.artist || "UNFRAME PLAYLIST",
        description: "지금 가장 먼저 보여주고 싶은 최신 사운드를 전면에 배치했습니다.",
        coverImage: safeSrc(newAlbumTracks[0]?.image),
        items: newAlbumTracks,
        buttonLabel: "Play Release",
      });
    }

    if (featuredPlaylist?.items?.length > 0) {
      slides.push({
        id: "hero-featured-playlist",
        type: "featured_playlist",
        eyebrow: "Featured Playlist",
        title: featuredPlaylist.title || "Featured Playlist",
        subtitle: "Curated by UNFRAME",
        description: featuredPlaylist.desc || "분위기와 흐름을 고려해 선별한 대표 플레이리스트입니다.",
        coverImage: safeSrc(featuredPlaylist.image || featuredPlaylist.items?.[0]?.image),
        items: featuredPlaylist.items,
        sourcePlaylist: featuredPlaylist,
        buttonLabel: "Open Playlist",
      });
    }

    return slides;
  }, [siteConfig?.heroSlides, playlists, trackMap, exhibitionOstTracks, newAlbumTracks, featuredPlaylist]);

  useEffect(() => {
    if (heroIndex > heroSlides.length - 1) {
      setHeroIndex(0);
    }
  }, [heroIndex, heroSlides.length]);

  const currentHero = heroSlides[heroIndex] || null;

  const goPrevHero = () => {
    if (!heroSlides.length) return;
    setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goNextHero = () => {
    if (!heroSlides.length) return;
    setHeroIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const openHeroSlide = (slide) => {
    if (!slide) return;

    if (slide.type === "featured_playlist" && slide.sourcePlaylist?.items?.length) {
      setSelectedPlaylist({
        id: slide.sourcePlaylist.id,
        title: slide.sourcePlaylist.title,
        desc: slide.sourcePlaylist.desc,
        image: slide.sourcePlaylist.image || slide.sourcePlaylist.items?.[0]?.image || "",
        items: slide.sourcePlaylist.items,
      });
      return;
    }

    if (slide.items?.length) {
      safePlay(0, slide.items, { playlistKey: slide.id });
    }
  };

  const normalizedSelectedPlaylist = useMemo(() => {
    if (!selectedPlaylist) return null;

    const pid = selectedPlaylist.id ?? selectedPlaylist.playlistId ?? selectedPlaylist.title ?? "playlist";
    return {
      ...selectedPlaylist,
      id: pid,
      title: selectedPlaylist.title ?? "Playlist",
      desc: selectedPlaylist.desc ?? "",
      image: selectedPlaylist.image ?? "",
      items: Array.isArray(selectedPlaylist.items) ? selectedPlaylist.items.filter(Boolean) : [],
      isLike: !!selectedPlaylist.isLike,
    };
  }, [selectedPlaylist]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-24 lg:pb-0">
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
                    onClick={() => {
                      safePlay(0, normalizedSelectedPlaylist.items, { playlistKey: normalizedSelectedPlaylist.id });
                      setSelectedPlaylist(null);
                    }}
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
                      onClick={() => safePlay(idx, normalizedSelectedPlaylist.items, { playlistKey: normalizedSelectedPlaylist.id })}
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

      {/* Hero Featured Slider */}
      <section className="min-h-screen pt-28 lg:pt-36 px-6 lg:px-8 relative overflow-hidden">
        <WaveBackground isPlaying={isPlaying} />

        <div className="container mx-auto relative z-10">
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <span className={`${subTitle} text-[10px] block mb-3`}>Now Showing</span>
              <h1 className={`${h1Title} text-[16vw] md:text-[10vw] lg:text-[6rem]`}>
                Featured<br />Sounds
              </h1>
            </div>

            {heroSlides.length > 1 && (
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={goPrevHero}
                  className="w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goNextHero}
                  className="w-12 h-12 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {currentHero ? (
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentHero.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden border border-white/10 min-h-[560px] lg:min-h-[680px]"
                >
                  {currentHero.type === "exhibition_ost" && currentHero.backgroundImage ? (
                    <>
                      <img src={currentHero.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" />
                      <div className="absolute inset-0 bg-black/55" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,74,173,0.25),transparent_35%),linear-gradient(120deg,rgba(0,0,0,0.65),rgba(0,0,0,0.25))]" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#050505_0%,#0d1320_45%,#111827_100%)]" />
                  )}

                  <div className="relative z-10 grid lg:grid-cols-[1.2fr_0.8fr] min-h-[560px] lg:min-h-[680px]">
                    <div className="p-8 md:p-10 lg:p-14 flex flex-col justify-between">
                      <div className="space-y-5">
                        <span className="inline-flex px-4 py-2 rounded-full border border-white/15 bg-white/5 text-[10px] font-black uppercase tracking-[0.35em] text-white/80">
                          {currentHero.eyebrow}
                        </span>

                        <div className="space-y-3">
                          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-[-0.06em] leading-[0.9] text-white">
                            {currentHero.title}
                          </h2>
                          <p className="text-sm md:text-base uppercase tracking-[0.25em] text-[#8db4ff] font-bold">
                            {currentHero.subtitle}
                          </p>
                        </div>

                        <p className="max-w-2xl text-zinc-300 leading-relaxed text-sm md:text-base">
                          {currentHero.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-10">
                        <button
                          onClick={() => openHeroSlide(currentHero)}
                          className="px-8 py-4 rounded-full bg-white text-black hover:bg-[#004aad] hover:text-white transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          {currentHero.buttonLabel}
                        </button>

                        {currentHero.type === "featured_playlist" && (
                          <button
                            onClick={() => openHeroSlide(currentHero)}
                            className="px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
                          >
                            <ListMusic className="w-4 h-4" />
                            View Playlist
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-8 md:p-10 lg:p-14 flex items-center justify-center">
                      {currentHero.type === "exhibition_ost" ? (
                        <div className="w-full max-w-xl rounded-[2rem] bg-black/35 backdrop-blur-2xl border border-white/10 p-6 lg:p-8 shadow-2xl">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-[1.25rem] overflow-hidden bg-white/5 border border-white/10 shrink-0">
                              {currentHero.coverImage ? (
                                <img src={currentHero.coverImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Headphones className="w-8 h-8 text-white/30" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8db4ff] mb-2">
                                Exhibition OST
                              </p>
                              <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white">
                                {currentHero.title}
                              </h3>
                              <p className="text-zinc-400 text-sm mt-1">
                                {currentHero.items.length} curated tracks
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {currentHero.items.slice(0, 5).map((track, idx) => (
                              <button
                                key={track?.id ?? `${currentHero.id}-${idx}`}
                                onClick={() => safePlay(idx, currentHero.items, { playlistKey: currentHero.id })}
                                className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition-all text-left"
                              >
                                <div className="w-7 text-center text-zinc-500 text-xs font-bold">{idx + 1}</div>
                                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 shrink-0">
                                  {safeSrc(track?.image) ? (
                                    <img src={safeSrc(track?.image)} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ListMusic className="w-4 h-4 text-white/25" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black uppercase tracking-tight text-white truncate">
                                    {track?.title ?? "Untitled"}
                                  </p>
                                  <p className="text-[11px] text-zinc-400 uppercase tracking-widest truncate">
                                    {track?.artist ?? ""}
                                  </p>
                                </div>
                                <Play className="w-4 h-4 text-white/70" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : currentHero.type === "new_album" ? (
                        <div className="w-full max-w-[420px]">
                          <div className="relative aspect-square rounded-[2.25rem] overflow-hidden border border-white/10 shadow-[0_35px_80px_rgba(0,0,0,0.45)] bg-white/5 mb-6">
                            {currentHero.coverImage ? (
                              <img src={currentHero.coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Disc className="w-12 h-12 text-white/25" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent_50%)]" />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {currentHero.items.slice(0, 4).map((track, idx) => (
                              <button
                                key={track?.id ?? `${currentHero.id}-${idx}`}
                                onClick={() => safePlay(idx, currentHero.items, { playlistKey: currentHero.id })}
                                className="p-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all text-left"
                              >
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#8db4ff] mb-2">
                                  Track {idx + 1}
                                </p>
                                <p className="text-sm font-black uppercase tracking-tight text-white truncate">
                                  {track?.title ?? "Untitled"}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 truncate mt-1">
                                  {track?.artist ?? ""}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-[460px]">
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            {(currentHero.items || []).slice(0, 4).map((track, idx) => (
                              <div
                                key={track?.id ?? `${currentHero.id}-${idx}`}
                                className={`aspect-square rounded-[1.75rem] overflow-hidden border border-white/10 bg-white/5 ${idx === 0 ? "translate-y-4" : idx === 1 ? "-translate-y-2" : idx === 2 ? "translate-y-2" : "-translate-y-4"}`}
                              >
                                {safeSrc(track?.image) ? (
                                  <img src={safeSrc(track?.image)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ListMusic className="w-8 h-8 text-white/25" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8db4ff] mb-3">
                              Curated by UNFRAME
                            </p>
                            <p className="text-zinc-300 text-sm leading-relaxed">
                              분위기와 서사의 흐름을 고려해 선택된 플레이리스트입니다. 전시, 공간, 시간대에 따라 다른 결로 작동합니다.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {heroSlides.length > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {heroSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setHeroIndex(idx)}
                      className={`h-2.5 rounded-full transition-all ${heroIndex === idx ? "w-10 bg-[#004aad]" : "w-2.5 bg-white/20 hover:bg-white/40"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[3rem] border border-white/10 min-h-[520px] flex items-center justify-center bg-white/[0.02]">
              <div className="text-center">
                <p className={`${subTitle} text-[10px] mb-3 block`}>Now Showing</p>
                <p className="text-3xl font-black uppercase">No Featured Content Yet</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Director's Pick */}
      <section className="py-24 lg:py-32 px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="mb-12">
            <span className={`${subTitle} text-[10px] mb-3 block`}>Director’s Pick</span>
            <h2 className={`${h1Title} text-5xl lg:text-7xl`}>
              A Selected<br />Track
            </h2>
          </div>

          <div className={`${glass} rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden`}>
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="aspect-square lg:aspect-auto min-h-[360px] lg:min-h-[540px] bg-white/5 border-r border-white/10 overflow-hidden relative">
                {safeSrc(featuredData?.image || featuredTrack?.image) ? (
                  <img
                    src={safeSrc(featuredData?.image || featuredTrack?.image)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Headphones className="w-14 h-14 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent_40%)]" />
              </div>

              <div className="p-8 md:p-10 lg:p-14 flex flex-col justify-between">
                <div className="space-y-5">
                  <span className="inline-flex px-4 py-2 rounded-full border border-[#004aad]/30 bg-[#004aad]/10 text-[#8db4ff] text-[10px] font-black uppercase tracking-[0.35em]">
                    Director’s Pick
                  </span>

                  <div className="space-y-3">
                    <h3 className="text-4xl lg:text-6xl font-black uppercase tracking-[-0.05em] leading-[0.92]">
                      {featuredData?.title || featuredTrack?.title || "Featured Track"}
                    </h3>
                    <p className="text-sm uppercase tracking-[0.3em] text-zinc-400 font-bold">
                      {featuredData?.artist || featuredTrack?.artist || "UNFRAME"}
                    </p>
                  </div>

                  <p className="text-zinc-300 leading-relaxed max-w-2xl">
                    {featuredData?.description || "디렉터가 지금 가장 먼저 들려주고 싶은 한 곡을 전면에 소개합니다."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-10">
                  <button
                    onClick={() => {
                      if (featuredTrack) {
                        const idx = tracks.findIndex((t) => t?.id === featuredTrack.id);
                        if (idx >= 0) safePlay(idx, tracks, { playlistKey: "directors_pick" });
                      }
                    }}
                    className="px-8 py-4 rounded-full bg-[#004aad] text-white hover:bg-white hover:text-black transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play Pick
                  </button>

                  {featuredTrack && (
                    <button
                      onClick={() => setSelectedTrack?.(featuredTrack)}
                      className="px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
                    >
                      <MoveRight className="w-4 h-4" />
                      View Detail
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="min-h-screen px-6 lg:px-8 py-24 lg:py-40 flex items-center border-t border-white/5">
        <div className="container mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div className="space-y-10 lg:space-y-14">
            <div className="space-y-4">
              <span className={subTitle}>Philosophy</span>
              <h2 className={`${h1Title} text-6xl lg:text-8xl max-w-xs`}>
                Beyond<br />the Frame.
              </h2>
            </div>

            <div className="max-w-lg">
              <p className="text-zinc-400 leading-relaxed text-base lg:text-lg">
                {siteConfig?.phil_desc || "UNFRAME PLAYLIST는 전시의 분위기와 감각을 음악으로 번역해, 감상 이후의 시간을 확장하는 사운드 아카이브입니다."}
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`${glass} rounded-[3rem] p-8 lg:p-12 max-w-2xl ml-auto`}
          >
            <div className="space-y-8">
              <div className="w-14 h-14 rounded-full bg-[#004aad]/10 flex items-center justify-center text-[#004aad]">
                <Sparkles className="w-6 h-6" />
              </div>

              <blockquote className="text-2xl lg:text-4xl font-black uppercase tracking-tight leading-[1.15]">
                {siteConfig?.phil_quote || "Sound becomes another way to remember a space."}
              </blockquote>

              <p className="text-zinc-500 text-sm uppercase tracking-[0.35em]">
                UNFRAME PLAYLIST
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ranking & Likes */}
      <section className="px-6 lg:px-8 container mx-auto py-24 lg:py-32 border-t border-white/5">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14">
          <div className={`${glass} rounded-[2.25rem] p-8 lg:p-10`}>
            <div className="mb-8">
              <span className={`${subTitle} text-[10px] mb-3 block`}>Top Listeners</span>
              <h3 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
                {safeRankingTheme.title}
              </h3>
              <p className="text-zinc-500 text-sm mt-3">{safeRankingTheme.desc}</p>
            </div>

            <div className="space-y-3">
              {topThree.length > 0 ? topThree.map((userItem, idx) => {
                const Icon = safeRankingTheme?.icon || Sparkles;
                return (
                  <div key={userItem?.uid ?? idx} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                    <div className="w-10 h-10 rounded-full bg-[#004aad]/15 text-[#8db4ff] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black uppercase tracking-tight truncate">
                        {userItem?.nickname || userItem?.displayName || `Listener ${idx + 1}`}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                        {userItem?.listenCount || 0} listens
                      </p>
                    </div>
                    <div className="text-lg font-black text-[#8db4ff]">#{idx + 1}</div>
                  </div>
                );
              }) : (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 text-zinc-500 text-sm">
                  No ranking data yet
                </div>
              )}
            </div>
          </div>

          <div className={`${glass} rounded-[2.25rem] p-8 lg:p-10`}>
            <div className="mb-8">
              <span className={`${subTitle} text-[10px] mb-3 block`}>My Archive</span>
              <h3 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
                Liked Tracks
              </h3>
            </div>

            <div className="space-y-3">
              {myLikedTracks.length > 0 ? myLikedTracks.slice(0, 6).map((track, idx) => (
                <button
                  key={track?.id ?? idx}
                  onClick={() => safePlay(idx, myLikedTracks, { playlistKey: "liked_tracks" })}
                  className="w-full text-left flex items-center gap-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 p-4 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {safeSrc(track?.image) ? (
                      <img src={safeSrc(track?.image)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white/25" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-tight truncate">{track?.title}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 truncate">{track?.artist}</p>
                  </div>
                  <Heart className="w-4 h-4 text-red-500 fill-current" />
                </button>
              )) : (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 text-zinc-500 text-sm">
                  Save some tracks and build your archive.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Playlist Rail */}
      <section className="py-24 lg:py-32 px-6 lg:px-8 border-t border-white/5">
        <div className="container mx-auto">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <h3 className={subTitle}>Playlists</h3>
              <p className="text-3xl font-black uppercase text-white mt-2">Curated Collections</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              scroll sideways
            </span>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
          >
            {(playlists || []).map((pl, idx) => {
              const plItems = Array.isArray(pl?.items) ? pl.items.filter(Boolean) : [];
              const coverImg = safeSrc(pl?.image || plItems?.[0]?.image);

              return (
                <motion.div
                  key={pl?.id ?? idx}
                  whileHover={{ y: -6 }}
                  onClick={() =>
                    setSelectedPlaylist({
                      id: pl?.id ?? `playlist-${idx}`,
                      title: pl?.title ?? "Playlist",
                      desc: pl?.desc ?? "",
                      image: coverImg || "",
                      items: plItems,
                    })
                  }
                  className="snap-start shrink-0 w-72 md:w-80 lg:w-96 rounded-[2rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all p-5 cursor-pointer group"
                >
                  <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 mb-5 relative">
                    {coverImg ? (
                      <img src={coverImg} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic className="w-10 h-10 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.35),transparent_50%)]" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-white group-hover:text-[#8db4ff] transition-colors">
                      {pl?.title ?? "Playlist"}
                    </h4>
                    <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                      {plItems.length} tracks
                    </p>
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {pl?.desc ?? "Curated selection"}
                    </p>
                  </div>
                </motion.div>
              );
            })}

            {genrePlaylists.map((pl) => {
              const plItems = pl.items || [];
              const coverImg = safeSrc(pl.image);

              return (
                <motion.div
                  key={pl.id}
                  whileHover={{ y: -6 }}
                  onClick={() => setSelectedPlaylist(pl)}
                  className="snap-start shrink-0 w-72 md:w-80 lg:w-96 rounded-[2rem] border border-white/10 bg-[#004aad]/[0.06] hover:bg-[#004aad]/[0.1] transition-all p-5 cursor-pointer group"
                >
                  <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 mb-5 relative">
                    {coverImg ? (
                      <img src={coverImg} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic className="w-10 h-10 text-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8db4ff]">
                      Genre Playlist
                    </p>
                    <h4 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-white">
                      {pl.title}
                    </h4>
                    <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                      {plItems.length} tracks
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search Console */}
      <section className="py-20 lg:py-40 px-6 lg:px-8 bg-zinc-950/50 border-t border-white/5">
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
                placeholder="Search artist, title or genre..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder:text-zinc-600 focus:bg-white/10 focus:border-[#004aad] outline-none transition-all font-bold uppercase text-xs tracking-widest"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#004aad] transition-colors" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-10">
            {GENRE_OPTIONS.map((genre) => {
              const active = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                    active
                      ? "bg-[#004aad] text-white border-[#004aad]"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:border-white/20"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4">
            {displayTracks.length > 0 ? displayTracks.map((track) => {
              const img = safeSrc(track?.image);
              const isActive = currentTrack?.id === track?.id;

              return (
                <div
                  key={track?.id}
                  onClick={() => safePlay(displayTracks.findIndex((t) => t?.id === track?.id), displayTracks)}
                  className={`
                    relative flex items-center gap-4 p-3 rounded-xl cursor-pointer group
                    border-b border-white/5 last:border-0 md:border-0
                    transition-all duration-300 ease-out
                    ${isActive
                      ? 'bg-[#004aad]/10 shadow-[0_0_20px_rgba(0,74,173,0.25)] scale-[1.01]'
                      : 'hover:bg-white/5 hover:scale-[1.01]'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#004aad] shadow-[0_0_12px_#004aad]" />
                  )}

                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative bg-white/5 flex items-center justify-center">
                    {img ? (
                      <img
                        src={img}
                        className={`w-full h-full object-cover transition-all duration-300 ${isActive ? 'brightness-110' : ''}`}
                        alt=""
                      />
                    ) : (
                      <ListMusic className="w-6 h-6 text-white/20" />
                    )}

                    <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          safePlay(displayTracks.findIndex((t) => t?.id === track?.id), displayTracks);
                        }}
                      >
                        <Play className="w-4 h-4 fill-white text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black uppercase truncate tracking-tight transition-colors duration-300 ${isActive ? 'text-[#004aad]' : 'text-white'}`}>
                      {track?.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest truncate">
                      {track?.artist}
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest truncate mt-1">
                      {getTrackGenre(track)}
                    </p>
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
            src="//cdn.lightwidget.com/widgets/2c45aca067de5705bece3725c4e2ca5d.html"
            scrolling="no"
            allowtransparency="true"
            className="lightwidget-widget"
            style={{ width: '100%', border: '0', overflow: 'hidden' }}
            title="instagram"
          />
        </div>
      </section>

      {/* Artist Links */}
      <section className="py-40 lg:py-60 px-6 lg:px-8 bg-black relative overflow-hidden border-t border-white/5">
        <div className="container mx-auto text-center space-y-16 lg:space-y-24 relative z-10">
          <div className="space-y-4 lg:space-y-6">
            <span className={subTitle}>Artist Links</span>
            <h2 className={`${h1Title} text-[12vw] lg:text-[7.5rem] leading-none`}>
              Carry the<br /><span className="text-[#004aad]">Sound Further</span>
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto text-sm lg:text-base">
              UNFRAME PLAYLIST의 사운드를 각 플랫폼에서도 이어서 감상해보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6 max-w-7xl mx-auto w-full">
            <a
              href="https://open.spotify.com/artist/1lu0wRgtVrx7h0RNzC0WOv?si=02r_uJuTTNOLbZAKvfZAfg"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-green-500/50 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
            >
              <div className="flex items-start justify-between mb-10">
                <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-[0_10px_30px_rgba(34,197,94,0.25)] group-hover:scale-105 transition-transform">
                  <Disc className="w-7 h-7 text-black fill-black" />
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">Spotify</h3>
              <p className="text-sm text-zinc-400 mt-3">가장 익숙한 글로벌 스트리밍 환경에서 바로 이어듣기</p>
            </a>

            <a
              href="https://music.youtube.com/channel/UCyvqImlLyNylao0uqjF8CSg?si=gkzcfBXoEyLYecPS"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-red-500/50 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
            >
              <div className="flex items-start justify-between mb-10">
                <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-[0_10px_30px_rgba(220,38,38,0.25)] group-hover:scale-105 transition-transform">
                  <Play className="w-7 h-7 text-white fill-white" />
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">YouTube Music</h3>
              <p className="text-sm text-zinc-400 mt-3">비디오 감성과 함께 유튜브 뮤직에서 아티스트 페이지 이동</p>
            </a>

            <a
              href="https://music.apple.com/kr/artist/uppu/1883471629"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-white/25 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
            >
              <div className="flex items-start justify-between mb-10">
                <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_10px_30px_rgba(255,255,255,0.16)] group-hover:scale-105 transition-transform">
                  <Headphones className="w-7 h-7" />
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">Apple Music</h3>
              <p className="text-sm text-zinc-400 mt-3">보다 정제된 환경에서 앨범과 싱글을 감상할 수 있는 링크</p>
            </a>

            <a
              href="https://www.music-flo.com/detail/artist/413577114/track?sortType=POPULARITY&roleType=ALL"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-[#004aad]/60 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
            >
              <div className="flex items-start justify-between mb-10">
                <div className="w-14 h-14 rounded-2xl bg-[#004aad] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,74,173,0.25)] group-hover:scale-105 transition-transform">
                  <ListMusic className="w-7 h-7" />
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">FLO</h3>
              <p className="text-sm text-zinc-400 mt-3">국내 청취 환경에서 보다 가깝게 접근할 수 있는 아티스트 페이지</p>
            </a>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,74,173,0.1)_0%,transparent_70%)] z-0 pointer-events-none" />
      </section>
    </motion.div>
  );
}