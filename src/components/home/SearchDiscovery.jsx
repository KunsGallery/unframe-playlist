import { Heart, ListMusic, Play, Search } from "lucide-react";

const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);
const getTrackGenre = (track) => track?.genre || track?.tag || "Ambient";

export default function SearchDiscovery({
  searchTerm,
  setSearchTerm,
  selectedGenre,
  setSelectedGenre,
  GENRE_OPTIONS,
  displayTracks,
  currentTrack,
  isPlaying,
  userLikes,
  handleToggleLike,
  safePlay,
}) {
  void isPlaying;

  return (
    <section className="py-16 lg:py-24 px-6 lg:px-8 bg-zinc-950/50 border-t border-white/5">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
          <div>
            <h3 className={subTitle}>Sound Discovery</h3>
            <p className="text-2xl lg:text-3xl font-black uppercase text-white mt-2">Find Your Vibe</p>
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

        <div className="flex flex-wrap gap-2 mb-8">
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
            <div className="col-span-full py-16 text-center text-zinc-600">
              <p className="text-xl font-bold uppercase">No tracks found</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
