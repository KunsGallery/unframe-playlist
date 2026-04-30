import { Sparkles, Upload } from "lucide-react";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

export default function HeroSlideManager({
  siteConfig,
  playlists,
  tracks,
  normalizeHeroSlides,
  HERO_SLIDE_TYPES,
  updateHeroSlide,
  toggleHeroTrack,
  moveHeroSlide,
  uploadHeroSlideImage,
}) {
  return (
    <div className={`${glass} p-8 lg:p-12 rounded-[4rem] space-y-8`}>
      <h3 className="text-xl font-black uppercase text-white flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-[#004aad]" /> Hero Slides
      </h3>
      <div className="space-y-6">
        {normalizeHeroSlides(siteConfig.heroSlides).map((slide, idx) => {
          const linkedPlaylist = playlists.find((pl) => pl.id === slide.linkedPlaylistId);
          return (
            <div key={slide.id} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">Slide {idx + 1}</p>
                  <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                    {slide.title || slide.eyebrow || `Hero Slide ${idx + 1}`}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => moveHeroSlide(slide.id, "up")} className="px-4 py-2 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest">Move Up</button>
                  <button onClick={() => moveHeroSlide(slide.id, "down")} className="px-4 py-2 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest">Move Down</button>
                  <button
                    onClick={() => updateHeroSlide(slide.id, { isActive: !slide.isActive })}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${slide.isActive ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-500"}`}
                  >
                    {slide.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <select
                  value={slide.type}
                  onChange={(e) => updateHeroSlide(slide.id, { type: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none"
                >
                  {HERO_SLIDE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <input value={slide.eyebrow || ""} onChange={(e) => updateHeroSlide(slide.id, { eyebrow: e.target.value })} placeholder="Eyebrow" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                <input value={slide.title || ""} onChange={(e) => updateHeroSlide(slide.id, { title: e.target.value })} placeholder="Title" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                <input value={slide.subtitle || ""} onChange={(e) => updateHeroSlide(slide.id, { subtitle: e.target.value })} placeholder="Subtitle" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />
                <input value={slide.buttonLabel || ""} onChange={(e) => updateHeroSlide(slide.id, { buttonLabel: e.target.value })} placeholder="Button Label" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none" />

                <select
                  value={slide.linkedPlaylistId || ""}
                  onChange={(e) => updateHeroSlide(slide.id, { linkedPlaylistId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none"
                >
                  <option value="">-- NO PLAYLIST --</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.title}
                    </option>
                  ))}
                </select>
              </div>

              {linkedPlaylist && (
                <p className="text-[10px] text-[#004aad] font-black uppercase tracking-widest">
                  {linkedPlaylist.title} linked
                </p>
              )}

              <textarea
                value={slide.description || ""}
                onChange={(e) => updateHeroSlide(slide.id, { description: e.target.value })}
                placeholder="Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none h-28 resize-none"
              />

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <input
                    value={slide.backgroundImage || ""}
                    onChange={(e) => updateHeroSlide(slide.id, { backgroundImage: e.target.value })}
                    placeholder="Background Image URL"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                    <Upload className="w-4 h-4" /> Upload Background
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadHeroSlideImage(slide.id, "backgroundImage", e.target.files?.[0])} />
                  </label>
                </div>

                <div className="space-y-3">
                  <input
                    value={slide.coverImage || ""}
                    onChange={(e) => updateHeroSlide(slide.id, { coverImage: e.target.value })}
                    placeholder="Cover Image URL"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                    <Upload className="w-4 h-4" /> Upload Cover
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadHeroSlideImage(slide.id, "coverImage", e.target.files?.[0])} />
                  </label>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] aspect-[16/9] flex items-center justify-center">
                  {safeSrc(slide.backgroundImage) ? (
                    <img src={safeSrc(slide.backgroundImage)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No Background</p>
                  )}
                </div>

                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] aspect-square max-w-[280px] flex items-center justify-center">
                  {safeSrc(slide.coverImage) ? (
                    <img src={safeSrc(slide.coverImage)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No Cover</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-black mb-3 ml-1">Linked Tracks</p>
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto no-scrollbar">
                  {tracks.map((track) => {
                    const active = slide.trackIds.includes(track.id);
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => toggleHeroTrack(slide.id, track.id)}
                        className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${active ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-500 hover:text-white"}`}
                      >
                        {track.title}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-600 font-bold mt-3">
                  Exhibition OST / New Album은 track 연결을 권장, Featured Playlist는 playlist 연결을 권장합니다.
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
