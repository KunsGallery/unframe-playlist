import React from "react";
import { motion } from "framer-motion";
import { Share, X } from "lucide-react";

export default function AchievementPopup({
  newAchievement,
  popupMeta,
  displayName,
  formatDateTime,
  setNewAchievement,
  setShareItem,
}) {
  if (!newAchievement || !popupMeta) return null;

  const Icon = popupMeta.icon;

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center px-4 py-6 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        className="relative w-full max-w-sm sm:max-w-md lg:max-w-xl"
      >
        <div className="relative w-full max-h-[85vh] overflow-y-auto scrollbar-hide rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 bg-zinc-950/95 shadow-2xl">
          <button
            onClick={() => setNewAchievement(null)}
            className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/80 transition hover:text-white"
            aria-label="Close achievement popup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,74,173,0.28),transparent_36%),linear-gradient(135deg,#161616_0%,#222222_58%,#004aad_100%)]" />

            <div className="relative px-5 pb-5 pt-14 sm:px-8 sm:pb-8 sm:pt-16">
              <div className="rounded-[1.7rem] sm:rounded-[2.2rem] border border-[#7dd3fc]/40 bg-black/15 px-5 py-7 sm:px-8 sm:py-10 text-center">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.32em] text-[#8db4ff]">
                  Achievement Unlocked
                </p>

                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-light tracking-[0.08em] text-white break-words">
                  {popupMeta.title}
                </h1>

                <div className="mt-7 sm:mt-9 flex items-center justify-center">
                  <div className="flex h-32 w-32 sm:h-40 sm:w-40 lg:h-52 lg:w-52 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    {Icon ? <Icon size={88} color="#ffffff" className="sm:scale-110" /> : null}
                  </div>
                </div>

                <div className="mt-7 sm:mt-9 mx-auto max-w-md">
                  <p className="text-lg sm:text-2xl text-white leading-snug">
                    <span className="font-black text-[#7dd3fc]">{displayName}</span>{" "}
                    <span className="font-medium">님</span>
                  </p>

                  <p className="mt-3 text-sm sm:text-base lg:text-lg leading-relaxed text-zinc-100 break-words">
                    {popupMeta.desc}
                  </p>
                </div>

                <div className="mt-8 sm:mt-10 border-t border-[#7dd3fc]/25 pt-5 sm:pt-6">
                  <p className="text-xs sm:text-sm lg:text-base text-zinc-100">
                    {formatDateTime(newAchievement.unlockedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setNewAchievement(null)}
                  className="min-h-12 rounded-2xl bg-white/5 px-4 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    setShareItem({
                      title: popupMeta.title,
                      desc: popupMeta.desc,
                      type: "reward",
                      color: popupMeta.color,
                      icon: popupMeta.icon,
                      unlockedAt: newAchievement.unlockedAt,
                    });

                    setNewAchievement(null);
                  }}
                  className="min-h-12 rounded-2xl bg-[#004aad] px-4 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-[#1e6bff] flex items-center justify-center gap-2"
                >
                  <Share size={12} />
                  Share Card
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
