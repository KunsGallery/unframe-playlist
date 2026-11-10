import { root, response, failure, error } from '../lib/server.js';
import { PUBLIC_FEED_HEADERS, docsToRows, toPlainData } from '../lib/publicFeed.js';
import { CATALOG_CACHE_TAG } from './catalog-purge.js';
import { readLikeCounts } from '../lib/trackLikes.js';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') throw error(405, 'GET 요청만 지원합니다.');
    const data = root().collection('public').doc('data');
    const [tracks, playlists, gatheringPlaylists, siteConfig, featured, likeCounts] = await Promise.all([
      data.collection('tracks').get(),
      data.collection('playlists').get(),
      data.collection('gathering_playlists').get(),
      data.collection('site_config').doc('main_texts').get(),
      data.collection('featured').doc('directors_pick').get(),
      // Like counts only order the list; the catalog still loads if they cannot be read.
      readLikeCounts().catch(() => ({})),
    ]);
    return {
      ...response(200, {}),
      // Tagged so a studio save can clear the CDN copy right away (see catalog-purge).
      headers: { ...PUBLIC_FEED_HEADERS, 'Netlify-Cache-Tag': CATALOG_CACHE_TAG },
      body: JSON.stringify({
        tracks: docsToRows(tracks).map((track) => ({ ...track, likeCount: Math.max(0, Number(likeCounts[track.id]) || 0) })),
        playlists: docsToRows(playlists),
        gatheringPlaylists: docsToRows(gatheringPlaylists),
        siteConfig: toPlainData(siteConfig.data() || {}),
        featured: toPlainData(featured.data() || null),
      }),
    };
  } catch (err) { return failure(err); }
}
