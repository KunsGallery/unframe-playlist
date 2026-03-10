// src/constants/achievements.js
import {
  Music,
  Heart,
  Moon,
  Sparkles,
  Share,
  Trophy,
  Repeat,
  Calendar,
  Star,
  Target,
  Medal,
} from "lucide-react";

export const ACH_META = {
  first_listen: {
    title: "첫 감상",
    desc: "처음으로 소리를 재생함",
    icon: Music,
    color: "#a78bfa",
  },
  first_complete: {
    title: "첫 완주",
    desc: "처음으로 한 곡을 끝까지 감상함",
    icon: Trophy,
    color: "#fb7185",
  },
  first_like: {
    title: "첫 좋아요",
    desc: "처음으로 좋아요를 남김",
    icon: Heart,
    color: "#f87171",
  },
  first_share: {
    title: "첫 공유",
    desc: "처음으로 카드를 발급함",
    icon: Share,
    color: "#34d399",
  },
  repeat_10: {
    title: "반복의 의식",
    desc: "같은 곡 10회 감상",
    icon: Repeat,
    color: "#fb7185",
  },
  streak_7: {
    title: "7일 연속",
    desc: "7일 연속 방문",
    icon: Calendar,
    color: "#fb923c",
  },
  streak_30: {
    title: "30일 연속",
    desc: "30일 연속 방문",
    icon: Star,
    color: "#fef08a",
  },
  day_and_night: {
    title: "낮과 밤",
    desc: "낮/밤 모두 감상",
    icon: Moon,
    color: "#818cf8",
  },
  weekend_listener: {
    title: "주말의 여유",
    desc: "주말 감상",
    icon: Sparkles,
    color: "#c084fc",
  },
  playlist_trinity: {
    title: "큐레이션 완주",
    desc: "OST/CEO/Director’s pick 모두 감상",
    icon: Target,
    color: "#2dd4bf",
  },
  daily_like_5: {
    title: "하루 5좋아요",
    desc: "하루에 5곡 이상 좋아요",
    icon: Heart,
    color: "#f87171",
  },
  share_10: {
    title: "10회 공유",
    desc: "카드를 10회 발급/공유",
    icon: Share,
    color: "#22d3ee",
  },
  all_tracks_liked: {
    title: "올 컬렉션",
    desc: "전체 곡을 좋아요",
    icon: Medal,
    color: "#a78bfa",
  },
};

export function getAchievementMeta(achievementId) {
  return (
    ACH_META[achievementId] || {
      title: achievementId,
      desc: "새로운 기록을 획득했습니다.",
      icon: Sparkles,
      color: "#7dd3fc",
    }
  );
}