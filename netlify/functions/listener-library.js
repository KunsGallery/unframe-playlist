import { randomUUID, createHash } from 'node:crypto';
import { guard, root, privateProfile, services, response, failure, error, safeId, projectRanking, jsonBody } from '../lib/server.js';
const text = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
export async function handler(event) {
  try {
    const user = await guard(event, 30), data = jsonBody(event);
    const userRef = root().collection('users').doc(user.uid);
    const lists = userRef.collection('playlists'), follows = userRef.collection('follows');
    const profileRef = privateProfile(user.uid);
    if (data.action === 'get') {
      const [p, f, profile, releases] = await Promise.all([lists.get(), follows.get(), profileRef.get(), root().collection('public').doc('data').collection('tracks').get()]);
      const settings = profile.data() || {}, followed = f.docs.map((d) => ({ id: d.id, ...d.data() }));
      const notifications = settings.releaseNotifications === true ? releases.docs.filter((d) => followed.some((follow) => {
        const track = d.data(), at = track.publishedAt?.toMillis?.() || track.createdAt?.toMillis?.() || Date.parse(track.publishedAt || track.createdAt || '') || 0;
        return at > Math.max(follow.followedAt, settings.notificationsSeenAt || 0) && track[follow.kind] === follow.name;
      })).map((d) => ({ id: d.id, title: d.data().title, artist: d.data().artist })) : [];
      return response(200, { playlists: p.docs.map((d) => ({ id: d.id, ...d.data() })), follows: followed, notifications, settings: { rankingOptIn: settings.rankingOptIn === true, releaseNotifications: settings.releaseNotifications === true } });
    }
    if (data.action === 'save-playlist') {
      if (!text(data.title, 80)) throw error(400, '플레이리스트 제목을 입력해 주세요.');
      if (!Array.isArray(data.trackIds) || data.trackIds.length > 100 || !data.trackIds.every(safeId)) throw error(400, '100곡 이하로 담아 주세요.');
      const trackIds = [...new Set(data.trackIds)];
      const catalog = await root().collection('public').doc('data').collection('tracks').get();
      if (trackIds.some((id) => !catalog.docs.some((t) => t.id === id))) throw error(400, '비공개 또는 삭제된 곡이 있습니다. 곡 목록을 다시 확인해 주세요.');
      if (data.id && !safeId(data.id)) throw error(400, '잘못된 플레이리스트입니다.');
      const ref = data.id ? lists.doc(data.id) : lists.doc();
      await services().db.runTransaction(async (tx) => {
        const snap = await tx.get(ref), existing = snap.data();
        const all = await tx.get(lists.limit(51));
        if (!snap.exists && all.size >= 50) throw error(400, '플레이리스트는 최대 50개까지 만들 수 있습니다.');
        const publicId = existing?.publicId || randomUUID();
        const payload = { title: text(data.title, 80), description: text(data.description, 500), trackIds, isPublic: data.isPublic === true, publicId, updatedAt: Date.now(), createdAt: existing?.createdAt || Date.now() };
        tx.set(ref, payload);
        const publicRef = root().collection('shared_playlists').doc(publicId);
        if (payload.isPublic) tx.set(publicRef, { title: payload.title, description: payload.description, trackIds, updatedAt: payload.updatedAt });
        else tx.delete(publicRef);
      });
      return response(200, { id: ref.id });
    }
    if (data.action === 'delete-playlist') {
      if (!safeId(data.id)) throw error(400, '잘못된 플레이리스트입니다.');
      await services().db.runTransaction(async (tx) => {
        const ref = lists.doc(data.id), snap = await tx.get(ref);
        if (snap.data()?.publicId) tx.delete(root().collection('shared_playlists').doc(snap.data().publicId));
        tx.delete(ref);
      });
      return response(200, { ok: true });
    }
    if (data.action === 'follow') {
      if (!['artist', 'exhibition'].includes(data.kind) || !text(data.name, 120)) throw error(400, '팔로우 대상을 확인해 주세요.');
      const name = text(data.name, 120), id = createHash('sha256').update(data.kind + ':' + name).digest('hex');
      const ref = follows.doc(id);
      const catalog = await root().collection('public').doc('data').collection('tracks').get();
      if (data.enabled && !catalog.docs.some((d) => d.data()[data.kind] === name)) throw error(400, '발행된 전시·아티스트만 팔로우할 수 있습니다.');
      await services().db.runTransaction(async (tx) => {
        const [old, all] = await Promise.all([tx.get(ref), tx.get(follows.limit(51))]);
        if (data.enabled && !old.exists && all.size >= 50) throw error(400, '팔로우는 최대 50개까지 가능합니다.');
        if (data.enabled) tx.set(ref, { kind: data.kind, name, followedAt: old.data()?.followedAt || Date.now() }); else tx.delete(ref);
      });
      return response(200, { ok: true });
    }
    if (data.action === 'settings') {
      const payload = {};
      for (const key of ['rankingOptIn', 'releaseNotifications']) if (typeof data[key] === 'boolean') payload[key] = data[key];
      if (data.markRead === true) payload.notificationsSeenAt = Date.now();
      await profileRef.set(payload, { merge: true });
      await projectRanking(user.uid);
      return response(200, { ok: true });
    }
    if (data.action === 'export') {
      const [profile, p, f, likes] = await Promise.all([profileRef.get(), lists.get(), follows.get(), userRef.collection('likes').get()]);
      return response(200, { exportedAt: new Date().toISOString(), profile: profile.data(), playlists: p.docs.map((d) => ({ id: d.id, ...d.data() })), follows: f.docs.map((d) => d.data()), likes: likes.docs.map((d) => d.id) });
    }
    throw error(400, '지원하지 않는 요청입니다.');
  } catch (err) { return failure(err); }
}
