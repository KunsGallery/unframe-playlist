// src/hooks/useAppDataSync.js
import { useEffect } from "react";
import { doc, setDoc, collection, onSnapshot, query, getDoc, orderBy, limit } from "firebase/firestore";
import { createAchievementEngine } from "../store";
import { getLevelInfo } from "../levels";

const EMPTY_USER_PROFILE = {
  listenCount: 0,
  shareCount: 0,
  firstJoin: Date.now(),
  rewards: [],
  yearly: {},
  monthly: {},
  counters: {},
  streak: {},
  timeFlags: {},
  profileImg: "",
  xp: 0,
  levelKey: "user",
  level: 1,
  nickname: "",
  nicknameUpdatedCount: 0,
  nicknamePrompted: false,
};

export function useAppDataSync({
  user,
  isAuthReady,
  db,
  appId,

  setUserProfile,
  setNickInput,
  setNickError,
  setIsNickModalOpen,

  setAllUsers,
  setTracks,
  setCurrentQueue,
  setPlaylists,
  setGatheringPlaylists,
  setUserLikes,
  setSiteConfig,

  engineRef,
  userProfile,
  setDataError,
  retryToken = 0,
  onRewards,
  setDataLoading,
}) {
  // 1) 인증 완료 + user 확보 후 전체 데이터 구독
  useEffect(() => {
    if (!isAuthReady || !user) return;
    setDataError?.('');
    setDataLoading?.(true);
    const onError = () => { setDataLoading?.(false); setDataError?.('콘텐츠를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'); };

    const isAnonymous = !!user.isAnonymous;
    engineRef.current = createAchievementEngine({
      db,
      appId,
      uid: user.uid,
      disabled: isAnonymous,
    });

    if (isAnonymous) {
      setUserProfile(EMPTY_USER_PROFILE);
      setNickInput("");
      setNickError("");
      setIsNickModalOpen(false);
    } else {
      engineRef.current.processEvent({ type: 'daily_active' }).then((result) => { if (result.unlockedRewards?.length) onRewards?.(result.unlockedRewards); }).catch(onError);
    }

    const profileRef = doc(db, "artifacts", appId, "users", user.uid, "profile", "stats");

    const unsubProfile = isAnonymous
      ? () => {}
      : onSnapshot(profileRef, async (snap) => {
          if (!snap.exists()) return;

          const data = snap.data();
          setUserProfile({ ...data, _uid: user.uid });

          const hasNickname = typeof data?.nickname === "string" && data.nickname.trim();
          const prompted = !!data?.nicknamePrompted;
          const updatedCount = Number(data?.nicknameUpdatedCount || 0);

          if (!hasNickname) {
            const base = (user.displayName || "Collector").trim();
            await setDoc(
              profileRef,
              {
                nickname: base,
                nicknameUpdatedCount: Number.isFinite(updatedCount) ? updatedCount : 0,
                nicknamePrompted: prompted,
              },
              { merge: true }
            ).catch(() => {});
          }

          if (!prompted) {
            setNickInput((data?.nickname || user.displayName || "").trim());
            setNickError("");
            setIsNickModalOpen(true);
            await setDoc(profileRef, { nicknamePrompted: true }, { merge: true }).catch(() => {});
          }
        }, onError);

    const rankingRows = new Map();
    const unsubPublicUsers = ['listenCount', 'shareCount', 'xp', 'likedCount'].map((score) => onSnapshot(
      query(collection(db, 'artifacts', appId, 'public_stats'), orderBy(score, 'desc'), limit(30)),
      (snap) => {
        rankingRows.set(score, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setAllUsers([...new Map([...rankingRows.values()].flat().map((u) => [u.id, u])).values()]);
      }, onError
    ));

    const unsubTracks = onSnapshot(
      query(collection(db, "artifacts", appId, "public", "data", "tracks")),
      (snap) => {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTracks(loaded);
        setDataLoading?.(false);
        setCurrentQueue((prev) => prev?.length ? prev.map((t) => loaded.find((current) => current.id === t.id) || t) : []);
      }, onError
    );

    const unsubPlaylists = onSnapshot(
      query(collection(db, "artifacts", appId, "public", "data", "playlists")),
      (snap) => setPlaylists(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError
    );

    const unsubGatheringPlaylists = onSnapshot(
      query(collection(db, "artifacts", appId, "public", "data", "gathering_playlists")),
      (snap) => setGatheringPlaylists(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError
    );

    const unsubLikes = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "likes"),
      (snap) => setUserLikes(snap.docs.map((d) => d.id)), onError
    );

    getDoc(doc(db, "artifacts", appId, "public", "data", "site_config", "main_texts"))
      .then((snap) => {
        if (snap.exists()) setSiteConfig((p) => ({ ...p, ...snap.data() }));
      })
      .catch(() => {});

    return () => {
      unsubProfile();
      unsubPublicUsers.forEach((unsubscribe) => unsubscribe());
      unsubTracks();
      unsubPlaylists();
      unsubGatheringPlaylists();
      unsubLikes();
    };
  }, [
    user,
    isAuthReady,
    db,
    appId,
    setUserProfile,
    setNickInput,
    setNickError,
    setIsNickModalOpen,
    setAllUsers,
    setTracks,
    setCurrentQueue,
    setPlaylists,
    setGatheringPlaylists,
    setUserLikes,
    setSiteConfig,
    engineRef,
    setDataError,
    retryToken,
    onRewards,
    setDataLoading,
  ]);

  // 2) public_stats 업데이트
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const isAnonymous = !!user.isAnonymous;
    const xp = isAnonymous ? 0 : Number(userProfile?.xp || 0) || 0;
    const lv = getLevelInfo(xp);

    const nameForPublic =
      (!isAnonymous && (userProfile?.nickname || "").trim()) ||
      user?.displayName ||
      (user?.isAnonymous ? "Guest" : "Collector");

    if (isAnonymous || userProfile?._uid !== user.uid) return;
    const manualName = (userProfile?.levelOverrideName || userProfile?.manualLevelName || '').trim();
    const manualColor = (userProfile?.levelOverrideColor || userProfile?.manualLevelColor || '').trim();
    const finalLevelName = manualName || lv.name;
    const finalLevelColor = manualName ? (manualColor || lv.color) : lv.color;

    setDoc(
      doc(db, "artifacts", appId, "public_stats", user.uid),
      {
        displayName: nameForPublic,
        nickname: isAnonymous ? "" : (userProfile?.nickname || "").trim(),
        profileImg: isAnonymous ? "" : userProfile?.profileImg || "",
        listenCount: Number(userProfile?.listenCount || 0) || 0,
        shareCount: Number(userProfile?.shareCount || 0) || 0,
        xp,
        levelKey: lv.key,
        level: lv.level,
        levelName: finalLevelName,
        levelColor: finalLevelColor,
      },
      { merge: true }
    ).catch(() => {});
  }, [user, userProfile, isAuthReady, db, appId]);
}
