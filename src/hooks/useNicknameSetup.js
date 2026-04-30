// src/hooks/useNicknameSetup.js
import { useCallback } from "react";
import { doc, setDoc } from "firebase/firestore";

export function useNicknameSetup({
  user,
  userProfile,
  nickInput,
  setNickError,
  setToastMessage,
  setIsNickModalOpen,
  db,
  appId,
}) {
  const saveNicknameOnce = useCallback(async () => {
    if (!user || user.isAnonymous) return;

    const nextNick = (nickInput || "").trim();

    if (nextNick.length < 2) {
      setNickError("닉네임은 2자 이상 입력해 주세요.");
      return;
    }

    if (nextNick.length > 16) {
      setNickError("닉네임은 16자 이하로 입력해 주세요.");
      return;
    }

    const ok = /^[a-zA-Z0-9가-힣 _-]+$/.test(nextNick);
    if (!ok) {
      setNickError("닉네임은 한글/영문/숫자/공백/_- 만 사용할 수 있어요.");
      return;
    }

    const count = Number(userProfile?.nicknameUpdatedCount || 0);
    const lockedByLegacyFlag =
      !("nicknameUpdatedCount" in (userProfile || {})) && !!userProfile?.nicknameChanged;
    if (count >= 1 || lockedByLegacyFlag) {
      setNickError("닉네임은 1회만 변경할 수 있어요.");
      return;
    }

    const profileRef = doc(db, "artifacts", appId, "users", user.uid, "profile", "stats");

    try {
      await setDoc(
        profileRef,
        {
          nickname: nextNick,
          nicknameUpdatedCount: 1,
        },
        { merge: true }
      );

      setToastMessage("닉네임이 설정되었습니다 ✨");
      setIsNickModalOpen(false);
    } catch (e) {
      console.error(e);
      setNickError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [
    user,
    userProfile?.nicknameUpdatedCount,
    userProfile?.nicknameChanged,
    nickInput,
    setNickError,
    setToastMessage,
    setIsNickModalOpen,
    db,
    appId,
  ]);

  return {
    saveNicknameOnce,
  };
}
