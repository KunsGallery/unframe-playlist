import { useEffect } from 'react';
import { doc, setDoc, collection, onSnapshot, query, getDoc, orderBy, limit } from 'firebase/firestore';
import { createAchievementEngine } from '../store';
import { ADMIN_EMAILS } from '../firebase';

export function useAppDataSync({ user, isAuthReady, db, appId, setUserProfile, setNickInput, setNickError, setIsNickModalOpen, setAllUsers, setTracks, setCurrentQueue, setPlaylists, setGatheringPlaylists, setUserLikes, setSiteConfig, engineRef, setDataError, retryToken = 0, onRewards, setDataLoading }) {
  useEffect(() => {
    if (!isAuthReady || !user) return;
    setDataError?.(''); setDataLoading?.(true);
    const onError = () => { setDataLoading?.(false); setDataError?.('콘텐츠를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'); };
    const anonymous = !!user.isAnonymous, unsubs = [];
    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase());
    const engine = createAchievementEngine({ disabled: anonymous });
    engineRef.current = engine;
    if (anonymous) { setUserProfile({ xp: 0, rewards: [] }); setNickInput(''); setNickError(''); setIsNickModalOpen(false); }
    else {
      engine.processEvent({ type: 'daily_active' }).then((r) => { if (r.unlockedRewards?.length) onRewards?.(r.unlockedRewards); }).catch(() => setDataError?.('감상 기록 서버에 연결하지 못했습니다. 재생은 계속 이용할 수 있습니다.'));
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
      unsubs.push(onSnapshot(profileRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data(); setUserProfile({ ...data, _uid: user.uid });
        if (!data.nicknamePrompted) {
          setNickInput((data.nickname || user.displayName || '').trim()); setNickError(''); setIsNickModalOpen(true);
          setDoc(profileRef, { nicknamePrompted: true }, { merge: true }).catch(() => {});
        }
      }, onError));
    }
    const rankingRows = new Map();
    for (const score of ['listenCount', 'shareCount', 'xp', 'likedCount']) unsubs.push(onSnapshot(query(collection(db, 'artifacts', appId, 'leaderboard'), orderBy(score, 'desc'), limit(30)), (snap) => {
      rankingRows.set(score, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAllUsers([...new Map([...rankingRows.values()].flat().map((u) => [u.id, u])).values()]);
    }, onError));
    const subscribeContent = (kind, setter) => {
      const sources = new Map();
      const sync = () => {
        const rows = [...new Map([...(sources.get('public') || []), ...(sources.get('editorial') || [])].map((r) => [r.id, r])).values()];
        setter(rows);
        if (kind === 'tracks') {
          setDataLoading?.(false);
          setCurrentQueue((prev) => prev?.length ? prev.filter((t) => rows.some((current) => current.id === t.id)).map((t) => rows.find((current) => current.id === t.id)) : []);
        }
      };
      for (const source of isAdmin ? ['public', 'editorial'] : ['public']) unsubs.push(onSnapshot(collection(db, 'artifacts', appId, source, 'data', kind), (snap) => { sources.set(source, snap.docs.map((d) => ({ id: d.id, ...d.data() }))); sync(); }, onError));
    };
    subscribeContent('tracks', setTracks); subscribeContent('playlists', setPlaylists); subscribeContent('gathering_playlists', setGatheringPlaylists);
    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'likes'), (snap) => setUserLikes(snap.docs.map((d) => d.id)), onError));
    getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_config', 'main_texts')).then((snap) => { if (snap.exists()) setSiteConfig((prev) => ({ ...prev, ...snap.data() })); }).catch(onError);
    return () => { unsubs.forEach((unsub) => unsub()); if (engineRef.current === engine) engineRef.current = null; };
  }, [user, isAuthReady, db, appId, setUserProfile, setNickInput, setNickError, setIsNickModalOpen, setAllUsers, setTracks, setCurrentQueue, setPlaylists, setGatheringPlaylists, setUserLikes, setSiteConfig, engineRef, setDataError, retryToken, onRewards, setDataLoading]);
}
