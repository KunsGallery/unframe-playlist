// src/hooks/useAppBoot.js
import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

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
      // Public content needs no account. Sessions from earlier anonymous sign-ins are simply closed.
      if (u?.isAnonymous) { signOut(auth).catch(() => {}); }
      const member = u?.isAnonymous ? null : u;
      setUser(member);
      setIsAdmin(!!(member?.email && ADMIN_EMAILS.includes(member.email.toLowerCase())));
      setLoading(false);
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    return () => {
      unsubAuth();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [auth, ADMIN_EMAILS, setUser, setIsAdmin, setLoading, setScrolled]);
}
