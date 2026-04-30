import { useMemo, useState } from "react";
import { FileText, Save, Settings2, Sparkles, Star } from "lucide-react";
import HeroSlideManager from "./HeroSlideManager";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

const CONFIG_PANELS = [
  {
    id: "directors_pick",
    label: "Director’s Pick",
    desc: "메인 추천곡 영역",
    icon: Star,
  },
  {
    id: "hero_slides",
    label: "Hero Slides",
    desc: "첫 화면 슬라이드",
    icon: Sparkles,
  },
  {
    id: "site_texts",
    label: "Site Texts",
    desc: "인트로/철학 문구",
    icon: FileText,
  },
];

export default function SiteConfigManager({
  featuredData,
  setFeaturedData,
  tracks,
  siteConfig,
  setSiteConfig,
  handleSaveAllConfig,
  playlists,
  normalizeHeroSlides,
  HERO_SLIDE_TYPES,
  updateHeroSlide,
  toggleHeroTrack,
  moveHeroSlide,
  uploadHeroSlideImage,
}) {
  const [activePanel, setActivePanel] = useState("directors_pick");

  const selectedTrack = useMemo(() => {
    if (!featuredData?.linkedTrackId) return null;
    return tracks.find((track) => track.id === featuredData.linkedTrackId) || null;
  }, [tracks, featuredData?.linkedTrackId]);

  const updateSiteConfig = (field, value) => {
    setSiteConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderPanel = () => {
    if (activePanel === "hero_slides") {
      return (
        <HeroSlideManager
          siteConfig={siteConfig}
          setSiteConfig={setSiteConfig}
          playlists={playlists}
          tracks={tracks}
          normalizeHeroSlides={normalizeHeroSlides}
          HERO_SLIDE_TYPES={HERO_SLIDE_TYPES}
          updateHeroSlide={updateHeroSlide}
          toggleHeroTrack={toggleHeroTrack}
          moveHeroSlide={moveHeroSlide}
          uploadHeroSlideImage={uploadHeroSlideImage}
        />
      );
    }

    if (activePanel === "site_texts") {
      return (
        <div className={`${glass} rounded-[3rem] p-6 lg:p-10 space-y-7`}>
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
              Site Texts
            </p>
            <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
              Main Copy
            </h2>
            <p className="text-zinc-500 text-sm mt-3">
              인트로, 브랜드 철학, 안내 문구를 관리합니다.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Intro Title
              </p>
              <input
                value={siteConfig.intro_title || ""}
                onChange={(e) => updateSiteConfig("intro_title", e.target.value)}
                placeholder="Intro Title"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Intro Button
              </p>
              <input
                value={siteConfig.intro_btn || ""}
                onChange={(e) => updateSiteConfig("intro_btn", e.target.value)}
                placeholder="Intro Button"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Intro Description
              </p>
              <textarea
                value={siteConfig.intro_desc || ""}
                onChange={(e) => updateSiteConfig("intro_desc", e.target.value)}
                placeholder="Intro Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-28 resize-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Philosophy Label
              </p>
              <input
                value={siteConfig.phil_sub || ""}
                onChange={(e) => updateSiteConfig("phil_sub", e.target.value)}
                placeholder="Philosophy"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Philosophy Title
              </p>
              <input
                value={siteConfig.phil_title || ""}
                onChange={(e) => updateSiteConfig("phil_title", e.target.value)}
                placeholder="Philosophy Title"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Philosophy Description
              </p>
              <textarea
                value={siteConfig.phil_desc || ""}
                onChange={(e) => updateSiteConfig("phil_desc", e.target.value)}
                placeholder="Philosophy Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-32 resize-none"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Philosophy Quote
              </p>
              <textarea
                value={siteConfig.phil_quote || ""}
                onChange={(e) => updateSiteConfig("phil_quote", e.target.value)}
                placeholder="Philosophy Quote"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-24 resize-none"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <p className="text-[10px] text-[#004aad] uppercase font-black tracking-[0.35em]">
              Guide Texts
            </p>

            <div className="grid lg:grid-cols-2 gap-4">
              {["guide_1", "guide_2", "guide_3", "guide_4"].map((field, idx) => (
                <input
                  key={field}
                  value={siteConfig[field] || ""}
                  onChange={(e) => updateSiteConfig(field, e.target.value)}
                  placeholder={`Guide ${idx + 1}`}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${glass} rounded-[3rem] p-6 lg:p-10 space-y-7`}>
        <div>
          <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
            Director’s Pick
          </p>
          <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
            Featured Artifact
          </h2>
          <p className="text-zinc-500 text-sm mt-3">
            메인 페이지의 디렉터 추천곡 영역을 관리합니다.
          </p>
        </div>

        <div className="grid lg:grid-cols-[0.62fr_0.38fr] gap-6 items-start">
          <div className="space-y-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Headline
                </p>
                <input
                  value={featuredData.headline || ""}
                  onChange={(e) => setFeaturedData((prev) => ({ ...prev, headline: e.target.value }))}
                  placeholder="Headline"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                  Sub Headline
                </p>
                <input
                  value={featuredData.subHeadline || ""}
                  onChange={(e) => setFeaturedData((prev) => ({ ...prev, subHeadline: e.target.value }))}
                  placeholder="Sub Headline"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Quote
              </p>
              <input
                value={featuredData.quote || ""}
                onChange={(e) => setFeaturedData((prev) => ({ ...prev, quote: e.target.value }))}
                placeholder="Quote"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Description
              </p>
              <textarea
                value={featuredData.description || ""}
                onChange={(e) => setFeaturedData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-32 resize-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Linked Track
              </p>
              <select
                value={featuredData.linkedTrackId || ""}
                onChange={(e) => setFeaturedData((prev) => ({ ...prev, linkedTrackId: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none"
              >
                <option value="">-- SELECT TRACK --</option>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 mb-4 flex items-center justify-center">
              {safeSrc(selectedTrack?.image) ? (
                <img src={safeSrc(selectedTrack.image)} alt="" className="w-full h-full object-cover" />
              ) : (
                <Star className="w-10 h-10 text-white/20" />
              )}
            </div>

            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">
              Selected Track
            </p>
            <h3 className="text-xl font-black uppercase tracking-tight truncate">
              {selectedTrack?.title || "No Track Selected"}
            </h3>
            <p className="text-sm text-zinc-500 mt-1 truncate">
              {selectedTrack?.artist || "Choose a track for Director’s Pick"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid xl:grid-cols-[0.32fr_0.68fr] gap-8 items-start">
      <div className={`${glass} rounded-[3rem] p-6 lg:p-8 space-y-5 xl:sticky xl:top-28`}>
        <div>
          <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
            Site Config
          </p>
          <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">
            Main Settings
          </h2>
        </div>

        <div className="space-y-3">
          {CONFIG_PANELS.map((panel) => {
            const Icon = panel.icon;
            const active = activePanel === panel.id;

            return (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-4 ${
                  active
                    ? "border-[#004aad] bg-[#004aad]/10 shadow-[0_0_24px_rgba(0,74,173,0.18)]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  active ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-400"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-black uppercase tracking-tight truncate">
                    {panel.label}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                    {panel.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSaveAllConfig}
          className="w-full bg-[#004aad] text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 shadow-2xl"
        >
          <Save className="w-5 h-5" />
          Deploy Changes
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3 mb-3">
            <Settings2 className="w-4 h-4 text-[#004aad]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Save Notice
            </p>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            각 설정은 우측에서 수정한 뒤, 마지막에 Deploy Changes를 눌러야 실제 사이트에 반영됩니다.
          </p>
        </div>
      </div>

      <div>{renderPanel()}</div>
    </div>
  );
}