import { Disc, ExternalLink, Headphones, ListMusic, Play } from "lucide-react";

const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

export default function ArtistLinks() {
  return (
    <section className="py-18 lg:py-28 px-6 lg:px-8 bg-black relative overflow-hidden border-t border-white/5">
      <div className="container mx-auto text-center space-y-12 lg:space-y-16 relative z-10">
        <div className="space-y-4">
          <span className={subTitle}>Artist Links</span>
          <h2 className={`${h1Title} text-[11vw] lg:text-[6rem] leading-none`}>
            Carry the<br /><span className="text-[#004aad]">Sound Further</span>
          </h2>
          <p className="text-zinc-500 max-w-2xl mx-auto text-sm lg:text-base">
            UNFRAME PLAYLIST의 사운드를 각 플랫폼에서도 이어서 감상해보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6 max-w-7xl mx-auto w-full">
          <a
            href="https://open.spotify.com/artist/1lu0wRgtVrx7h0RNzC0WOv?si=02r_uJuTTNOLbZAKvfZAfg"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-green-500/50 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
          >
            <div className="flex items-start justify-between mb-10">
              <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-[0_10px_30px_rgba(34,197,94,0.25)] group-hover:scale-105 transition-transform">
                <Disc className="w-7 h-7 text-black fill-black" />
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">Spotify</h3>
            <p className="text-sm text-zinc-400 mt-3">가장 익숙한 글로벌 스트리밍 환경에서 바로 이어듣기</p>
          </a>

          <a
            href="https://music.youtube.com/channel/UCyvqImlLyNylao0uqjF8CSg?si=gkzcfBXoEyLYecPS"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-red-500/50 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
          >
            <div className="flex items-start justify-between mb-10">
              <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-[0_10px_30px_rgba(220,38,38,0.25)] group-hover:scale-105 transition-transform">
                <Play className="w-7 h-7 text-white fill-white" />
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">YouTube Music</h3>
            <p className="text-sm text-zinc-400 mt-3">비디오 감성과 함께 유튜브 뮤직에서 아티스트 페이지 이동</p>
          </a>

          <a
            href="https://music.apple.com/kr/artist/uppu/1883471629"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-white/25 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
          >
            <div className="flex items-start justify-between mb-10">
              <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_10px_30px_rgba(255,255,255,0.16)] group-hover:scale-105 transition-transform">
                <Headphones className="w-7 h-7" />
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">Apple Music</h3>
            <p className="text-sm text-zinc-400 mt-3">보다 정제된 환경에서 앨범과 싱글을 감상할 수 있는 링크</p>
          </a>

          <a
            href="https://www.music-flo.com/detail/artist/413577114/track?sortType=POPULARITY&roleType=ALL"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[2rem] border border-white/8 bg-zinc-900/40 backdrop-blur-xl hover:border-[#004aad]/60 hover:bg-zinc-900/70 transition-all duration-300 p-6 lg:p-7 text-left shadow-xl"
          >
            <div className="flex items-start justify-between mb-10">
              <div className="w-14 h-14 rounded-2xl bg-[#004aad] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,74,173,0.25)] group-hover:scale-105 transition-transform">
                <ListMusic className="w-7 h-7" />
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-3">Artist Page</p>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">FLO</h3>
            <p className="text-sm text-zinc-400 mt-3">국내 청취 환경에서 보다 가깝게 접근할 수 있는 아티스트 페이지</p>
          </a>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,74,173,0.1)_0%,transparent_70%)] z-0 pointer-events-none" />
    </section>
  );
}
