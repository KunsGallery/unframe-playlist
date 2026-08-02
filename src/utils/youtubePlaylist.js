const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,80}$/;

export const extractYouTubePlaylistId = (value) => {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return "";

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host) && !host.endsWith(".youtube.com")) return "";

    const playlistId = (url.searchParams.get("list") || "").trim();
    return PLAYLIST_ID_PATTERN.test(playlistId) ? playlistId : "";
  } catch {
    return PLAYLIST_ID_PATTERN.test(input) ? input : "";
  }
};

export const buildYouTubePlaylistEmbedUrl = (playlistId) => {
  if (!PLAYLIST_ID_PATTERN.test(playlistId || "")) return "";

  const params = new URLSearchParams({
    listType: "playlist",
    list: playlistId,
    playsinline: "1",
    rel: "0",
  });

  return `https://www.youtube.com/embed?${params.toString()}`;
};

export const createEmptyGatheringPlaylist = () => ({
  youtubeUrl: "",
  youtubePlaylistId: "",
  title: "",
  desc: "",
  eventDate: new Date().toISOString().slice(0, 10),
  location: "UNFRAME",
  image: "",
  isPublished: true,
});

export const getGatheringSortTime = (playlist) => {
  const eventTime = new Date(playlist?.eventDate || "").getTime();
  if (Number.isFinite(eventTime)) return eventTime;

  const value = playlist?.createdAt;
  if (typeof value === "number") return value;
  if (value?.seconds) return value.seconds * 1000;
  if (value?.toDate) return value.toDate().getTime();

  const createdTime = new Date(value || "").getTime();
  return Number.isFinite(createdTime) ? createdTime : 0;
};

export const formatGatheringDate = (value) => {
  if (!value) return "DATE TBA";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replaceAll("-", ".");
};
