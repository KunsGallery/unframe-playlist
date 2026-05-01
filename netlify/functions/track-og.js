const FALLBACK_ORIGIN = "https://unframe.kr";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getFirestoreString = (fields, key, fallback = "") => {
  const value = fields?.[key];

  if (!value) return fallback;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.integerValue === "string") return value.integerValue;
  if (typeof value.doubleValue === "number") return String(value.doubleValue);
  if (typeof value.booleanValue === "boolean") return String(value.booleanValue);

  return fallback;
};

const normalizeOrigin = (value) => {
  if (typeof value !== "string" || !value.trim()) return FALLBACK_ORIGIN;
  return value.replace(/\/+$/, "");
};

const withFallback = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
};

const truncateText = (value, maxLength = 120) => {
  const normalized = withFallback(value, "UNFRAME PLAYLIST");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const normalizeImageUrl = (value, fallbackImage) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallbackImage;

  try {
    const url = new URL(raw);
    const protocol = url.protocol.toLowerCase();
    const host = url.hostname.toLowerCase();

    if (protocol !== "https:" && protocol !== "http:") {
      return fallbackImage;
    }

    if (host === "i.ibb.co") {
      return url.toString();
    }

    if (host === "ibb.co" || host.endsWith(".ibb.co") || host.endsWith("imgbb.com")) {
      return fallbackImage;
    }

    return url.toString();
  } catch {
    return fallbackImage;
  }
};

const notFoundHtml = (message = "Track not found") => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(message)}</title>
</head>
<body style="margin:0;background:#050505;color:#ffffff;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
  <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;">
    <div>
      <p style="margin:0 0 12px;color:#8db4ff;font-weight:800;letter-spacing:.28em;font-size:11px;">UNFRAME PLAYLIST</p>
      <h1 style="margin:0 0 10px;font-size:32px;">Track Not Found</h1>
      <p style="margin:0;color:#a1a1aa;">${escapeHtml(message)}</p>
    </div>
  </main>
</body>
</html>`;

exports.handler = async function handler(event) {
  const trackId =
    event.queryStringParameters?.id ||
    event.path?.split("/").filter(Boolean).pop();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID;

  const appId =
    process.env.UNFRAME_APP_ID ||
    process.env.VITE_APP_ID ||
    "unframe-playlist-v1";

  const origin = normalizeOrigin(
    process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      FALLBACK_ORIGIN
  );
  const fallbackImage = `${origin}/icon.png`;

  if (!trackId || !projectId) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: notFoundHtml("공유된 곡 정보를 찾을 수 없습니다."),
    };
  }

  const firestoreUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/artifacts/${encodeURIComponent(appId)}` +
    `/public/data/tracks/${encodeURIComponent(trackId)}`;

  try {
    const response = await fetch(firestoreUrl);

    if (!response.ok) {
      throw new Error(`Firestore REST error: ${response.status}`);
    }

    const json = await response.json();
    const fields = json.fields || {};

    const title = withFallback(
      getFirestoreString(fields, "title", ""),
      "UNFRAME PLAYLIST"
    );
    const artist = withFallback(
      getFirestoreString(fields, "artist", ""),
      "UNFRAME"
    );
    const description = truncateText(
      getFirestoreString(fields, "description", "") ||
        getFirestoreString(fields, "desc", "") ||
        "UNFRAME PLAYLIST",
      120
    );
    const image = normalizeImageUrl(
      getFirestoreString(fields, "image", ""),
      fallbackImage
    );

    const ogUrl = `${origin}/og/track/${encodeURIComponent(trackId)}`;
    const landingUrl = `${origin}/share/track/${encodeURIComponent(trackId)}`;
    const pageTitle = `${title} - ${artist}`;

    const safePageTitle = escapeHtml(pageTitle);
    const safeTitle = escapeHtml(title);
    const safeArtist = escapeHtml(artist);
    const safeDescription = escapeHtml(description);
    const safeImage = escapeHtml(image);
    const safeOgUrl = escapeHtml(ogUrl);
    const safeLandingUrl = escapeHtml(landingUrl);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
      body: `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${safePageTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="canonical" href="${safeLandingUrl}" />

  <meta property="og:type" content="music.song" />
  <meta property="og:title" content="${safePageTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:url" content="${safeOgUrl}" />
  <meta property="og:site_name" content="UNFRAME PLAYLIST" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safePageTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />

  <meta http-equiv="refresh" content="0; url=${safeLandingUrl}" />
</head>
<body style="margin:0;background:#050505;color:#ffffff;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
  <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:
    radial-gradient(circle at top, rgba(0,74,173,0.22), transparent 35%),
    radial-gradient(circle at bottom, rgba(16,25,64,0.36), transparent 32%),
    #050505;">
    <section style="width:min(100%, 460px);padding:28px;border-radius:32px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);backdrop-filter:blur(24px);box-shadow:0 30px 80px rgba(0,0,0,0.55);">
      <p style="margin:0 0 14px;color:#8db4ff;font-weight:900;letter-spacing:.3em;font-size:11px;">UNFRAME PLAYLIST</p>
      <div style="overflow:hidden;border-radius:24px;border:1px solid rgba(255,255,255,0.08);background:#101010;">
        <img src="${safeImage}" alt="" style="display:block;width:100%;aspect-ratio:1 / 1;object-fit:cover;" />
      </div>
      <h1 style="margin:22px 0 8px;font-size:34px;line-height:1.02;font-weight:900;">${safeTitle}</h1>
      <p style="margin:0 0 16px;color:#8db4ff;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">${safeArtist}</p>
      <p style="margin:0 0 26px;color:#d4d4d8;line-height:1.6;">${safeDescription}</p>
      <a href="${safeLandingUrl}" style="display:inline-block;background:#ffffff;color:#050505;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:900;font-size:11px;letter-spacing:.28em;text-transform:uppercase;">
        Play in UNFRAME
      </a>
    </section>
  </main>

  <script>
    window.location.replace("${safeLandingUrl}");
  </script>
</body>
</html>`,
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: notFoundHtml("공유된 곡 정보를 찾을 수 없습니다."),
    };
  }
};
