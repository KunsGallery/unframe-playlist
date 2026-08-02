import {
  AudioLines,
  Award,
  Bookmark,
  Calendar,
  Crown,
  Disc3,
  DoorOpen,
  Flame,
  GalleryVerticalEnd,
  Headphones,
  Heart,
  Library,
  Map,
  Medal,
  Moon,
  Radio,
  Repeat,
  Repeat2,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Star,
  Sunrise,
  Target,
  Trophy,
  Waves,
  Zap,
} from "lucide-react";

const positiveKeyCount = (value) =>
  Object.values(value || {}).filter((count) => Number(count || 0) > 0).length;

const likedCount = (profile, event) => {
  const eventCount = Number(event?.likedCount);
  if (Number.isFinite(eventCount)) return eventCount;
  return Number(profile?.counters?.likes || 0);
};

const achievement = ({ color, ...definition }) => ({
  type: "achievement",
  unlockMode: "automatic",
  color,
  glow: `${color}66`,
  ...definition,
});

export const ACHIEVEMENT_DEFINITIONS = [
  achievement({
    id: "first_listen",
    title: "첫 감상",
    desc: "처음으로 소리를 재생했습니다.",
    icon: Headphones,
    color: "#a78bfa",
    trigger: ["track_play_start"],
    condition: ({ has }) => !has("first_listen"),
  }),
  achievement({
    id: "first_complete",
    title: "첫 완주",
    desc: "처음으로 한 곡을 끝까지 감상했습니다.",
    icon: Trophy,
    color: "#fb7185",
    trigger: ["track_complete"],
    condition: ({ has }) => !has("first_complete"),
  }),
  achievement({
    id: "first_like",
    title: "첫 좋아요",
    desc: "처음으로 좋아요를 남겼습니다.",
    icon: Heart,
    color: "#f87171",
    trigger: ["like_added"],
    condition: ({ has }) => !has("first_like"),
  }),
  achievement({
    id: "first_share",
    title: "첫 공유",
    desc: "처음으로 음악의 기록을 공유했습니다.",
    icon: Share2,
    color: "#34d399",
    trigger: ["share_card"],
    condition: ({ has }) => !has("first_share"),
  }),
  achievement({
    id: "repeat_10",
    title: "반복의 의식",
    desc: "같은 곡을 10번 이상 감상했습니다.",
    icon: Repeat,
    color: "#fb7185",
    trigger: ["track_play_start"],
    condition: ({ getCounter }) => (getCounter("trackPlays.currentTrack") || 0) >= 10,
  }),
  achievement({
    id: "complete_10",
    title: "10번의 완주",
    desc: "완주(90%+)를 10회 달성했습니다.",
    icon: Zap,
    color: "#fbbf24",
    trigger: ["track_complete"],
    condition: ({ profile }) => Number(profile?.counters?.completes || 0) >= 10,
  }),
  achievement({
    id: "complete_50",
    title: "50번의 완주",
    desc: "완주(90%+)를 50회 달성했습니다.",
    icon: Award,
    color: "#f59e0b",
    trigger: ["track_complete"],
    condition: ({ profile }) => Number(profile?.counters?.completes || 0) >= 50,
  }),
  achievement({
    id: "daily_like_5",
    title: "하루 5좋아요",
    desc: "하루에 5곡 이상 좋아요를 남겼습니다.",
    icon: Heart,
    color: "#f87171",
    trigger: ["like_added"],
    condition: ({ profile, dateKey }) => Number(profile?.counters?.dailyLikes?.[dateKey] || 0) >= 5,
  }),
  achievement({
    id: "share_10",
    title: "10회 공유",
    desc: "음악의 기록을 10회 공유했습니다.",
    icon: Send,
    color: "#22d3ee",
    trigger: ["share_card"],
    condition: ({ profile }) => Number(profile?.counters?.shares || 0) >= 10,
  }),
  achievement({
    id: "all_tracks_liked",
    title: "올 컬렉션",
    desc: "현재 공개된 모든 곡을 아카이브했습니다.",
    icon: Medal,
    color: "#a78bfa",
    trigger: ["like_added"],
    condition: ({ event }) => {
      const total = Number(event?.totalTracks || 0);
      const liked = Number(event?.likedCount || 0);
      return total > 0 && liked >= total;
    },
  }),
  achievement({
    id: "streak_7",
    title: "7일 연속 접속",
    desc: "7일 연속으로 공간에 머물렀습니다.",
    icon: Calendar,
    color: "#fb923c",
    trigger: ["daily_active"],
    condition: ({ profile }) => Number(profile?.streak?.count || 0) >= 7,
  }),
  achievement({
    id: "streak_30",
    title: "30일 연속 접속",
    desc: "30일 연속으로 공간에 머물렀습니다.",
    icon: Star,
    color: "#fef08a",
    trigger: ["daily_active"],
    condition: ({ profile }) => Number(profile?.streak?.count || 0) >= 30,
  }),
  achievement({
    id: "streak_100",
    title: "100일 동행",
    desc: "100일 연속으로 공간에 머물렀습니다.",
    icon: Sparkles,
    color: "#ffd600",
    trigger: ["daily_active"],
    condition: ({ profile }) => Number(profile?.streak?.count || 0) >= 100,
  }),
  achievement({
    id: "day_and_night",
    title: "낮과 밤",
    desc: "낮과 새벽의 서로 다른 시간에 감상했습니다.",
    icon: Moon,
    color: "#818cf8",
    trigger: ["track_complete", "track_play_start"],
    condition: ({ profile }) => Boolean(profile?.timeFlags?.listenedDay && profile?.timeFlags?.listenedNight),
  }),
  achievement({
    id: "weekend_listener",
    title: "주말의 여유",
    desc: "주말에 음악을 감상했습니다.",
    icon: Sparkles,
    color: "#c084fc",
    trigger: ["track_play_start", "track_complete"],
    condition: ({ profile }) => Boolean(profile?.timeFlags?.weekend),
  }),
  achievement({
    id: "playlist_trinity",
    title: "큐레이션 완주",
    desc: "서로 다른 UP 플레이리스트 3개를 감상했습니다.",
    icon: Target,
    color: "#2dd4bf",
    trigger: ["playlist_play"],
    condition: ({ profile }) => positiveKeyCount(profile?.counters?.playlistPlays) >= 3,
  }),

  achievement({
    id: "listen_10",
    title: "열 번의 입장",
    desc: "UP의 음악을 10회 재생했습니다.",
    icon: DoorOpen,
    color: "#7dd3fc",
    trigger: ["track_play_start"],
    condition: ({ profile }) => Number(profile?.counters?.listens || 0) >= 10,
  }),
  achievement({
    id: "listen_100",
    title: "백 번의 진동",
    desc: "UP의 음악을 100회 재생했습니다.",
    icon: Radio,
    color: "#38bdf8",
    trigger: ["track_play_start"],
    condition: ({ profile }) => Number(profile?.counters?.listens || 0) >= 100,
  }),
  achievement({
    id: "listen_500",
    title: "오래 머문 사람",
    desc: "UP의 음악을 500회 재생했습니다.",
    icon: AudioLines,
    color: "#143cff",
    trigger: ["track_play_start"],
    condition: ({ profile }) => Number(profile?.counters?.listens || 0) >= 500,
  }),
  achievement({
    id: "unique_tracks_10",
    title: "다른 귀",
    desc: "서로 다른 곡 10개를 발견했습니다.",
    icon: Disc3,
    color: "#34d399",
    trigger: ["track_play_start"],
    condition: ({ profile }) => positiveKeyCount(profile?.counters?.trackPlays) >= 10,
  }),
  achievement({
    id: "unique_tracks_30",
    title: "벽면 전체",
    desc: "서로 다른 곡 30개를 발견했습니다.",
    icon: GalleryVerticalEnd,
    color: "#ccff00",
    trigger: ["track_play_start"],
    condition: ({ profile }) => positiveKeyCount(profile?.counters?.trackPlays) >= 30,
  }),
  achievement({
    id: "repeat_25",
    title: "한 곡의 친구",
    desc: "같은 곡을 25번 감상했습니다.",
    icon: Repeat2,
    color: "#ff5c35",
    trigger: ["track_play_start"],
    condition: ({ getCounter }) => (getCounter("trackPlays.currentTrack") || 0) >= 25,
  }),
  achievement({
    id: "complete_100",
    title: "완주의 습관",
    desc: "완주(90%+)를 100회 달성했습니다.",
    icon: Trophy,
    color: "#f97316",
    trigger: ["track_complete"],
    condition: ({ profile }) => Number(profile?.counters?.completes || 0) >= 100,
  }),
  achievement({
    id: "likes_10",
    title: "아카이브 선반",
    desc: "좋아하는 곡 10개를 아카이브했습니다.",
    icon: Bookmark,
    color: "#fb7185",
    trigger: ["like_added"],
    condition: ({ profile, event }) => likedCount(profile, event) >= 10,
  }),
  achievement({
    id: "likes_30",
    title: "아카이브 방",
    desc: "좋아하는 곡 30개를 아카이브했습니다.",
    icon: Library,
    color: "#ec4899",
    trigger: ["like_added"],
    condition: ({ profile, event }) => likedCount(profile, event) >= 30,
  }),
  achievement({
    id: "share_25",
    title: "소리를 나르는 사람",
    desc: "음악의 기록을 25회 공유했습니다.",
    icon: Send,
    color: "#06b6d4",
    trigger: ["share_card"],
    condition: ({ profile }) => Number(profile?.counters?.shares || 0) >= 25,
  }),
  achievement({
    id: "playlist_5",
    title: "플레이리스트 워커",
    desc: "서로 다른 플레이리스트 5개를 감상했습니다.",
    icon: Map,
    color: "#8b5cf6",
    trigger: ["playlist_play"],
    condition: ({ profile }) => positiveKeyCount(profile?.counters?.playlistPlays) >= 5,
  }),
  achievement({
    id: "playlist_return_5",
    title: "다시 찾은 방",
    desc: "같은 플레이리스트를 5회 다시 찾았습니다.",
    icon: RotateCcw,
    color: "#10b981",
    trigger: ["playlist_play"],
    condition: ({ profile, event }) => {
      const key = event?.playlistKey || event?.playlistId;
      return Boolean(key && Number(profile?.counters?.playlistPlays?.[key] || 0) >= 5);
    },
  }),
];

export const ACHIEVEMENT_CATALOG = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((item) => [item.id, item])
);

const collectible = ({ color, ...definition }) => ({
  type: "collective",
  unlockMode: "admin",
  shape: "hex",
  color,
  glow: `${color}66`,
  ...definition,
});

export const COLLECTIVE_CATALOG = {
  eternal_origin: collectible({ title: "Eternal Signal: The Origin", desc: "UNFRAME의 시작을 함께한 개척자", icon: Flame, color: "#ef4444" }),
  unframe_genesis: collectible({ title: "The Genesis", desc: "갤러리 정식 오픈 멤버", icon: Crown, color: "#fbbf24" }),
  new_year_2026: collectible({ title: "2026 First Light", desc: "2026년 첫 해돋이 기록", icon: Sunrise, color: "#fb7185" }),
  pioneer_26: collectible({ title: "Pioneer 26", desc: "프로젝트 초기 개척자", icon: Target, color: "#2dd4bf" }),
  insadong_wave: collectible({ title: "Insadong First Wave", desc: "인사동 공간의 첫 번째 파동", icon: Waves, color: "#3b82f6" }),
  annual_bronze_2026: collectible({ title: "2026 Bronze", desc: "2026년 기록 정산 브론즈", icon: Medal, color: "#cd7f32", unlockMode: "settlement" }),
  annual_silver_2026: collectible({ title: "2026 Silver", desc: "2026년 기록 정산 실버", icon: Medal, color: "#c0c0c0", unlockMode: "settlement" }),
  annual_gold_2026: collectible({ title: "2026 Gold", desc: "2026년 기록 정산 골드", icon: Trophy, color: "#fbbf24", unlockMode: "settlement" }),
};

export const REWARD_CATALOG = {
  ...ACHIEVEMENT_CATALOG,
  ...COLLECTIVE_CATALOG,
};

export const STICKER_SLOT_COUNT = 30;

export const getAchievementMeta = (id) =>
  ACHIEVEMENT_CATALOG[id] || {
    id,
    title: id,
    desc: "새로운 기록을 획득했습니다.",
    icon: Sparkles,
    color: "#7dd3fc",
    glow: "#7dd3fc66",
  };
