// src/hooks/useAppDataSync.js
import { useEffect } from "react";
import { doc, setDoc, collection, onSnapshot, query, getDoc } from "firebase/firestore";
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
  setUserLikes,
  setSiteConfig,

  engineRef,
  userProfile,
}) {
  // 1) 인증 완료 + user 확보 후 전체 데이터 구독
  useEffect(() => {
    if (!isAuthReady || !user) return;

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
      engineRef.current.migrateRewardsToObjects().catch(() => {});
    }

    const profileRef = doc(db, "artifacts", appId, "users", user.uid, "profile", "stats");

    const unsubProfile = isAnonymous
      ? () => {}
      : onSnapshot(profileRef, async (snap) => {
          if (!snap.exists()) return;

          const data = snap.data();
          setUserProfile(data);

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

    const isAnonymous = !!user.isAnonymous;
    const xp = isAnonymous ? 0 : Number(userProfile?.xp || 0) || 0;
    const lv = getLevelInfo(xp);

    const nameForPublic =
      (!isAnonymous && (userProfile?.nickname || "").trim()) ||
      user?.displayName ||
      (user?.isAnonymous ? "Guest" : "Collector");

    const manualName = isAnonymous ? "" : (userProfile?.manualLevelName || "").trim();
    const manualColor = isAnonymous ? "" : (userProfile?.manualLevelColor || "").trim();
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
