import { useCallback, useEffect, useState } from 'react';
import { callApi } from '../utils/api';
import { auth } from '../firebase';
export function useListenerLibrary(user, tracks = []) {
  const releaseRevision = tracks.filter((t) => t.status !== 'draft').map((t) => `${t.id}:${t.publishedAt?.seconds || t.publishedAt || ''}`).sort().join('|');
  const [data, setData] = useState({ playlists: [], follows: [], notifications: [], settings: {} });
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!user || user.isAnonymous) { setData({ playlists: [], follows: [], notifications: [], settings: {} }); return; }
    setLoading(true); setError('');
    try { const result = await callApi('listener-library', { action: 'get' }); if (auth.currentUser?.uid === user.uid) setData({ ...result, _uid: user.uid }); } catch (e) { if (auth.currentUser?.uid === user.uid) setError(e.message); } finally { if (auth.currentUser?.uid === user.uid) setLoading(false); }
  }, [user]);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh, releaseRevision]);
  const mutate = useCallback(async (body) => {
    if (auth.currentUser?.uid !== user?.uid) throw new Error('계정이 변경되었습니다. 다시 시도해 주세요.');
    if (body.action === 'settings') setData((prev) => ({ ...prev, settings: { ...prev.settings, ...Object.fromEntries(Object.entries(body).filter(([k]) => ['rankingOptIn', 'releaseNotifications'].includes(k))) } }));
    try { const result = await callApi('listener-library', body); await refresh(); return result; } catch (e) { await refresh(); throw e; }
  }, [refresh, user?.uid]);
  const visible = data._uid === user?.uid ? data : { playlists: [], follows: [], notifications: [], settings: {} };
  return { ...visible, loading, error, refresh, mutate };
}
