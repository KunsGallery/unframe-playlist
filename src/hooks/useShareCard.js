// src/hooks/useShareCard.js
import { useEffect } from "react";
import { domToPng } from "modern-screenshot";
import { waitForImages } from "../utils/PlayerUtils";

export function useShareCard({
  shareItem,
  shareCardRef,
  setToastMessage,
  setLastCardUrl,
  setShareItem,
}) {
  useEffect(() => {
    const downloadDataUrl = (dataUrl) => {
      const link = document.createElement("a");
      link.download = "unframe-card.png";
      link.href = dataUrl;
      link.click();
    };

    const generateImage = async () => {
      if (!shareItem || !shareCardRef.current) return;

      try {
        setToastMessage("디지털 카드 발급 중... ✨");

        if (document.fonts?.ready) await document.fonts.ready;
        await waitForImages(shareCardRef.current);

        const dataUrl = await domToPng(shareCardRef.current, {
          backgroundColor: "#1a1a1a",
          scale: 3,
        });

        setLastCardUrl(dataUrl);

        if (navigator.share) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], "unframe.png", { type: "image/png" });

          try {
            await navigator.share({ files: [file], title: "UNFRAME" });
            setToastMessage("발급 완료 📸 (토스트 클릭=다운로드)");
          } catch (err) {
            if (err?.name === "AbortError") {
              setToastMessage("공유가 취소되었습니다. (토스트 클릭=다운로드)");
              return;
            }
            downloadDataUrl(dataUrl);
            setToastMessage("공유 실패 → 다운로드로 저장했습니다 📥 (토스트 클릭=다운로드)");
          }
        } else {
          downloadDataUrl(dataUrl);
          setToastMessage("발급 완료 📸 (토스트 클릭=다운로드)");
        }
      } catch (err) {
        console.error("CAPTURE ERROR:", err);
        setToastMessage("발급 실패. (이미지/CORS/렌더 이슈 가능)");
      } finally {
        setShareItem(null);
      }
    };

    if (shareItem) generateImage();
  }, [shareItem, shareCardRef, setToastMessage, setLastCardUrl, setShareItem]);
}