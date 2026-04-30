import { Headphones, MoveRight, Play } from "lucide-react";

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

export default function DirectorsPick({
  featuredData,
  featuredTrack,
  tracks,
  safePlay,
  setSelectedTrack,
}) {
  return (
    <section className="py-16 lg:py-22 px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <span className={`${subTitle} text-[10px] mb-3 block`}>Director’s Pick</span>
          <h2 className={`${h1Title} text-4xl lg:text-6xl`}>
            A Selected<br />Track
          </h2>
        </div>

        <div className={`${glass} rounded-[2.25rem] lg:rounded-[2.5rem] overflow-hidden`}>
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="aspect-square lg:aspect-auto min-h-[280px] lg:min-h-[420px] bg-white/5 border-r border-white/10 overflow-hidden relative">
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

            <div className="p-6 md:p-8 lg:p-10 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="inline-flex px-4 py-2 rounded-full border border-[#004aad]/30 bg-[#004aad]/10 text-[#8db4ff] text-[10px] font-black uppercase tracking-[0.35em]">
                  Director’s Pick
                </span>

                <div className="space-y-2">
                  <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-[-0.05em] leading-[0.95]">
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

              <div className="flex flex-wrap items-center gap-3 pt-8">
                <button
                  onClick={() => {
                    if (featuredTrack) {
                      const idx = tracks.findIndex((t) => t?.id === featuredTrack.id);
                      if (idx >= 0) safePlay(idx, tracks, { playlistKey: "directors_pick" });
                    }
                  }}
                  className="px-7 py-3.5 rounded-full bg-[#004aad] text-white hover:bg-white hover:text-black transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play Pick
                </button>

                {featuredTrack && (
                  <button
                    onClick={() => setSelectedTrack?.(featuredTrack)}
                    className="px-7 py-3.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-xs flex items-center gap-2"
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
  );
}
