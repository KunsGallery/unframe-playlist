import { FieldValue } from 'firebase-admin/firestore';
import { guard, services, root, privateProfile, response, failure, error, safeId, jsonBody, rateLimit, publicNickname, isAdminUser } from '../lib/server.js';
import { durationSeconds } from './reward-event.js';

// Timed comments: a listener pins a short note to a moment in a track (SoundCloud style).
// Comments go public at once. Three reports hide one; the author or an admin can delete it.
export const MAX_COMMENT_LENGTH = 140;
export const HIDE_AFTER_REPORTS = 3;
const comments = () => root().collection('track_comments');

export function cleanCommentText(value) {
  if (typeof value !== 'string') return '';
  // Control and invisible direction characters become spaces; the note stays a single short line.
  const invisible = (code) => code < 0x20 || code === 0x7f || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
  return [...value].map((ch) => (invisible(ch.codePointAt(0)) ? ' ' : ch)).join('').replace(/\s+/g, ' ').trim();
}

export function validAt(at, track) {
  const seconds = Number(at);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const duration = durationSeconds(track);
  if (duration && seconds > duration + 5) return null;
  return Math.round(seconds * 10) / 10;
}

async function create(user, input) {
  if (!safeId(input.trackId)) throw error(400, '곡 정보를 확인해 주세요.');
  const text = cleanCommentText(input.text);
  if (!text) throw error(400, '남길 말을 적어 주세요.');
  if ([...text].length > MAX_COMMENT_LENGTH) throw error(400, `${MAX_COMMENT_LENGTH}자 이내로 적어 주세요.`);
  const trackSnap = await root().collection('public').doc('data').collection('tracks').doc(input.trackId).get();
  if (!trackSnap.exists) throw error(400, '발행된 곡에만 남길 수 있습니다.');
  const at = validAt(input.at, trackSnap.data());
  if (at === null) throw error(400, '곡 안의 시점을 선택해 주세요.');
  await rateLimit(`comment-day:${user.uid}`, 40, 86400000);
  const profile = (await privateProfile(user.uid).get()).data() || {};
  const doc = {
    trackId: input.trackId,
    at,
    text,
    uid: user.uid,
    nickname: publicNickname(profile),
    profileImg: typeof profile.profileImg === 'string' && /^https:\/\/i\.ibb\.co\//.test(profile.profileImg) ? profile.profileImg : '',
    createdAt: Date.now(),
    hidden: false,
    reports: 0,
  };
  const ref = await comments().add(doc);
  return { comment: { id: ref.id, ...doc } };
}

async function report(user, input) {
  if (!safeId(input.commentId)) throw error(400, '댓글을 확인해 주세요.');
  const ref = comments().doc(input.commentId), mark = root().collection('comment_reports').doc(`${input.commentId}_${user.uid}`);
  await services().db.runTransaction(async (tx) => {
    const [snap, seen] = await Promise.all([tx.get(ref), tx.get(mark)]);
    if (!snap.exists) throw error(404, '이미 지워진 댓글입니다.');
    if (snap.data().uid === user.uid) throw error(400, '내 댓글은 신고할 수 없습니다.');
    if (seen.exists) return;
    const reports = (snap.data().reports || 0) + 1;
    tx.set(mark, { commentId: input.commentId, uid: user.uid, at: Date.now(), expiresAt: new Date(Date.now() + 90 * 86400000) });
    tx.update(ref, { reports, ...(reports >= HIDE_AFTER_REPORTS ? { hidden: true } : {}) });
  });
  return { reported: true };
}

async function remove(user, input) {
  if (!safeId(input.commentId)) throw error(400, '댓글을 확인해 주세요.');
  const ref = comments().doc(input.commentId), snap = await ref.get();
  if (!snap.exists) return { deleted: true };
  if (snap.data().uid !== user.uid && !isAdminUser(user)) throw error(403, '내가 남긴 댓글만 지울 수 있습니다.');
  await ref.delete();
  return { deleted: true };
}

// Admin moderation list: newest first, reported ones included even when hidden.
async function list(user) {
  if (!isAdminUser(user)) throw error(403, '관리자만 볼 수 있습니다.');
  const snap = await comments().orderBy('createdAt', 'desc').limit(200).get();
  return { comments: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}

async function restore(user, input) {
  if (!isAdminUser(user)) throw error(403, '관리자만 되살릴 수 있습니다.');
  if (!safeId(input.commentId)) throw error(400, '댓글을 확인해 주세요.');
  await comments().doc(input.commentId).update({ hidden: false, reports: 0, restoredAt: FieldValue.serverTimestamp() });
  return { restored: true };
}

export async function handler(event) {
  try {
    const user = await guard(event, 12, 60000), input = jsonBody(event);
    const action = { create, report, delete: remove, list, restore }[input.action];
    if (!action) throw error(400, '요청을 확인해 주세요.');
    return response(200, await action(user, input));
  } catch (err) { return failure(err); }
}
