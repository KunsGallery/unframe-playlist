import { Save, Star } from "lucide-react";
import HeroSlideManager from "./HeroSlideManager";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

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
  void setSiteConfig;

  return (
    <div className="space-y-10">
      <div className={`${glass} p-8 lg:p-12 rounded-[4rem] space-y-10`}>
        <h3 className="text-xl font-black uppercase text-white flex items-center gap-3">
          <Star className="w-5 h-5 text-[#004aad]" /> Featured Artifact (Directors Pick)
        </h3>

        <div className="grid lg:grid-cols-2 gap-5">
          <input
            value={featuredData.headline || ""}
            onChange={(e) => setFeaturedData((prev) => ({ ...prev, headline: e.target.value }))}
            placeholder="Headline"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
          <input
            value={featuredData.subHeadline || ""}
            onChange={(e) => setFeaturedData((prev) => ({ ...prev, subHeadline: e.target.value }))}
            placeholder="Sub Headline"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
          <input
            value={featuredData.quote || ""}
            onChange={(e) => setFeaturedData((prev) => ({ ...prev, quote: e.target.value }))}
            placeholder="Quote"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none lg:col-span-2"
          />
          <textarea
            value={featuredData.description || ""}
            onChange={(e) => setFeaturedData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-32 resize-none lg:col-span-2"
          />
          <select
            value={featuredData.linkedTrackId || ""}
            onChange={(e) => setFeaturedData((prev) => ({ ...prev, linkedTrackId: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black outline-none lg:col-span-2"
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

      <HeroSlideManager
        siteConfig={siteConfig}
        playlists={playlists}
        tracks={tracks}
        normalizeHeroSlides={normalizeHeroSlides}
        HERO_SLIDE_TYPES={HERO_SLIDE_TYPES}
        updateHeroSlide={updateHeroSlide}
        toggleHeroTrack={toggleHeroTrack}
        moveHeroSlide={moveHeroSlide}
        uploadHeroSlideImage={uploadHeroSlideImage}
      />

      <button
        onClick={handleSaveAllConfig}
        className="w-full bg-[#004aad] text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 shadow-2xl"
      >
        <Save className="w-6 h-6" /> Deploy Site Changes
      </button>
    </div>
  );
}
