import { useMemo, useState } from "react";
import {
  Eye,
  Image,
  ListMusic,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

const createEmptySlide = () => ({
  id: `hero-slide-${Date.now()}`,
  type: "featured_playlist",
  eyebrow: "Featured",
  title: "New Hero Slide",
  subtitle: "Curated by UNFRAME",
  description: "",
  buttonLabel: "Open",
  backgroundImage: "",
  coverImage: "",
  linkedPlaylistId: "",
  trackIds: [],
  isActive: true,
});

export default function HeroSlideManager({
  siteConfig,
  setSiteConfig,
  playlists,
  tracks,
  normalizeHeroSlides,
  HERO_SLIDE_TYPES,
  updateHeroSlide,
  toggleHeroTrack,
  moveHeroSlide,
  uploadHeroSlideImage,
}) {
  const slides = normalizeHeroSlides(siteConfig.heroSlides);

  const [selectedSlideId, setSelectedSlideId] = useState(slides[0]?.id || "");
  const [trackSearch, setTrackSearch] = useState("");

  const selectedSlide = useMemo(() => {
    return slides.find((slide) => slide.id === selectedSlideId) || slides[0] || null;
  }, [slides, selectedSlideId]);

  const linkedPlaylist = useMemo(() => {
    if (!selectedSlide?.linkedPlaylistId) return null;
    return playlists.find((playlist) => playlist.id === selectedSlide.linkedPlaylistId) || null;
  }, [playlists, selectedSlide?.linkedPlaylistId]);

  const linkedTracks = useMemo(() => {
    const idSet = new Set(selectedSlide?.trackIds || []);
    return (tracks || []).filter((track) => idSet.has(track.id));
  }, [tracks, selectedSlide?.trackIds]);

  const filteredTracks = useMemo(() => {
    const term = trackSearch.trim().toLowerCase();

    const list = [...(tracks || [])].filter(Boolean);

    if (!term) return list;

    return list.filter((track) => {
      const title = (track?.title || "").toLowerCase();
      const artist = (track?.artist || "").toLowerCase();
      const genre = (track?.genre || track?.tag || "").toLowerCase();

      return title.includes(term) || artist.includes(term) || genre.includes(term);
    });
  }, [tracks, trackSearch]);

  const addSlide = () => {
    const nextSlide = createEmptySlide();

    setSiteConfig((prev) => ({
      ...prev,
      heroSlides: [...normalizeHeroSlides(prev.heroSlides), nextSlide],
    }));

    setSelectedSlideId(nextSlide.id);
  };

  const deleteSlide = (slideId) => {
    const current = normalizeHeroSlides(siteConfig.heroSlides);
    if (current.length <= 1) return;

    const next = current.filter((slide) => slide.id !== slideId);
    setSiteConfig((prev) => ({
      ...prev,
      heroSlides: next,
    }));

    if (selectedSlideId === slideId) {
      setSelectedSlideId(next[0]?.id || "");
    }
  };

  const handlePlaylistChange = (playlistId) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    const fallbackImage =
      safeSrc(playlist?.image) ||
      safeSrc(playlist?.items?.[0]?.image) ||
      "";

    updateHeroSlide(selectedSlide.id, {
      linkedPlaylistId: playlistId,
      ...(selectedSlide.coverImage ? {} : { coverImage: fallbackImage }),
    });
  };

  if (!selectedSlide) {
    return (
      <div className={`${glass} rounded-[3rem] p-10`}>
        <p className="text-zinc-500">No hero slides found.</p>
      </div>
    );
  }

  return (
    <div className="grid xl:grid-cols-[0.36fr_0.64fr] gap-8 items-start">
      {/* Left: Slide List */}
      <div className={`${glass} rounded-[3rem] p-6 lg:p-8 space-y-6 xl:sticky xl:top-28`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
              Hero Slides
            </p>
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">
              Slides
            </h2>
          </div>

          <button
            onClick={addSlide}
            className="shrink-0 px-4 py-3 rounded-full bg-[#004aad] text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="space-y-3 max-h-[68vh] overflow-y-auto no-scrollbar pr-1">
          {slides.map((slide, idx) => {
            const active = selectedSlide.id === slide.id;
            const previewImage = safeSrc(slide.coverImage || slide.backgroundImage);

            return (
              <div
                key={slide.id}
                onClick={() => setSelectedSlideId(slide.id)}
                className={`rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-all ${
                  active
                    ? "border-[#004aad] bg-[#004aad]/10 shadow-[0_0_24px_rgba(0,74,173,0.18)]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                  {previewImage ? (
                    <img src={previewImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white/20" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase truncate">
                    {slide.title || `Slide ${idx + 1}`}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                    {slide.type} • {slide.isActive ? "active" : "inactive"}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSlide(slide.id);
                  }}
                  disabled={slides.length <= 1}
                  className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400 disabled:opacity-30 disabled:hover:bg-white/5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Slide Editor */}
      <div className={`${glass} rounded-[3rem] p-6 lg:p-10 space-y-7`}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
              Hero Editor
            </p>
            <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
              {selectedSlide.title || "Hero Slide"}
            </h2>
            <p className="text-zinc-500 text-sm mt-3">
              첫 화면에 노출되는 프로모션 슬라이드를 관리합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => moveHeroSlide(selectedSlide.id, "up")}
              className="px-4 py-2 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
            >
              Move Up
            </button>
            <button
              onClick={() => moveHeroSlide(selectedSlide.id, "down")}
              className="px-4 py-2 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
            >
              Move Down
            </button>
            <button
              onClick={() => updateHeroSlide(selectedSlide.id, { isActive: !selectedSlide.isActive })}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                selectedSlide.isActive
                  ? "bg-[#004aad] text-white"
                  : "bg-white/5 text-zinc-500"
              }`}
            >
              {selectedSlide.isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[0.62fr_0.38fr] gap-6 items-start">
          <div className="space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Type
                </p>
                <select
                  value={selectedSlide.type}
                  onChange={(e) => updateHeroSlide(selectedSlide.id, { type: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none"
                >
                  {HERO_SLIDE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Eyebrow
                </p>
                <input
                  value={selectedSlide.eyebrow || ""}
                  onChange={(e) => updateHeroSlide(selectedSlide.id, { eyebrow: e.target.value })}
                  placeholder="Eyebrow"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Title
                </p>
                <input
                  value={selectedSlide.title || ""}
                  onChange={(e) => updateHeroSlide(selectedSlide.id, { title: e.target.value })}
                  placeholder="Title"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Subtitle
                </p>
                <input
                  value={selectedSlide.subtitle || ""}
                  onChange={(e) => updateHeroSlide(selectedSlide.id, { subtitle: e.target.value })}
                  placeholder="Subtitle"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Button Label
                </p>
                <input
                  value={selectedSlide.buttonLabel || ""}
                  onChange={(e) => updateHeroSlide(selectedSlide.id, { buttonLabel: e.target.value })}
                  placeholder="Button Label"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Linked Playlist
                </p>
                <select
                  value={selectedSlide.linkedPlaylistId || ""}
                  onChange={(e) => handlePlaylistChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none"
                >
                  <option value="">-- NO PLAYLIST --</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {linkedPlaylist && (
              <div className="rounded-2xl border border-[#004aad]/20 bg-[#004aad]/10 p-4 flex items-center gap-3">
                <ListMusic className="w-5 h-5 text-[#8db4ff]" />
                <p className="text-[10px] text-[#8db4ff] font-black uppercase tracking-widest">
                  {linkedPlaylist.title} linked
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Description
              </p>
              <textarea
                value={selectedSlide.description || ""}
                onChange={(e) => updateHeroSlide(selectedSlide.id, { description: e.target.value })}
                placeholder="Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none h-28 resize-none"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Background Image
                </p>
                <input
                  value={selectedSlide.backgroundImage || ""}
                  onChange={(e) => updateHeroSlide(selectedSlide.id, { backgroundImage: e.target.value })}
                  placeholder="Background Image URL"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                />
                <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                  <Upload className="w-4 h-4" />
                  Upload Background
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      uploadHeroSlideImage(selectedSlide.id, "backgroundImage", e.target.files?.[0])
                    }
                  />
                </label>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Cover Image
                </p>
                <input
                  value={selectedSlide.coverImage || ""}
                  onChange={(e) => updateHeroSlide(selectedSlide.id, { coverImage: e.target.value })}
                  placeholder="Cover Image URL"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                />
                <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                  <Upload className="w-4 h-4" />
                  Upload Cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      uploadHeroSlideImage(selectedSlide.id, "coverImage", e.target.files?.[0])
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="aspect-[16/10] rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 mb-4 flex items-center justify-center relative">
                {safeSrc(selectedSlide.backgroundImage || selectedSlide.coverImage) ? (
                  <img
                    src={safeSrc(selectedSlide.backgroundImage || selectedSlide.coverImage)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image className="w-10 h-10 text-white/20" />
                )}
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-4 bottom-4 right-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8db4ff] mb-1">
                    {selectedSlide.eyebrow || "Featured"}
                  </p>
                  <p className="text-xl font-black uppercase tracking-tight truncate">
                    {selectedSlide.title || "Hero Slide"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-[#004aad]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Visual Preview
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="aspect-square max-w-[260px] mx-auto rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                {safeSrc(selectedSlide.coverImage) ? (
                  <img src={safeSrc(selectedSlide.coverImage)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-10 h-10 text-white/20" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[0.48fr_0.52fr] gap-5">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div>
              <p className="text-[10px] text-[#004aad] uppercase font-black tracking-[0.35em] mb-2">
                Linked Tracks
              </p>
              <h3 className="text-xl font-black uppercase tracking-tight">
                {linkedTracks.length} Tracks
              </h3>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {linkedTracks.length > 0 ? (
                linkedTracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/5 p-3"
                  >
                    <div className="w-7 text-center text-zinc-600 text-xs font-bold">
                      {idx + 1}
                    </div>

                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {safeSrc(track.image) ? (
                        <img src={safeSrc(track.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="w-4 h-4 text-white/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black uppercase truncate">{track.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                        {track.artist}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleHeroTrack(selectedSlide.id, track.id)}
                      className="p-2 rounded-full bg-white/5 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    No tracks linked
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div>
              <p className="text-[10px] text-[#004aad] uppercase font-black tracking-[0.35em] mb-2">
                Add Tracks
              </p>
              <h3 className="text-xl font-black uppercase tracking-tight">
                Track Selector
              </h3>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
                placeholder="Search title, artist or genre..."
                className="w-full bg-white/5 border border-white/10 py-4 pl-11 pr-4 rounded-2xl outline-none text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto no-scrollbar">
              {filteredTracks.map((track) => {
                const active = selectedSlide.trackIds.includes(track.id);
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => toggleHeroTrack(selectedSlide.id, track.id)}
                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      active
                        ? "bg-[#004aad] text-white"
                        : "bg-white/5 text-zinc-500 hover:text-white"
                    }`}
                  >
                    {track.title}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-zinc-600 font-bold leading-relaxed">
              Exhibition OST / New Album은 track 연결을 권장, Featured Playlist는 playlist 연결을 권장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}