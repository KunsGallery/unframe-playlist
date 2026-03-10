// src/hooks/useToastTimer.js
import { useEffect } from "react";

export function useToastTimer({
  toastMessage,
  setToastMessage,
  delay = 5000,
}) {
  useEffect(() => {
    if (!toastMessage) return;

    const t = setTimeout(() => {
      setToastMessage(null);
    }, delay);

    return () => clearTimeout(t);
  }, [toastMessage, setToastMessage, delay]);
}