import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import PlaylistModal from "../components/home/PlaylistModal";
import HeroSlider from "../components/home/HeroSlider";
import DirectorsPick from "../components/home/DirectorsPick";
import ListenerArchiveSummary from "../components/home/ListenerArchiveSummary";
import PlaylistRail from "../components/home/PlaylistRail";
import SearchDiscovery from "../components/home/SearchDiscovery";
import InstagramSignal from "../components/home/InstagramSignal";
import ArtistLinks from "../components/home/ArtistLinks";

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
  appId,
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
    (tracks || []).forEach((t) => {
      if (t?.id) m.set(t.id, t);
    });
    return m;
  }, [tracks]);

  const topThree = useMemo(() => {
    const arr = Array.isArray(allUsers) ? [...allUsers] : [];
    arr.sort((a, b) => (b?.listenCount || 0) - (a?.listenCount || 0));
    return arr.slice(0, 3);
  }, [allUsers]);

  const myLikedTracks = useMemo(() => {
    const likeSet = new Set(userLikes || []);
    return (tracks || []).filter((t) => t?.id && likeSet.has(t.id));
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
    if (!db || !appId) return;

    const fetchFeatured = async () => {
      try {
        const docRef = doc(db, "artifacts", appId, "public", "data", "featured", "directors_pick");
        const snap = await getDoc(docRef);
        if (!snap.exists()) return;

        const data = snap.data();
        setFeaturedData(data);

        if (data?.linkedTrackId) {
          const found = tracks.find((t) => t?.id === data.linkedTrackId);
          if (found) setFeaturedTrack(found);
        }
      } catch {}
    };

    fetchFeatured();
  }, [db, appId, tracks]);

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

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-20 lg:pb-0">
      <PlaylistModal
        normalizedSelectedPlaylist={normalizedSelectedPlaylist}
        setSelectedPlaylist={setSelectedPlaylist}
        safePlay={safePlay}
      />

      <HeroSlider
        currentHero={currentHero}
        heroSlides={heroSlides}
        heroIndex={heroIndex}
        setHeroIndex={setHeroIndex}
        goPrevHero={goPrevHero}
        goNextHero={goNextHero}
        openHeroSlide={openHeroSlide}
        isPlaying={isPlaying}
        safePlay={safePlay}
      />

      <DirectorsPick
        featuredData={featuredData}
        featuredTrack={featuredTrack}
        tracks={tracks}
        safePlay={safePlay}
        setSelectedTrack={setSelectedTrack}
      />

      <ListenerArchiveSummary
        safeRankingTheme={safeRankingTheme}
        topThree={topThree}
        myLikedTracks={myLikedTracks}
        safePlay={safePlay}
      />

      <PlaylistRail
        scrollContainerRef={scrollContainerRef}
        playlists={playlists}
        genrePlaylists={genrePlaylists}
        setSelectedPlaylist={setSelectedPlaylist}
      />

      <SearchDiscovery
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        GENRE_OPTIONS={GENRE_OPTIONS}
        displayTracks={displayTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        userLikes={userLikes}
        handleToggleLike={handleToggleLike}
        safePlay={safePlay}
      />

      <InstagramSignal />
      <ArtistLinks />
    </motion.div>
  );
}
