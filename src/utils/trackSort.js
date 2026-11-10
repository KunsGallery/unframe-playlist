// src/utils/trackSort.js
// Ordering for the public track lists (home catalog and the Archive page).

// Older documents store createdAt as milliseconds, newer ones as a Firestore timestamp.
export const releaseTime = (track) => {
  const value = track?.publishedAt || track?.createdAt;
  if (value?.seconds) return value.seconds * 1000;
  if (typeof value === 'number') return value;
  return Date.parse(value || '') || 0;
};

export const TRACK_SORTS = [
  { id: 'newest', label: '최신순' },
  { id: 'oldest', label: '오래된순' },
  { id: 'title', label: '이름순' },
  { id: 'likes', label: '좋아요순' },
];

export const DEFAULT_TRACK_SORT = 'newest';

const byTitle = (a, b) => String(a?.title || '').localeCompare(String(b?.title || ''), 'ko', { numeric: true, sensitivity: 'base' });
const newestFirst = (a, b) => releaseTime(b) - releaseTime(a) || byTitle(a, b);

const COMPARE = {
  newest: newestFirst,
  oldest: (a, b) => releaseTime(a) - releaseTime(b) || byTitle(a, b),
  title: (a, b) => byTitle(a, b) || newestFirst(a, b),
  likes: (a, b) => (Number(b?.likeCount) || 0) - (Number(a?.likeCount) || 0) || newestFirst(a, b),
};

export const sortTracks = (tracks, mode = DEFAULT_TRACK_SORT) =>
  [...(tracks || [])].filter(Boolean).sort(COMPARE[mode] || COMPARE[DEFAULT_TRACK_SORT]);
