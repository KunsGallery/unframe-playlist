export const formatTime = (time) => {
  if (isNaN(time)) return "0:00";
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
};

export const getDirectLink = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === "") return "";

  if (url.includes("dropbox.com")) {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/\?dl=\d/, "")
      .replace(/&dl=\d/, "");
  }

  return url;
};

export const waitForImages = async (root) => {
  const imgs = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();

      return new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
    })
  );
};

export const toDataUrl = async (url) => {
  try {
    const res = await fetch(url, { cache: "no-cache" });

    if (!res.ok) throw new Error("fetch failed");

    const blob = await res.blob();

    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  } catch {
    return null;
  }
};