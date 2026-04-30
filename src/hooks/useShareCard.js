// src/hooks/useShareCard.js
import { useEffect } from "react";
import { domToPng } from "modern-screenshot";
import { waitForImages } from "../utils/PlayerUtils";

const getShareUrl = (item) => {
  if (typeof window === "undefined") return "";

  const origin = window.location.origin;
  const pathname = window.location.pathname;

  if (item?.type === "track" && item?.id) {
    return `${origin}${pathname}?track=${encodeURIComponent(item.id)}`;
  }

  return window.location.href;
};

const getShareText = (item) => {
  if (!item) return "UNFRAME PLAYLIST";

  if (item.type === "track") {
    return [
      "UNFRAME PLAYLIST에서 감상 중인 곡",
      "",
      `〈${item.title || "Untitled"}〉`,
      item.artist || "",
      "",
      "전시와 사운드가 이어지는 음악 아카이브",
    ]
      .filter((line) => line !== null && line !== undefined)
      .join("\n");
  }

  return [
    item.title || "UNFRAME",
    item.desc || "",
    "UNFRAME PLAYLIST",
  ]
    .filter(Boolean)
    .join("\n");
};

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

        const shareUrl = getShareUrl(shareItem);
        const shareText = getShareText(shareItem);
        const shareTitle =
          shareItem?.type === "track"
            ? `${shareItem?.title || "UNFRAME"} - ${shareItem?.artist || "UNFRAME PLAYLIST"}`
            : shareItem?.title || "UNFRAME";

        if (navigator.share) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], "unframe.png", { type: "image/png" });

          const shareDataWithFile = {
            files: [file],
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          };

          const canShareFile =
            typeof navigator.canShare === "function"
              ? navigator.canShare({ files: [file] })
              : true;

          try {
            if (canShareFile) {
              await navigator.share(shareDataWithFile);
              setToastMessage("공유 완료 📸 (토스트 클릭=다운로드)");
            } else {
              await navigator.share({
                title: shareTitle,
                text: `${shareText}\n\n${shareUrl}`,
                url: shareUrl,
              });
              downloadDataUrl(dataUrl);
              setToastMessage("링크 공유 완료 + 카드 저장 📥");
            }
          } catch (err) {
            if (err?.name === "AbortError") {
              setToastMessage("공유가 취소되었습니다. (토스트 클릭=다운로드)");
              return;
            }

            downloadDataUrl(dataUrl);
            setToastMessage("공유 실패 → 카드 다운로드로 저장했습니다 📥");
          }
        } else {
          downloadDataUrl(dataUrl);
          setToastMessage("카드 저장 완료 📸 (토스트 클릭=다운로드)");
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