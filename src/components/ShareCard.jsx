import AchievementCard from "./AchievementCard";
import { achievementCardProps } from "../constants/rewardCatalog";

export default function ShareCard({ shareItem, shareCardRef, displayName, formatDateTime }) {
  if (!shareItem) return null;
  return (
    <div ref={shareCardRef} style={{ position: "fixed", top: 0, left: 0, width: 600, height: 850, zIndex: -1, opacity: 0.99, pointerEvents: "none" }}>
      <AchievementCard {...achievementCardProps(shareItem, displayName, formatDateTime)} />
    </div>
  );
}
