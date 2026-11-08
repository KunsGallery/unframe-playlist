// src/hooks/useTrackComments.js
import { useCallback, useEffect, useState } from 'react';
import { db, appId } from '../firebase';
import { fetchTrackComments } from '../utils/comments';

export function useTrackComments(trackId) {
  const [state, setState] = useState({ trackId: null, comments: [], error: '' });

  const reload = useCallback(() => {
    if (!trackId) return;
    fetchTrackComments(db, appId, trackId)
      .then((comments) => setState({ trackId, comments, error: '' }))
      .catch(() => setState({ trackId, comments: [], error: '댓글을 불러오지 못했습니다.' }));
  }, [trackId]);

  useEffect(() => { reload(); }, [reload]);

  // Comments from the previous track never show while the next one loads.
  const current = state.trackId === trackId ? state : { comments: [], error: '' };
  const add = useCallback((comment) => setState((s) => ({ ...s, comments: [...s.comments, comment].sort((a, b) => a.at - b.at) })), []);
  const drop = useCallback((id) => setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id) })), []);
  return { comments: current.comments, error: current.error, loading: state.trackId !== trackId, reload, add, drop };
}
