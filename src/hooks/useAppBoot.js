// src/hooks/useAppBoot.js
import { useEffect } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export function useAppBoot({
  auth,
  ADMIN_EMAILS,
  setUser,
  setIsAdmin,
  setLoading,
  setScrolled,
  setDataError,
}) {
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(!!(u?.email && ADMIN_EMAILS.includes(u.email.toLowerCase())));

      if (u) {
        setLoading(false);
      } else {
        signInAnonymously(auth)
          .then(() => setLoading(false))
          .catch(() => { setLoading(false); setDataError?.('접속을 준비하지 못했습니다. 연결을 확인하고 다시 불러와 주세요.'); });
      }
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    return () => {
      unsubAuth();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [auth, ADMIN_EMAILS, setUser, setIsAdmin, setLoading, setScrolled, setDataError]);
}
