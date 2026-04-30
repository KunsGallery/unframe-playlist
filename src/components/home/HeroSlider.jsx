import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Disc,
  Headphones,
  ListMusic,
  Play,
} from "lucide-react";
import WaveBackground from "../WaveBackground";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

export default function HeroSlider({
  currentHero,
  heroSlides,
  heroIndex,
  setHeroIndex,
  goPrevHero,
  goNextHero,
  openHeroSlide,
  isPlaying,
  safePlay,
}) {
  return (
    <section className="pt-24 lg:pt-28 px-6 lg:px-8 relative overflow-hidden">
      <WaveBackground isPlaying={isPlaying} />

      <div className="container mx-auto relative z-10">
        {currentHero ? (
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentHero.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative rounded-[2.25rem] lg:rounded-[2.75rem] overflow-hidden border border-white/10 min-h-[440px] lg:min-h-[520px]"
              >
                {currentHero.type === "exhibition_ost" && currentHero.backgroundImage ? (
                  <>
                    <img
                      src={currentHero.backgroundImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
                    />
                    <div className="absolute inset-0 bg-black/55" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,74,173,0.25),transparent_35%),linear-gradient(120deg,rgba(0,0,0,0.65),rgba(0,0,0,0.25))]" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#050505_0%,#0d1320_45%,#111827_100%)]" />
                )}

                <div className="absolute top-5 right-5 z-20 hidden md:flex items-center gap-2">
                  {heroSlides.length > 1 && (
                    <>
                      <button
                        onClick={goPrevHero}
                        className="w-11 h-11 rounded-full border border-white/10 bg-black/25 backdrop-blur-md hover:bg-white/10 transition-all flex items-center justify-center"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={goNextHero}
                        className="w-11 h-11 rounded-full border border-white/10 bg-black/25 backdrop-blur-md hover:bg-white/10 transition-all flex items-center justify-center"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="relative z-10 grid lg:grid-cols-[1.12fr_0.88fr] min-h-[440px] lg:min-h-[520px]">
                  <div className="p-6 md:p-8 lg:p-10 flex flex-col justify-between">
                    <div className="space-y-4">
                      <span className="inline-flex px-4 py-2 rounded-full border border-white/15 bg-white/5 text-[10px] font-black uppercase tracking-[0.35em] text-white/80">
                        {currentHero.eyebrow}
                      </span>

                      <div className="space-y-2">
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-[-0.06em] leading-[0.92] text-white">
                          {currentHero.title}
                        </h2>
                        <p className="text-[11px] md:text-sm uppercase tracking-[0.25em] text-[#8db4ff] font-bold">
                          {currentHero.subtitle}
                        </p>
                      </div>

                      <p className="max-w-2xl text-zinc-300 leading-relaxed text-sm md:text-base">
                        {currentHero.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-8">
                      <button
                        onClick={() => openHeroSlide(currentHero)}
                        className="px-7 py-3.5 rounded-full bg-white text-black hover:bg-[#004aad] hover:text-white transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        {currentHero.buttonLabel}
                      </button>

                      {currentHero.type === "featured_playlist" && (
                        <button
                          onClick={() => openHeroSlide(currentHero)}
                          className="px-7 py-3.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
                        >
                          <ListMusic className="w-4 h-4" />
                          View Playlist
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6 md:p-8 lg:p-10 flex items-center justify-center">
                    {currentHero.type === "exhibition_ost" ? (
                      <div className="w-full max-w-xl rounded-[1.75rem] bg-black/35 backdrop-blur-2xl border border-white/10 p-5 lg:p-6 shadow-2xl">
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-18 h-18 lg:w-20 lg:h-20 rounded-[1.15rem] overflow-hidden bg-white/5 border border-white/10 shrink-0">
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
                            <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-white">
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
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
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
                      <div className="w-full max-w-[380px]">
                        <div className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_35px_80px_rgba(0,0,0,0.45)] bg-white/5 mb-5">
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
                              className="p-4 rounded-[1.35rem] border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all text-left"
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
                      <div className="w-full max-w-[430px]">
                        <div className="grid grid-cols-2 gap-4 mb-5">
                          {(currentHero.items || []).slice(0, 4).map((track, idx) => (
                            <div
                              key={track?.id ?? `${currentHero.id}-${idx}`}
                              className={`aspect-square rounded-[1.5rem] overflow-hidden border border-white/10 bg-white/5 ${idx === 0 ? "translate-y-3" : idx === 1 ? "-translate-y-2" : idx === 2 ? "translate-y-2" : "-translate-y-3"}`}
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

                        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
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
              <div className="flex justify-center gap-2 mt-5">
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
          <div className="rounded-[2.75rem] border border-white/10 min-h-[420px] flex items-center justify-center bg-white/[0.02]">
            <div className="text-center">
              <p className="text-3xl font-black uppercase">No Featured Content Yet</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
