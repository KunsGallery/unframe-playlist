// src/hooks/useAppDataSync.js
import { useEffect } from "react";
import { doc, setDoc, collection, onSnapshot, query, getDoc } from "firebase/firestore";
import { createAchievementEngine } from "../store";
import { getLevelInfo } from "../levels";

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
  setUserLikes,
  setSiteConfig,

  engineRef,
  userProfile,
}) {
  // 1) 인증 완료 + user 확보 후 전체 데이터 구독
  useEffect(() => {
    if (!isAuthReady || !user) return;

    engineRef.current = createAchievementEngine({ db, appId, uid: user.uid });
    engineRef.current.migrateRewardsToObjects().catch(() => {});

    const profileRef = doc(db, "artifacts", appId, "users", user.uid, "profile", "stats");

    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      setUserProfile(data);

      if (!user.isAnonymous) {
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
      }
    });

    const unsubPublicUsers = onSnapshot(
      collection(db, "artifacts", appId, "public_stats"),
      (snap) => setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubTracks = onSnapshot(
      query(collection(db, "artifacts", appId, "public", "data", "tracks")),
      (snap) => {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTracks(loaded);
        setCurrentQueue((prev) => (prev?.length ? prev : loaded.filter((t) => !t.isHidden)));
      }
    );

    const unsubPlaylists = onSnapshot(
      query(collection(db, "artifacts", appId, "public", "data", "playlists")),
      (snap) => setPlaylists(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubLikes = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "likes"),
      (snap) => setUserLikes(snap.docs.map((d) => d.id))
    );

    getDoc(doc(db, "artifacts", appId, "public", "data", "site_config", "main_texts"))
      .then((snap) => {
        if (snap.exists()) setSiteConfig((p) => ({ ...p, ...snap.data() }));
      })
      .catch(() => {});

    return () => {
      unsubProfile();
      unsubPublicUsers();
      unsubTracks();
      unsubPlaylists();
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
    setUserLikes,
    setSiteConfig,
    engineRef,
  ]);

  // 2) public_stats 업데이트
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const xp = Number(userProfile?.xp || 0) || 0;
    const lv = getLevelInfo(xp);

    const nameForPublic =
      (userProfile?.nickname || "").trim() ||
      user?.displayName ||
      (user?.isAnonymous ? "Guest" : "Collector");

    const manualName = (userProfile?.manualLevelName || "").trim();
    const manualColor = (userProfile?.manualLevelColor || "").trim();
    const finalLevelName = manualName || lv.name;
    const finalLevelColor = manualName ? (manualColor || lv.color) : lv.color;

    setDoc(
      doc(db, "artifacts", appId, "public_stats", user.uid),
      {
        displayName: nameForPublic,
        nickname: (userProfile?.nickname || "").trim(),
        profileImg: userProfile?.profileImg || "",
        listenCount: userProfile?.listenCount || 0,
        shareCount: userProfile?.shareCount || 0,
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