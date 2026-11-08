// src/utils/comments.js
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { callApi } from './api';

export const COMMENT_MAX = 140;

// Visible comments for one track, in playback order. Read once per track, not subscribed,
// so an open player costs one query instead of a live listener.
export async function fetchTrackComments(db, appId, trackId) {
  if (!trackId) return [];
  const snap = await getDocs(query(collection(db, 'artifacts', appId, 'track_comments'), where('trackId', '==', trackId), where('hidden', '==', false), limit(300)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.at - b.at || a.createdAt - b.createdAt);
}

export const postComment = (trackId, at, text) => callApi('track-comment', { action: 'create', trackId, at, text }).then((r) => r.comment);
export const reportComment = (commentId) => callApi('track-comment', { action: 'report', commentId });
export const deleteComment = (commentId) => callApi('track-comment', { action: 'delete', commentId });
export const listCommentsForStudio = () => callApi('track-comment', { action: 'list' }).then((r) => r.comments || []);
export const restoreComment = (commentId) => callApi('track-comment', { action: 'restore', commentId });

// The note that should float over the progress bar right now: the latest one passed within the last few seconds.
export function activeComment(comments, currentTime, windowSeconds = 4) {
  let found = null;
  for (const c of comments) {
    if (c.at > currentTime) break;
    if (currentTime - c.at <= windowSeconds) found = c;
  }
  return found;
}
