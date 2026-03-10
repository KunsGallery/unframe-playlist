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
          .catch(() => setLoading(false));
      }
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    return () => {
      unsubAuth();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [auth, ADMIN_EMAILS, setUser, setIsAdmin, setLoading, setScrolled]);
}