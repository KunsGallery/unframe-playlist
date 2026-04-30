import { ExternalLink } from "lucide-react";

const h1Title = "font-black uppercase tracking-[-0.07em] leading-[0.8] italic";
const subTitle = "font-bold uppercase tracking-[0.4em] text-[#004aad]";

export default function InstagramSignal() {
  return (
    <section className="px-6 lg:px-8 container mx-auto py-18 lg:py-24 border-t border-white/5 overflow-hidden">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <span className={subTitle + " text-[10px] mb-3 block italic"}>Live Vibe</span>
          <h2 className={`${h1Title} text-4xl lg:text-6xl`}>Signal<br />Moments</h2>
        </div>
        <a href="https://instagram.com/unframe.playlist" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-2">
          Follow Us <ExternalLink size={14} />
        </a>
      </div>

      <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40">
        <iframe
          src="//cdn.lightwidget.com/widgets/2c45aca067de5705bece3725c4e2ca5d.html"
          scrolling="no"
          allowtransparency="true"
          className="lightwidget-widget"
          style={{ width: '100%', border: '0', overflow: 'hidden' }}
          title="instagram"
        />
      </div>
    </section>
  );
}
