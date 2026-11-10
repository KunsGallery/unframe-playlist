import { root, response, failure, error } from '../lib/server.js';
import { PUBLIC_FEED_HEADERS } from '../lib/publicFeed.js';

// Listener playlists for the Library's recommendations: only those shared by link whose owner
// has not turned off "Library 추천에 보여주기". No owner details leave the server.
export const COMMUNITY_LIMIT = 40;

export function pickCommunityPlaylists(docs, limit = COMMUNITY_LIMIT) {
  return docs
    .filter((doc) => doc.data.discoverable !== false && Array.isArray(doc.data.trackIds) && doc.data.trackIds.length > 0 && doc.data.title)
    .sort((a, b) => (Number(b.data.updatedAt) || 0) - (Number(a.data.updatedAt) || 0))
    .slice(0, limit)
    .map((doc) => ({
      publicId: doc.id,
      title: String(doc.data.title).slice(0, 80),
      description: String(doc.data.description || '').slice(0, 500),
      trackIds: doc.data.trackIds.slice(0, 100),
      updatedAt: Number(doc.data.updatedAt) || 0,
    }));
}

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') throw error(405, 'GET 요청만 지원합니다.');
    const snap = await root().collection('shared_playlists').get();
    const playlists = pickCommunityPlaylists(snap.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
    return { ...response(200, {}), headers: PUBLIC_FEED_HEADERS, body: JSON.stringify({ playlists }) };
  } catch (err) { return failure(err); }
}
