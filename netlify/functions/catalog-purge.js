import { purgeCache } from '@netlify/cache';
import { guard, response, failure, error, isAdminUser } from '../lib/server.js';

// Visitors read the catalog from Netlify's CDN, kept for up to ten minutes. After a studio save
// the editor calls this so the next visitor gets the new hero, tracks and playlists at once.
export const CATALOG_CACHE_TAG = 'catalog';

export async function handler(event) {
  try {
    const user = await guard(event, 30, 60000);
    if (!isAdminUser(user)) throw error(403, '관리자만 쓸 수 있습니다.');
    await purgeCache({ tags: [CATALOG_CACHE_TAG] });
    return response(200, { purged: true });
  } catch (err) {
    if (!err.status) return failure(Object.assign(err, { status: 502, message: '공개 화면을 바로 새로 고치지 못했습니다. 10분 안에 저절로 반영됩니다.' }));
    return failure(err);
  }
}
