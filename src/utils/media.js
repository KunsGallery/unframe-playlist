import mediaMirror from '../constants/mediaMirror.js';

const IMAGE_FIELDS = ['image', 'coverUrl', 'coverImage', 'backgroundImage', 'memoryPhoto'];

export const mediaUrl = (url) => (typeof url === 'string' && mediaMirror[url.trim()]) || url;

// Display copy only. The studio keeps the stored URLs so saving never rewrites them.
export function withMirroredMedia(record) {
  if (!record || typeof record !== 'object') return record;
  const next = { ...record };
  for (const field of IMAGE_FIELDS) if (next[field]) next[field] = mediaUrl(next[field]);
  if (Array.isArray(next.heroSlides)) next.heroSlides = next.heroSlides.map(withMirroredMedia);
  return next;
}
