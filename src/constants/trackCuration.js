export const TRACK_MOOD_OPTIONS = [
  "calm",
  "focused",
  "soft",
  "bright",
  "melancholy",
  "dreamy",
  "cinematic",
  "energetic",
  "restful",
];

export const TRACK_TIME_SLOT_OPTIONS = [
  "morning",
  "afternoon",
  "evening",
  "late-night",
  "dawn",
  "anytime",
];

export const TRACK_USE_CASE_OPTIONS = [
  "focus",
  "writing",
  "night-work",
  "rest",
  "gallery",
  "walk",
  "opening",
  "archive",
];

export const TRACK_ENERGY_OPTIONS = ["low", "medium", "high"];

export const TRACK_LANGUAGE_OPTIONS = [
  "instrumental",
  "korean",
  "english",
  "japanese",
  "mixed",
  "other",
];

export const DEFAULT_TRACK_CURATION = {
  moods: [],
  timeSlots: ["anytime"],
  useCases: [],
  energy: "medium",
  instrumental: false,
  language: "other",
  tags: [],
  priority: 0,
  isActive: true,
  curatorNote: "",
  album: "",
  exhibition: "",
  artworkTitle: "",
  coverUrl: "",
};

export const parseCommaSeparatedValues = (value) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const normalizeStringArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return parseCommaSeparatedValues(value);
  }

  return fallback;
};

const normalizeEnum = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;

const normalizeNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeInactiveBoolean = (value) => (value === false ? false : true);
const normalizeInstrumentalBoolean = (value) => value === true;

export const createEmptyTrack = () => ({
  title: "",
  artist: "",
  image: "",
  description: "",
  tag: "Ambient",
  genre: "Ambient",
  audioUrl: "",
  lyrics: "",
  ...DEFAULT_TRACK_CURATION,
});

export const normalizeTrackCuration = (track = {}) => ({
  moods: normalizeStringArray(track.moods),
  timeSlots: normalizeStringArray(track.timeSlots, ["anytime"]),
  useCases: normalizeStringArray(track.useCases),
  energy: normalizeEnum(track.energy, TRACK_ENERGY_OPTIONS, "medium"),
  instrumental: normalizeInstrumentalBoolean(track.instrumental),
  language: normalizeEnum(track.language, TRACK_LANGUAGE_OPTIONS, "other"),
  tags: normalizeStringArray(track.tags),
  priority: normalizeNumber(track.priority),
  isActive: normalizeInactiveBoolean(track.isActive),
  curatorNote: typeof track.curatorNote === "string" ? track.curatorNote : "",
  album: typeof track.album === "string" ? track.album : "",
  exhibition: typeof track.exhibition === "string" ? track.exhibition : "",
  artworkTitle: typeof track.artworkTitle === "string" ? track.artworkTitle : "",
  coverUrl: typeof track.coverUrl === "string" ? track.coverUrl : "",
});

export const normalizeTrackForEditor = (track = {}) => {
  const selectedGenre = track.genre || track.tag || "Ambient";

  return {
    ...createEmptyTrack(),
    title: track.title || "",
    artist: track.artist || "",
    image: track.image || "",
    description: track.description || "",
    tag: selectedGenre,
    genre: selectedGenre,
    audioUrl: track.audioUrl || "",
    lyrics: track.lyrics || "",
    ...normalizeTrackCuration(track),
  };
};

export const formatCommaSeparatedValues = (value) =>
  Array.isArray(value) ? value.join(", ") : "";

export const getTrackCurationSummary = (track = {}) => {
  const normalized = normalizeTrackCuration(track);
  return {
    moods: normalized.moods.slice(0, 2),
    timeSlots: normalized.timeSlots.slice(0, 1),
    useCases: normalized.useCases.slice(0, 1),
    priority: normalized.priority,
    isActive: normalized.isActive,
    instrumental: normalized.instrumental,
  };
};

export const getTrackCurationStatus = (track = {}) => {
  const normalized = normalizeTrackCuration(track);
  if (normalized.isActive === false) return "inactive";

  const filledFields = [
    normalized.moods.length > 0,
    normalized.timeSlots.length > 0,
    normalized.useCases.length > 0,
    normalized.tags.length > 0,
    Boolean(normalized.curatorNote.trim()),
  ].filter(Boolean).length;

  return filledFields >= 2 ? "ready" : "needs";
};

export const getMissingTrackCurationPatch = (track = {}) => {
  const patch = {};
  const hasValue = (value) => value !== undefined && value !== null;

  if (!hasValue(track.moods)) patch.moods = DEFAULT_TRACK_CURATION.moods;
  if (!hasValue(track.timeSlots)) patch.timeSlots = DEFAULT_TRACK_CURATION.timeSlots;
  if (!hasValue(track.useCases)) patch.useCases = DEFAULT_TRACK_CURATION.useCases;
  if (!hasValue(track.energy)) patch.energy = DEFAULT_TRACK_CURATION.energy;
  if (!hasValue(track.instrumental)) patch.instrumental = DEFAULT_TRACK_CURATION.instrumental;
  if (!hasValue(track.language)) patch.language = DEFAULT_TRACK_CURATION.language;
  if (!hasValue(track.tags)) patch.tags = DEFAULT_TRACK_CURATION.tags;
  if (!hasValue(track.priority)) patch.priority = DEFAULT_TRACK_CURATION.priority;
  if (!hasValue(track.isActive)) patch.isActive = DEFAULT_TRACK_CURATION.isActive;
  if (!hasValue(track.curatorNote)) patch.curatorNote = DEFAULT_TRACK_CURATION.curatorNote;
  if (!hasValue(track.album)) patch.album = DEFAULT_TRACK_CURATION.album;
  if (!hasValue(track.exhibition)) patch.exhibition = DEFAULT_TRACK_CURATION.exhibition;
  if (!hasValue(track.artworkTitle)) patch.artworkTitle = DEFAULT_TRACK_CURATION.artworkTitle;
  if (!hasValue(track.coverUrl)) patch.coverUrl = DEFAULT_TRACK_CURATION.coverUrl;

  return patch;
};
