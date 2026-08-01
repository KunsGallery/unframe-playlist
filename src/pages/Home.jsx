import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Disc3,
  Heart,
  Pause,
  Play,
  Search,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import PlaylistModal from "../components/home/PlaylistModal";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);
const hideBrokenImage = (event) => {
  event.currentTarget.hidden = true;
  event.currentTarget.parentElement?.classList.add("is-fallback");
};

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

const DEFAULT_RANKING_THEME = {
  id: "night_owl",
  scoreKey: "listenCount",
  title: "심야의 감상자",
  desc: "가장 많이 음악을 감상한 리스너",
  unit: "listens",
  basisLabel: "Based on total listens",
  icon: Sparkles,
};

const HIDDEN_RANKING_NAMES = new Set([
  "guest",
  "collector",
  "anonymous",
  "unnamed user",
  "",
]);

const getRankingDisplayName = (user) => {
  return (
    (typeof user?.nickname === "string" ? user.nickname : "").trim() ||
    (typeof user?.displayName === "string" ? user.displayName : "").trim() ||
    (typeof user?.id === "string" ? user.id : "").trim()
  );
};

const getRankingIdentityKey = (user) => {
  const name = getRankingDisplayName(user);

  return name.toLowerCase().replace(/\s+/g, "");
};

const shouldExcludeRankingUser = (user) => {
  if (user?.isRankingHidden === true) return true;

  const nickname = (typeof user?.nickname === "string" ? user.nickname : "").trim();
  const displayName = (typeof user?.displayName === "string" ? user.displayName : "").trim();
  const fallbackId = (typeof user?.id === "string" ? user.id : "").trim();
  const primaryName = (nickname || displayName).trim().toLowerCase();

  if (nickname || displayName) {
    if (HIDDEN_RANKING_NAMES.has(primaryName)) return true;
    return false;
  }

  if (!fallbackId) return true;

  return false;
};

const getRankingScore = (user, scoreKey = DEFAULT_RANKING_THEME.scoreKey) => {
  return Number(user?.[scoreKey] || 0);
};

const getRankingTieBreaker = (user) => {
  return Number(user?.xp || 0);
};

const dedupeRankingUsers = (users = [], scoreKey = DEFAULT_RANKING_THEME.scoreKey) => {
  const map = new Map();

  users.forEach((user, index) => {
    const key = getRankingIdentityKey(user);
    if (!key) return;

    const current = map.get(key);
    const nextEntry = {
      user,
      index,
      score: getRankingScore(user, scoreKey),
      xp: getRankingTieBreaker(user),
      name: getRankingDisplayName(user).toLowerCase(),
    };

    if (!current) {
      map.set(key, nextEntry);
      return;
    }

    if (nextEntry.score > current.score) {
      map.set(key, nextEntry);
      return;
    }

    if (nextEntry.score === current.score && nextEntry.xp > current.xp) {
      map.set(key, nextEntry);
      return;
    }

    if (
      nextEntry.score === current.score &&
      nextEntry.xp === current.xp &&
      nextEntry.index < current.index
    ) {
      map.set(key, nextEntry);
    }
  });

  return Array.from(map.values());
};

export default function Home({
  tracks = [],
  playlists = [],
  isPlaying = false,
  currentTrack,
  playTrack,
  userLikes = [],
  handleToggleLike,
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
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [rankingIndex, setRankingIndex] = useState(0);
  const [activeMood, setActiveMood] = useState(null);

  const scrollContainerRef = useRef(null);

  const rankingCandidates = useMemo(
    () => (Array.isArray(allUsers) ? allUsers : []).filter((user) => !shouldExcludeRankingUser(user)),
    [allUsers]
  );

  const rankingThemes = useMemo(() => {
    const themes = [
      {
        ...DEFAULT_RANKING_THEME,
        ...(rankingTheme ?? {}),
        title: DEFAULT_RANKING_THEME.title,
        desc: DEFAULT_RANKING_THEME.desc,
        scoreKey: DEFAULT_RANKING_THEME.scoreKey,
        unit: DEFAULT_RANKING_THEME.unit,
        basisLabel: DEFAULT_RANKING_THEME.basisLabel,
        icon: rankingTheme?.icon || DEFAULT_RANKING_THEME.icon,
      },
      {
        id: "share_leader",
        scoreKey: "shareCount",
        title: "소리를 나눈 사람",
        desc: "가장 많이 음악을 공유한 리스너",
        unit: "shares",
        basisLabel: "Based on total shares",
        icon: Share2,
      },
      {
        id: "archive_collector",
        scoreKey: "xp",
        title: "아카이브 컬렉터",
        desc: "가장 많은 경험치를 쌓은 리스너",
        unit: "xp",
        basisLabel: "Based on XP",
        icon: Trophy,
      },
    ];

    const hasLikedRanking = rankingCandidates.some((user) => Number(user?.likedCount || 0) > 0);

    if (hasLikedRanking) {
      themes.push({
        id: "likes_leader",
        scoreKey: "likedCount",
        title: "마음을 남긴 사람",
        desc: "가장 많이 좋아요를 남긴 리스너",
        unit: "likes",
        basisLabel: "Based on likes",
        icon: Sparkles,
      });
    }

    return themes;
  }, [rankingTheme, rankingCandidates]);

  const safeRankingIndex = rankingThemes.length ? rankingIndex % rankingThemes.length : 0;
  const safeRankingTheme = rankingThemes[safeRankingIndex] ?? rankingThemes[0] ?? DEFAULT_RANKING_THEME;
  const rankingTotal = rankingThemes.length;

  const trackMap = useMemo(() => {
    const m = new Map();
    (tracks || []).forEach((t) => {
      if (t?.id) m.set(t.id, t);
    });
    return m;
  }, [tracks]);

  const topThree = useMemo(() => {
    const uniqueUsers = dedupeRankingUsers(
      rankingCandidates,
      safeRankingTheme.scoreKey
    );

    uniqueUsers.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      const tieDiff = b.xp - a.xp;
      if (tieDiff !== 0) return tieDiff;

      const nameDiff = a.name.localeCompare(b.name);
      if (nameDiff !== 0) return nameDiff;

      return a.index - b.index;
    });

    return uniqueUsers.slice(0, 3).map((entry) => entry.user);
  }, [rankingCandidates, safeRankingTheme.scoreKey]);

  const goPrevRanking = useCallback(() => {
    setRankingIndex((prev) => (prev - 1 + rankingTotal) % rankingTotal);
  }, [rankingTotal]);

  const goNextRanking = useCallback(() => {
    setRankingIndex((prev) => (prev + 1) % rankingTotal);
  }, [rankingTotal]);

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
      } catch {
        // Featured content is optional; the home fallback remains available.
      }
    };

    fetchFeatured();
  }, [db, appId, tracks]);

  const displayTracks = useMemo(() => {
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
      return filtered;
    }

    return filtered.slice(0, 9);
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
        .filter((slide) => slide.title || slide.subtitle || slide.description || slide.coverImage || slide.backgroundImage);
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
  }, [siteConfig, playlists, trackMap, exhibitionOstTracks, newAlbumTracks, featuredPlaylist]);

  const safeHeroIndex = heroSlides.length ? heroIndex % heroSlides.length : 0;
  const currentHero = heroSlides[safeHeroIndex] || null;

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
      return;
    }

    setSelectedPlaylist(null);
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

  const moodCards = useMemo(() => {
    const definitions = [
      { id: "head-empty", label: "Head Empty", copy: "생각을 잠시 전시장 밖에", terms: ["ambient", "classical", "instrumental"], tone: "lime" },
      { id: "main-character", label: "Main Character", copy: "오늘의 동선은 영화처럼", terms: ["soundtrack", "pop", "vocal"], tone: "blue" },
      { id: "soft-focus", label: "Soft Focus", copy: "모서리가 부드러워지는 시간", terms: ["lo-fi", "jazz", "r&b"], tone: "paper" },
      { id: "after-hours", label: "After Hours", copy: "문 닫은 뒤 더 선명한 소리", terms: ["electronic", "experimental", "night"], tone: "orange" },
    ];

    const searchable = (track) => [
      track?.genre,
      track?.tag,
      track?.moods,
      track?.timeSlots,
      track?.useCases,
      track?.energy,
      track?.tags,
    ].flat().filter(Boolean).join(" ").toLowerCase();

    return definitions.map((definition, definitionIndex) => {
      const matched = (tracks || []).filter((track) =>
        definition.terms.some((term) => searchable(track).includes(term))
      );
      const fallback = latestTracks.filter((_, idx) => idx % definitions.length === definitionIndex).slice(0, 8);
      return { ...definition, items: matched.length ? matched.slice(0, 8) : fallback };
    });
  }, [tracks, latestTracks]);

  const activeMoodCard = moodCards.find((mood) => mood.id === activeMood) || null;
  const discoveryTracks = activeMoodCard?.items?.length ? activeMoodCard.items : displayTracks;

  const collectionCards = useMemo(() => {
    return [...(playlists || []), ...genrePlaylists]
      .filter((playlist) => Array.isArray(playlist?.items) && playlist.items.length)
      .slice(0, 10);
  }, [playlists, genrePlaylists]);

  const heroImage = currentHero?.coverImage || currentHero?.backgroundImage || currentHero?.items?.[0]?.image || "";

  return (
    <div className="up-home">
      <PlaylistModal
        normalizedSelectedPlaylist={normalizedSelectedPlaylist}
        setSelectedPlaylist={setSelectedPlaylist}
        safePlay={safePlay}
      />

      <section className="up-hero" aria-labelledby="up-hero-title">
        <div className="up-hero__copy">
          <p className="up-kicker">{currentHero?.eyebrow || "Currently on view"} · 00{safeHeroIndex + 1}</p>
          <h1 id="up-hero-title">{currentHero?.title || "Sound belongs in the room."}</h1>
          <p>{currentHero?.description || "언프레임이 발행한 음악을 전시처럼 걷고, 발견하고, 소장하세요."}</p>
          <div className="up-hero__actions">
            <button type="button" className="up-button up-button--ink" onClick={() => openHeroSlide(currentHero)}>
              <Play aria-hidden="true" /> {currentHero?.buttonLabel || "Start listening"}
            </button>
            <span>{currentHero?.subtitle || "Curated by UNFRAME"}</span>
          </div>
        </div>

        <div className="up-hero__art" style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
          <div className="up-hero__stamp">NEW<br />ISSUE</div>
          <div className="up-hero__label"><Disc3 aria-hidden="true" /><span>UNFRAME<br />PLAYLIST</span></div>
        </div>

        {heroSlides.length > 1 && (
          <div className="up-hero__pager">
            <button type="button" onClick={goPrevHero} aria-label="Previous feature"><ArrowLeft /></button>
            <span>{String(safeHeroIndex + 1).padStart(2, "0")} / {String(heroSlides.length).padStart(2, "0")}</span>
            <button type="button" onClick={goNextHero} aria-label="Next feature"><ArrowRight /></button>
          </div>
        )}
      </section>

      <section id="moods" className="up-section">
        <div className="up-section__head">
          <div><p className="up-kicker">Choose a state, not a genre</p><h2>How are we listening?</h2></div>
          <p>기분을 설명하기 어려울 때를 위한, 조금 엉뚱하고 정확한 입구.</p>
        </div>
        <div className="up-moods">
          {moodCards.map((mood, index) => (
            <button
              type="button"
              key={mood.id}
              className={`up-mood up-mood--${mood.tone} ${activeMood === mood.id ? "is-active" : ""}`}
              onClick={() => setActiveMood((current) => current === mood.id ? null : mood.id)}
            >
              <span>0{index + 1}</span><strong>{mood.label}</strong><small>{mood.copy}</small><ArrowUpRight />
            </button>
          ))}
        </div>
      </section>

      <section id="curations" className="up-section up-section--collections">
        <div className="up-section__head">
          <div><p className="up-kicker">Published collections</p><h2>UP Volumes</h2></div>
          <p>앨범이 아니라 전시의 챕터처럼 묶었습니다. 순서대로 들어도, 중간부터 걸어도 좋습니다.</p>
        </div>
        <div className="up-collections" ref={scrollContainerRef}>
          {!collectionCards.length && (
            <div className="up-empty up-empty--collection">
              <span>UP</span>
              <strong>첫 번째 볼륨을 준비하고 있습니다.</strong>
              <small>새 플레이리스트가 발행되면 이곳에 전시됩니다.</small>
            </div>
          )}
          {collectionCards.map((playlist, index) => {
            const cover = playlist.image || playlist.items?.[0]?.image || "";
            return (
              <button type="button" className="up-collection" key={playlist.id || playlist.title} onClick={() => setSelectedPlaylist(playlist)}>
                <span className="up-collection__number">VOL. {String(index + 1).padStart(2, "0")}</span>
                <span className={`up-collection__image ${cover ? "" : "is-fallback"}`}>{cover && <img src={cover} alt="" loading="lazy" onError={hideBrokenImage} />}</span>
                <strong>{playlist.title}</strong>
                <small>{playlist.desc || `${playlist.items.length} tracks · UNFRAME selection`}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="up-section up-discovery">
        <div className="up-catalog">
          <div className="up-section__head up-section__head--stack">
            <div><p className="up-kicker">Open catalog</p><h2>{activeMoodCard?.label || "Every track"}</h2></div>
            <label className="up-search">
              <Search aria-hidden="true" />
              <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setActiveMood(null); }} placeholder="곡, 아티스트, 장르 검색" />
            </label>
          </div>

          <div className="up-genres" aria-label="Genre filters">
            {GENRE_OPTIONS.slice(0, 8).map((genre) => (
              <button type="button" key={genre} className={selectedGenre === genre && !activeMood ? "is-active" : ""} onClick={() => { setSelectedGenre(genre); setActiveMood(null); }}>
                {genre}
              </button>
            ))}
          </div>

          <div className="up-tracklist">
            {!discoveryTracks.length && (
              <div className="up-empty up-empty--tracks">
                <Disc3 aria-hidden="true" />
                <strong>{searchTerm ? "검색 결과가 없습니다." : "아직 전시된 곡이 없습니다."}</strong>
                <small>{searchTerm ? "다른 제목이나 장르로 다시 찾아보세요." : "새로운 사운드가 곧 이곳에 도착합니다."}</small>
              </div>
            )}
            {discoveryTracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;
              const liked = userLikes.includes(track.id);
              return (
                <article className={`up-track ${isCurrent ? "is-current" : ""}`} key={track.id}>
                  <button type="button" className="up-track__play" onClick={() => safePlay(index, discoveryTracks)} aria-label={`Play ${track.title}`}>
                    {isCurrent && isPlaying ? <Pause /> : <Play />}
                  </button>
                  <span className="up-track__index">{String(index + 1).padStart(2, "0")}</span>
                  <span className={`up-track__cover ${track.image ? "" : "is-fallback"}`}>{track.image && <img src={track.image} alt="" loading="lazy" onError={hideBrokenImage} />}</span>
                  <span className="up-track__title"><strong>{track.title}</strong><small>{track.artist}</small></span>
                  <span className="up-track__genre">{getTrackGenre(track)}</span>
                  <button type="button" className={`up-track__like ${liked ? "is-liked" : ""}`} onClick={(e) => handleToggleLike(e, track.id)} aria-label="Add to archive"><Heart /></button>
                </article>
              );
            })}
          </div>
        </div>

        <aside id="notes" className="up-notes">
          <article className="up-note up-note--blue">
            <p className="up-kicker">Director’s note</p>
            <h3>{featuredData?.title || "A room needs a pulse."}</h3>
            <p>{featuredData?.desc || featuredData?.description || "이미지가 공간의 표정을 만든다면, 음악은 그곳의 호흡을 만듭니다. UP은 전시가 끝난 뒤에도 남는 리듬을 기록합니다."}</p>
            {featuredTrack && <button type="button" onClick={() => safePlay(tracks.indexOf(featuredTrack), tracks)}><Play /> Listen to the note</button>}
          </article>

          <article className="up-note up-note--ranking">
            <div className="up-note__nav">
              <p className="up-kicker">Listener signal</p>
              <span><button type="button" onClick={goPrevRanking}><ArrowLeft /></button><button type="button" onClick={goNextRanking}><ArrowRight /></button></span>
            </div>
            <h3>{safeRankingTheme.title}</h3>
            <ol>
              {topThree.length ? topThree.map((listener, index) => (
                <li key={listener.id || listener.nickname || index}><span>0{index + 1}</span><strong>{getRankingDisplayName(listener)}</strong><small>{getRankingScore(listener, safeRankingTheme.scoreKey)} {safeRankingTheme.unit}</small></li>
              )) : <li className="up-note__empty">첫 번째 기록을 기다리고 있어요.</li>}
            </ol>
          </article>

          <button type="button" className="up-liked" onClick={() => myLikedTracks.length && safePlay(0, myLikedTracks)}>
            <span><Heart /> YOUR ARCHIVE</span>
            <strong>{String(myLikedTracks.length).padStart(2, "0")}</strong>
            <small>saved tracks</small>
          </button>
        </aside>
      </section>

      <footer className="up-footer"><strong>UNFRAME PLAYLIST®</strong><span>Music for exhibitions, people and the spaces between.</span><small>SEOUL · {new Date().getFullYear()}</small></footer>
    </div>
  );
}
