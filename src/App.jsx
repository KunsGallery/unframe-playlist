import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Search, Menu, Heart, ArrowRight, 
  ExternalLink, ChevronDown, Disc, Archive, Plus,
  Volume2, Maximize2, Share
} from 'lucide-react';

const App = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(35);
  const canvasRef = useRef(null);

  const UNFRAME_BLUE = "#004aad";

  const tracks = [
    {
      id: "01",
      title: "서늘한 온기",
      artist: "Unframe Playlist #1",
      duration: "03:45",
      image: "https://cdn.imweb.me/upload/S20251125a08fc62b773e4/af42cf5c16cce.png",
      description: "전시장의 차가운 공기와 그 속에 머무는 미세한 온기를 소리로 치환했습니다.",
      tag: "Ambient"
    },
    {
      id: "02",
      title: "푸른 잔향",
      artist: "Unframe Playlist #2",
      duration: "04:12",
      image: "https://cdn.imweb.me/upload/S20251125a08fc62b773e4/079fd0b4878f4.png",
      description: "푸른색 캔버스 위로 흐르는 잔잔한 파동을 닮은 앰비언트 사운드입니다.",
      tag: "Electronic"
    },
    {
      id: "03",
      title: "오후의 도록",
      artist: "Unframe Playlist #3",
      duration: "02:58",
      image: "https://cdn.imweb.me/upload/S20251125a08fc62b773e4/90c79e17f2551.png",
      description: "오후의 햇살이 비치는 전시실에서 도록을 넘기는 듯한 평온한 리듬.",
      tag: "Minimal"
    }
  ];

  // 배경 애니메이션: Liquid Scanlines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    let offset = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 유동적인 그라데이션 배경
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#050505');
      grad.addColorStop(0.5, '#0a0a0a');
      grad.addColorStop(1, '#050505');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 스캔라인 효과
      ctx.strokeStyle = `rgba(0, 74, 173, ${isPlaying ? 0.08 : 0.04})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.height; i += 8) {
        const y = (i + offset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      offset += isPlaying ? 0.8 : 0.2;
      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    const scrollHandler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', scrollHandler);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#004aad] selection:text-white overflow-x-hidden">
      {/* 고정 배경 */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-10"></div>

      {/* 헤더 */}
      <header className={`fixed top-0 w-full z-[100] transition-all duration-700 ${scrolled ? 'py-4' : 'py-10'}`}>
        <div className="container mx-auto px-8 flex justify-between items-end">
          <div className="group cursor-pointer">
            <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none group-hover:text-[#004aad] transition-colors">
              Unframe<span className="text-[#004aad] group-hover:text-white transition-colors">.</span>
            </h1>
            <p className="text-[9px] font-bold tracking-[0.4em] uppercase text-zinc-500 mt-1">Archive Unit UP</p>
          </div>
          <div className="flex items-center gap-12">
            <div className="hidden md:flex gap-10 text-[10px] font-black tracking-[0.3em] uppercase opacity-40">
              <a href="#" className="hover:opacity-100 hover:text-[#004aad] transition-all">Exhibition</a>
              <a href="#" className="hover:opacity-100 hover:text-[#004aad] transition-all">Manifesto</a>
              <a href="#" className="hover:opacity-100 hover:text-[#004aad] transition-all">Connect</a>
            </div>
            <button className="bg-white/5 p-3 rounded-full hover:bg-[#004aad] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-20">
        
        {/* HERO: Brutalist Typography */}
        <section className="min-h-screen pt-40 pb-20 px-8 flex flex-col justify-end">
          <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <div className="overflow-hidden mb-4">
                <span className="inline-block animate-bounce text-[#004aad] text-xs font-black tracking-[0.5em] uppercase">Now Archiving...</span>
              </div>
              <h2 className="text-[18vw] lg:text-[14rem] font-black leading-[0.8] tracking-[-0.05em] uppercase italic italic-outline">
                Breaking<br/>
                <span className="text-[#004aad] not-italic">Frames</span>
              </h2>
            </div>
            <div className="lg:col-span-4 space-y-8">
              <p className="text-xl font-light text-zinc-400 leading-relaxed max-w-sm">
                "전시의 공기는 캔버스를 넘어 당신의 이어폰 속으로 흐릅니다. 닫히지 않는 예술의 잔향을 경험하세요."
              </p>
              <div className="flex gap-4">
                <div className="w-12 h-[1px] bg-[#004aad] mt-3"></div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-600">
                  Established 2025<br/>Seoul, KR
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PHILOSOPHY: Asymmetric Grid */}
        <section className="py-40 px-8 border-y border-white/5 bg-white/[0.01]">
          <div className="container mx-auto grid lg:grid-cols-2 gap-32 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -top-10 -left-10 w-40 h-40 border border-[#004aad]/30 animate-pulse"></div>
              <div className="relative aspect-[3/4] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000" className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-1000" alt="Art" />
                <div className="absolute inset-0 bg-[#004aad]/10 mix-blend-overlay"></div>
              </div>
              <div className="absolute -bottom-8 -right-8 bg-[#004aad] p-10 text-black">
                <Plus className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-16 order-1 lg:order-2">
              <div className="space-y-6">
                <h3 className="text-zinc-600 font-bold uppercase tracking-[0.5em] text-xs">Philosophy</h3>
                <p className="text-5xl lg:text-7xl font-black tracking-tighter leading-tight">
                  소리는<br/>보이지 않는<br/><span className="italic-outline text-white">건축입니다.</span>
                </p>
              </div>
              <p className="text-2xl font-thin text-zinc-400 leading-relaxed italic border-l-4 border-[#004aad] pl-10">
                "우리는 공간을 설계하듯 소리를 배치합니다. 모든 트랙은 전시장의 특정 좌표와 그날의 분위기를 데이터화하여 큐레이션된 결과물입니다."
              </p>
            </div>
          </div>
        </section>

        {/* PLAYLIST ARCHIVE: Interactive Horizontal List */}
        <section className="py-40 px-8">
          <div className="container mx-auto">
            <div className="flex justify-between items-end mb-24 border-b border-white/10 pb-10">
              <div className="space-y-2">
                 <h3 className="text-5xl font-black tracking-tighter uppercase italic">The Playlist</h3>
                 <p className="text-[#004aad] font-bold text-xs tracking-widest uppercase">Current Artifacts (03)</p>
              </div>
              <button className="flex items-center gap-4 text-[10px] font-black tracking-widest uppercase opacity-40 hover:opacity-100 transition-all">
                View All Archives <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1">
              {tracks.map((track, idx) => (
                <div 
                  key={idx}
                  onClick={() => {setCurrentTrack(idx); setIsPlaying(true);}}
                  className="group relative py-12 border-b border-white/5 cursor-pointer flex items-center justify-between overflow-hidden"
                >
                  {/* Hover Image Preview */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none z-0">
                    <img src={track.image} className="w-full h-full object-cover scale-50 group-hover:scale-100 rotate-12 group-hover:rotate-0 transition-transform duration-700 blur-sm group-hover:blur-0" alt="" />
                  </div>

                  <div className="flex items-center gap-12 relative z-10">
                    <span className="text-4xl font-thin italic text-zinc-800 group-hover:text-[#004aad] transition-colors">{track.id}</span>
                    <div className="space-y-1">
                      <h4 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase group-hover:italic transition-all">{track.title}</h4>
                      <p className="text-xs text-zinc-500 font-bold tracking-[0.3em] uppercase">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-20 relative z-10">
                    <span className="hidden md:block text-zinc-700 font-mono text-sm tracking-widest uppercase">{track.tag}</span>
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-[#004aad] group-hover:border-[#004aad] transition-all">
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BLUEPRINT: Experimental Layout */}
        <section className="py-40 px-8 bg-[#004aad]">
          <div className="container mx-auto grid lg:grid-cols-3 gap-20 text-black">
             <div className="space-y-6">
                <Disc className="w-12 h-12" />
                <h4 className="text-4xl font-black italic tracking-tighter uppercase">Exhibition OST</h4>
                <p className="text-lg font-medium leading-relaxed opacity-80">전시의 기획 의도를 소리로 번역하여 공간의 페르소나를 완성하는 공식 사운드트랙입니다.</p>
             </div>
             <div className="space-y-6 lg:mt-20">
                <Archive className="w-12 h-12" />
                <h4 className="text-4xl font-black italic tracking-tighter uppercase">Director's Pick</h4>
                <p className="text-lg font-medium leading-relaxed opacity-80">매일 아침 공간을 정돈하며 기록한 디렉터의 지극히 개인적인 영감의 조각들입니다.</p>
             </div>
             <div className="space-y-6 lg:mt-40">
                <Maximize2 className="w-12 h-12" />
                <h4 className="text-4xl font-black italic tracking-tighter uppercase">Spatial Logic</h4>
                <p className="text-lg font-medium leading-relaxed opacity-80">우리는 소리를 통해 가상의 건축물을 짓고, 당신이 그 안을 자유롭게 거닐게 합니다.</p>
             </div>
          </div>
        </section>

        {/* CTA: Final Section */}
        <section className="py-60 px-8 text-center relative overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-black italic opacity-[0.02] select-none">RESONANCE</div>
           <div className="max-w-4xl mx-auto space-y-12 relative z-10">
              <h3 className="text-7xl lg:text-9xl font-black tracking-tighter italic uppercase leading-[0.8]">Start Your<br/><span className="text-[#004aad] not-italic">Immersion</span></h3>
              <div className="flex flex-wrap justify-center gap-6 pt-10">
                <button className="px-12 py-5 bg-white text-black font-black uppercase text-sm hover:bg-[#004aad] hover:text-white transition-all transform hover:-translate-y-2">Spotify Link</button>
                <button className="px-12 py-5 border-2 border-white/20 text-white font-black uppercase text-sm hover:bg-white hover:text-black transition-all transform hover:-translate-y-2">Youtube Music</button>
              </div>
           </div>
        </section>
      </main>

      {/* STICKY PILL PLAYER: Dynamic Island Style */}
      <div className="fixed bottom-10 left-0 w-full z-[200] px-8 pointer-events-none">
        <div className="container mx-auto flex justify-center">
           <div className="w-full max-w-2xl bg-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-full p-2 pl-6 pr-4 flex items-center justify-between pointer-events-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
              
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                  <img src={tracks[currentTrack].image} className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} alt="" />
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase truncate tracking-tight">{tracks[currentTrack].title}</p>
                  <p className="text-[10px] text-[#004aad] font-bold uppercase tracking-widest truncate">{tracks[currentTrack].artist}</p>
                </div>
              </div>

              {/* Progress Bar (Center) */}
              <div className="hidden sm:flex flex-1 mx-10 items-center gap-4">
                <span className="text-[9px] font-mono opacity-30">01:42</span>
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden relative cursor-pointer group">
                  <div 
                    className="h-full bg-[#004aad] transition-all duration-300 relative" 
                    style={{width: `${progress}%`}}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
                <span className="text-[9px] font-mono opacity-30">{tracks[currentTrack].duration}</span>
              </div>

              <div className="flex items-center gap-3">
                 <button className="p-3 text-zinc-500 hover:text-white transition-colors hidden xs:block">
                   <SkipBack className="w-4 h-4 fill-current" />
                 </button>
                 <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                 >
                   {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                 </button>
                 <button className="p-3 text-zinc-500 hover:text-white transition-colors hidden xs:block">
                   <SkipForward className="w-4 h-4 fill-current" />
                 </button>
                 <div className="w-[1px] h-6 bg-white/10 mx-2 hidden md:block"></div>
                 <button className="p-3 text-[#004aad] hover:text-white transition-colors hidden md:block">
                    <Volume2 className="w-4 h-4" />
                 </button>
                 <button className="p-3 text-zinc-500 hover:text-white transition-colors hidden md:block">
                    <Share className="w-4 h-4" />
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-black py-40 border-t border-white/5 relative z-20">
        <div className="container mx-auto px-8">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-20">
              <div className="col-span-1 md:col-span-1 space-y-10">
                 <div className="space-y-2">
                    <h5 className="text-3xl font-black italic uppercase italic-outline">Unframe</h5>
                    <p className="text-[9px] font-bold tracking-[0.5em] text-zinc-600 uppercase">Resonance Builder</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#004aad] transition-colors cursor-pointer">
                       <span className="text-[10px] font-black">IG</span>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#004aad] transition-colors cursor-pointer">
                       <span className="text-[10px] font-black">YT</span>
                    </div>
                 </div>
              </div>
              <div className="space-y-8">
                 <h6 className="text-[10px] font-black tracking-[0.4em] uppercase text-[#004aad]">Location</h6>
                 <div className="space-y-2 text-sm text-zinc-500 font-medium italic">
                    <p>인사동4길 17, 108호</p>
                    <p>11:00am - 07:00pm</p>
                    <p>T. 0502-1322-8906</p>
                 </div>
              </div>
              <div className="space-y-8">
                 <h6 className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-700">Company</h6>
                 <div className="space-y-2 text-sm text-zinc-500 font-medium italic">
                    <p>대표: 김재우</p>
                    <p>668-27-02010</p>
                 </div>
              </div>
              <div className="space-y-8">
                 <h6 className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-700">Policy</h6>
                 <div className="space-y-2 text-sm text-zinc-500 font-bold italic underline-offset-4 decoration-[#004aad]">
                    <a href="#" className="block hover:underline">이용약관</a>
                    <a href="#" className="block hover:underline">개인정보처리방침</a>
                 </div>
              </div>
           </div>
           <div className="mt-40 text-center space-y-4">
              <p className="text-[9px] font-black tracking-[1em] text-zinc-800 uppercase">Breaking frames, Building resonance.</p>
              <p className="text-[9px] text-zinc-900 font-bold uppercase italic">© 2025 UNFRAME ART COLLECTIVE.</p>
           </div>
        </div>
      </footer>

      {/* 글로벌 스타일 적용 */}
      <style>{`
        .italic-outline {
          -webkit-text-stroke: 1px rgba(255,255,255,0.2);
          color: transparent;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .xs\\:block { display: none; }
        @media (min-width: 480px) { .xs\\:block { display: block; } }
      `}</style>
    </div>
  );
};

export default App;