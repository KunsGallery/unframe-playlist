import { Timestamp } from 'firebase-admin/firestore';

// The CDN answers repeat requests, so Firestore is read about once per interval however many people visit.
export const PUBLIC_FEED_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=60',
  'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=600, stale-while-revalidate=3600',
};

// Client code reads Firestore timestamps through `.seconds`, which plain JSON would otherwise lose.
export function toPlainData(value) {
  if (value instanceof Timestamp) return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (Array.isArray(value)) return value.map(toPlainData);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlainData(item)]));
  return value;
}

export const docsToRows = (snapshot) => snapshot.docs.map((doc) => ({ id: doc.id, ...toPlainData(doc.data()) }));
