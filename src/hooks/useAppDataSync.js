import { useEffect } from 'react';
import { doc, setDoc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { createAchievementEngine } from '../store';
import { ADMIN_EMAILS } from '../firebase';
import { dateKey } from '../utils/rewardState';
import { withMirroredMedia } from '../utils/media';

const CATALOG_REFRESH_MS = 10 * 60 * 1000;

function dailyVisitAlreadySent(uid) {
  try { return localStorage.getItem(`up:daily:${uid}`) === dateKey(); } catch { return false; }
}
function rememberDailyVisit(uid) {
  try { localStorage.setItem(`up:daily:${uid}`, dateKey()); } catch { /* Storage is optional; the server treats a repeat as a no-op. */ }
}

async function fetchCatalog() {
  const response = await fetch('/api/catalog', { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('catalog unavailable');
  const catalog = await response.json();
  if (!Array.isArray(catalog.tracks) || !catalog.tracks.length) throw new Error('catalog empty');
  return catalog;
}

export function useAppDataSync({ user, isAuthReady, db, appId, setUserProfile, setNickInput, setNickError, setIsNickModalOpen, setTracks, setCurrentQueue, setPlaylists, setGatheringPlaylists, setUserLikes, setSiteConfig, setStudioContent, engineRef, setDataError, retryToken = 0, onRewards, setDataLoading }) {
  useEffect(() => {
    if (!isAuthReady) return;
    setDataError?.(''); setDataLoading?.(true);
    const onError = () => { setDataLoading?.(false); setDataError?.('콘텐츠를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'); };
    const unsubs = [];
    const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase());
    const engine = createAchievementEngine({ disabled: !user });
    let cancelled = false;
    engineRef.current = engine;
    if (!user) { setUserProfile({ xp: 0, rewards: [] }); setUserLikes([]); setNickInput(''); setNickError(''); setIsNickModalOpen(false); }
    else {
      if (!dailyVisitAlreadySent(user.uid)) engine.processEvent({ type: 'daily_active' }).then((r) => { rememberDailyVisit(user.uid); if (r.unlockedRewards?.length) onRewards?.(r.unlockedRewards); }).catch(() => setDataError?.('감상 기록 서버에 연결하지 못했습니다. 재생은 계속 이용할 수 있습니다.'));
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
      unsubs.push(onSnapshot(profileRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data(); setUserProfile({ ...data, _uid: user.uid });
        if (!data.nicknamePrompted) {
          // Never prefill the Google name: saving it would make a real name the public nickname.
          setNickInput(data.nicknameUpdatedCount ? (data.nickname || '').trim() : ''); setNickError(''); setIsNickModalOpen(true);
          setDoc(profileRef, { nicknamePrompted: true }, { merge: true }).catch(() => {});
        }
      }, onError));
    }

    const showTracks = (rows) => {
      setTracks(rows);
      setDataLoading?.(false);
      setCurrentQueue((prev) => prev?.length ? prev.filter((t) => rows.some((current) => current.id === t.id)).map((t) => rows.find((current) => current.id === t.id)) : []);
    };
    const subscribeContent = (kind, setter) => {
      const sources = new Map();
      const sync = () => {
        const rows = [...new Map([...(sources.get('public') || []), ...(sources.get('editorial') || [])].map((r) => [r.id, r])).values()];
        if (isAdmin) setStudioContent?.((prev) => ({ ...prev, [kind]: rows }));
        const display = rows.map(withMirroredMedia);
        if (kind === 'tracks') showTracks(display); else setter(display);
      };
      for (const source of isAdmin ? ['public', 'editorial'] : ['public']) unsubs.push(onSnapshot(collection(db, 'artifacts', appId, source, 'data', kind), (snap) => { sources.set(source, snap.docs.map((d) => ({ id: d.id, ...d.data() }))); sync(); }, onError));
    };
    const subscribeLive = () => {
      subscribeContent('tracks', setTracks); subscribeContent('playlists', setPlaylists); subscribeContent('gathering_playlists', setGatheringPlaylists);
      getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts')).then((snap) => { if (!cancelled) setSiteConfig((prev) => ({ ...prev, ...(snap.exists() ? withMirroredMedia(snap.data()) : {}), contentReady: true })); }).catch(onError);
    };
    const showCatalog = (catalog) => {
      showTracks(catalog.tracks.map(withMirroredMedia));
      setPlaylists((catalog.playlists || []).map(withMirroredMedia));
      setGatheringPlaylists((catalog.gatheringPlaylists || []).map(withMirroredMedia));
      setSiteConfig((prev) => ({ ...prev, ...withMirroredMedia(catalog.siteConfig), featured: catalog.featured, contentReady: true }));
    };

    // Visitors get the shared CDN copy. The studio stays live because editors must see their own saves at once.
    if (isAdmin) subscribeLive();
    else {
      let loadedAt = 0;
      fetchCatalog().then((catalog) => { if (cancelled) return; loadedAt = Date.now(); showCatalog(catalog); }).catch(() => { if (!cancelled) subscribeLive(); });
      const refreshWhenVisible = () => {
        if (document.visibilityState !== 'visible' || !loadedAt || Date.now() - loadedAt < CATALOG_REFRESH_MS) return;
        loadedAt = Date.now();
        fetchCatalog().then((catalog) => { if (!cancelled) showCatalog(catalog); }).catch(() => { /* Keep showing the catalog already loaded. */ });
      };
      document.addEventListener('visibilitychange', refreshWhenVisible);
      unsubs.push(() => document.removeEventListener('visibilitychange', refreshWhenVisible));
    }
    if (user) unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'), (snap) => setUserLikes(snap.docs.map((d) => d.id)), onError));
    return () => { cancelled = true; unsubs.forEach((unsub) => unsub()); if (engineRef.current === engine) engineRef.current = null; };
  }, [user, isAuthReady, db, appId, setUserProfile, setNickInput, setNickError, setIsNickModalOpen, setTracks, setCurrentQueue, setPlaylists, setGatheringPlaylists, setUserLikes, setSiteConfig, setStudioContent, engineRef, setDataError, retryToken, onRewards, setDataLoading]);
}
