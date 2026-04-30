import { motion } from "framer-motion";
import { ListMusic } from "lucide-react";

const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

export default function PlaylistRail({
  scrollContainerRef,
  playlists,
  genrePlaylists,
  setSelectedPlaylist,
}) {
  return (
    <section className="py-16 lg:py-22 px-6 lg:px-8 border-t border-white/5">
      <div className="container mx-auto">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h3 className={subTitle}>Playlists</h3>
            <p className="text-2xl lg:text-3xl font-black uppercase text-white mt-2">Curated Collections</p>
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
                className="snap-start shrink-0 w-72 md:w-80 lg:w-96 rounded-[1.75rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all p-5 cursor-pointer group"
              >
                <div className="aspect-square rounded-[1.35rem] overflow-hidden bg-white/5 border border-white/10 mb-5 relative">
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
                className="snap-start shrink-0 w-72 md:w-80 lg:w-96 rounded-[1.75rem] border border-white/10 bg-[#004aad]/[0.06] hover:bg-[#004aad]/[0.1] transition-all p-5 cursor-pointer group"
              >
                <div className="aspect-square rounded-[1.35rem] overflow-hidden bg-white/5 border border-white/10 mb-5 relative">
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
  );
}
