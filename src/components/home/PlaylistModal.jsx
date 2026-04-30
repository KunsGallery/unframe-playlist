import { AnimatePresence, motion } from "framer-motion";
import { Heart, ListMusic, Play, X } from "lucide-react";

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

export default function PlaylistModal({
  normalizedSelectedPlaylist,
  setSelectedPlaylist,
  safePlay,
}) {
  return (
    <AnimatePresence>
      {normalizedSelectedPlaylist && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-500 bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl"
          onClick={() => setSelectedPlaylist(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className={`${glass} w-full max-w-4xl h-[80vh] rounded-[3rem] p-8 lg:p-12 border-white/20 shadow-2xl flex flex-col relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
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
  );
}
