import React, { useRef, useCallback } from "react";
import { useDialogFocus } from '../hooks/useDialogFocus';
import { motion as Motion } from "framer-motion";
import { Share, X } from "lucide-react";
import AchievementCard from "./AchievementCard";
import { achievementCardProps } from "../constants/rewardCatalog";

const cardScale = () => Math.min(1, (window.innerWidth - 40) / 600, (window.innerHeight - 130) / 850);

export default function AchievementPopup({
  newAchievement,
  popupMeta,
  displayName,
  formatDateTime,
  setNewAchievement,
  setShareItem,
}) {
  const dialogRef = useRef(null);
  const close = useCallback(() => setNewAchievement(null), [setNewAchievement]);
  useDialogFocus(dialogRef, Boolean(newAchievement), close);
  if (!newAchievement || !popupMeta) return null;

  const item = {
    id: newAchievement.id,
    title: popupMeta.title,
    desc: popupMeta.desc,
    type: "reward",
    color: popupMeta.color,
    icon: popupMeta.icon,
    unlockedAt: newAchievement.unlockedAt,
  };
  const scale = cardScale();

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`새로운 업적: ${popupMeta.title}`} className="fixed inset-0 z-10000 flex flex-col items-center justify-center gap-4 px-5 py-4 bg-black/85 backdrop-blur-md">
      <Motion.div
        initial={{ y: 28, opacity: 0, rotate: -2 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        style={{ width: 600 * scale, height: 850 * scale, overflow: "hidden", borderRadius: 18 }}
      >
        <div style={{ width: 600, height: 850, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <AchievementCard {...achievementCardProps(item, displayName, formatDateTime)} />
        </div>
      </Motion.div>

      <div className="flex w-full justify-center gap-3" style={{ maxWidth: 600 * scale }}>
        <button
          type="button"
          onClick={close}
          aria-label="업적 닫기"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/40 px-4 text-sm font-bold text-white transition hover:bg-white/10"
        >
          <X size={16} aria-hidden="true" /> 닫기
        </button>
        <button
          type="button"
          onClick={() => { setShareItem(item); setNewAchievement(null); }}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#ccff00] px-4 text-sm font-bold text-[#11110f] transition hover:brightness-95"
        >
          <Share size={16} aria-hidden="true" /> 카드 공유
        </button>
      </div>
    </div>
  );
}
