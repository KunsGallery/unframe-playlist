import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getAppCheck } from 'firebase-admin/app-check';
import { createHash } from 'node:crypto';
export const APP_ID = process.env.UNFRAME_APP_ID || 'unframe-playlist-v1';
export function services() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw && !process.env.FIRESTORE_EMULATOR_HOST) throw Object.assign(new Error('서버 준비 중입니다. 잠시 후 다시 시도해 주세요.'), { status: 503 });
    initializeApp(raw ? { credential: cert(JSON.parse(raw)), projectId: 'unframe-playlist' } : { projectId: process.env.GCLOUD_PROJECT || 'demo-up' });
  }
  return { db: getFirestore(), auth: getAuth(), appCheck: getAppCheck() };
}
export const error = (status, message) => Object.assign(new Error(message), { status });
export const root = () => services().db.doc(`artifacts/${APP_ID}`);
export const privateProfile = (uid) => root().collection('users').doc(uid).collection('profile').doc('stats');
export async function identity(event) {
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer /, '');
  if (!token) throw error(401, '로그인이 필요합니다.');
  let user;
  try { user = await services().auth.verifyIdToken(token); } catch { throw error(401, '로그인을 다시 해주세요.'); }
  if (user.firebase?.sign_in_provider === 'anonymous') throw error(403, 'Google 로그인 후 이용할 수 있습니다.');
  const appToken = event.headers['x-firebase-appcheck'];
  let attestation = 'missing';
  if (appToken) {
    try { await services().appCheck.verifyToken(appToken); attestation = 'valid'; } catch { throw error(403, '앱 인증을 확인하지 못했습니다. 새로고침해 주세요.'); }
  }
  if (process.env.APP_CHECK_ENFORCE === 'true' && attestation !== 'valid') throw error(403, '앱 인증이 필요합니다. 새로고침해 주세요.');
  console.info(JSON.stringify({ metric: 'app_check', status: attestation }));
  return user;
}
export async function rateLimit(key, limit = 60, period = 60000) {
  const ref = root().collection('server_limits').doc(createHash('sha256').update(key).digest('hex'));
  const now = Date.now();
  await services().db.runTransaction(async (tx) => {
    const snap = await tx.get(ref), old = snap.data();
    const active = old && now < old.until;
    if (active && old.count >= limit) throw error(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
    tx.set(ref, { count: active ? old.count + 1 : 1, until: active ? old.until : now + period, expiresAt: new Date(now + 86400000) });
  });
}
export async function guard(event, limit = 60, period = 60000) {
  if (event.httpMethod !== 'POST') throw error(405, 'POST 요청만 지원합니다.');
  const origin = event.headers.origin;
  const allowed = ['https://up.unframe.kr', process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean);
  if (origin && !allowed.includes(origin) && !(process.env.NETLIFY_DEV === 'true' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))) throw error(403, '허용되지 않은 요청입니다.');
  if ((event.body || '').length > 4_000_000) throw error(413, '요청 용량이 너무 큽니다.');
  const user = await identity(event);
  const ip = event.headers['x-nf-client-connection-ip'];
  if (ip) await rateLimit(`ip:${ip}`, 240);
  await rateLimit(`user:${user.uid}:${event.path || ''}`, limit, period);
  return user;
}
export const response = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(statusCode === 429 ? { 'Retry-After': '60' } : {}) }, body: JSON.stringify(body) });
export function failure(err) {
  if (!err.status) console.error(JSON.stringify({ metric: 'api_error', code: err.code || 'unknown' }));
  return response(err.status || 500, { error: err.status ? err.message : '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
}
export const safeId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,140}$/.test(value);
export function jsonBody(event) {
  try { const data = JSON.parse(event.body || '{}'); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
  catch { throw error(400, '요청 형식을 확인해 주세요.'); }
}
export async function projectRanking(uid) {
  const { getLevelInfo } = await import('../../src/levels.js');
  await services().db.runTransaction(async (tx) => {
    const indexRef = root().collection('public_stats').doc(uid), ref = root().collection('leaderboard').doc(uid);
    const [p, legacy] = await Promise.all([tx.get(privateProfile(uid)), tx.get(indexRef)]);
    const profile = p.data() || {}, lv = getLevelInfo(profile.xp || 0);
    const projection = { displayName: profile.nickname || 'Listener', nickname: profile.nickname || 'Listener', profileImg: profile.profileImg || '', listenCount: profile.listenCount || 0, shareCount: profile.shareCount || 0, likedCount: profile.likedCount || 0, xp: profile.xp || 0, level: lv.level, levelKey: lv.key, levelName: profile.levelOverrideName || lv.name, levelColor: profile.levelOverrideColor || lv.color };
    tx.set(indexRef, projection, { merge: true });
    if (profile.rankingOptIn !== true || profile.isRankingHidden || legacy.data()?.isRankingHidden) tx.delete(ref); else tx.set(ref, projection);
  });
}
