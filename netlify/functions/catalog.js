import { root, response, failure, error } from '../lib/server.js';
import { PUBLIC_FEED_HEADERS, docsToRows, toPlainData } from '../lib/publicFeed.js';
import { CATALOG_CACHE_TAG } from './catalog-purge.js';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') throw error(405, 'GET 요청만 지원합니다.');
    const data = root().collection('public').doc('data');
    const [tracks, playlists, gatheringPlaylists, siteConfig, featured] = await Promise.all([
      data.collection('tracks').get(),
      data.collection('playlists').get(),
      data.collection('gathering_playlists').get(),
      data.collection('site_config').doc('main_texts').get(),
      data.collection('featured').doc('directors_pick').get(),
    ]);
    return {
      ...response(200, {}),
      // Tagged so a studio save can clear the CDN copy right away (see catalog-purge).
      headers: { ...PUBLIC_FEED_HEADERS, 'Netlify-Cache-Tag': CATALOG_CACHE_TAG },
      body: JSON.stringify({
        tracks: docsToRows(tracks),
        playlists: docsToRows(playlists),
        gatheringPlaylists: docsToRows(gatheringPlaylists),
        siteConfig: toPlainData(siteConfig.data() || {}),
        featured: toPlainData(featured.data() || null),
      }),
    };
  } catch (err) { return failure(err); }
}
