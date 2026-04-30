import { Heart, Sparkles } from "lucide-react";

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

export default function ListenerArchiveSummary({
  safeRankingTheme,
  topThree,
  myLikedTracks,
  safePlay,
}) {
  return (
    <section className="px-6 lg:px-8 container mx-auto py-16 lg:py-22 border-t border-white/5">
      <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-10">
        <div className={`${glass} rounded-[2rem] p-6 lg:p-8`}>
          <div className="mb-7">
            <span className={`${subTitle} text-[10px] mb-3 block`}>Top Listeners</span>
            <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">
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

        <div className={`${glass} rounded-[2rem] p-6 lg:p-8`}>
          <div className="mb-7">
            <span className={`${subTitle} text-[10px] mb-3 block`}>My Archive</span>
            <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">
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
  );
}
