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

exports.handler = async function handler(event) {
  const trackId =
    event.queryStringParameters?.id ||
    event.path.split("/").filter(Boolean).pop();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID;

  const appId =
    process.env.UNFRAME_APP_ID ||
    process.env.VITE_APP_ID ||
    "unframe-playlist-v1";

  const origin =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://unframe.kr";

  if (!trackId || !projectId) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: "<!doctype html><html><body>Track not found</body></html>",
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

    const title = getFirestoreString(fields, "title", "UNFRAME PLAYLIST");
    const artist = getFirestoreString(fields, "artist", "UNFRAME");
    const image = getFirestoreString(fields, "image", "");
    const description =
      getFirestoreString(fields, "description", "") ||
      "전시와 사운드가 이어지는 음악 아카이브";

    const shareUrl = `${origin}/share/track/${encodeURIComponent(trackId)}`;
    const appUrl = `${origin}/?track=${encodeURIComponent(trackId)}`;

    const safeTitle = escapeHtml(`${title} - ${artist}`);
    const safeDescription = escapeHtml(description);
    const safeImage = escapeHtml(image);
    const safeShareUrl = escapeHtml(shareUrl);
    const safeAppUrl = escapeHtml(appUrl);

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
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />

  <meta property="og:type" content="music.song" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:url" content="${safeShareUrl}" />
  <meta property="og:site_name" content="UNFRAME PLAYLIST" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />

  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0; url=${safeAppUrl}" />
</head>
<body style="margin:0;background:#050505;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
  <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;">
    <div>
      ${safeImage ? `<img src="${safeImage}" alt="" style="width:220px;height:220px;object-fit:cover;border-radius:32px;margin-bottom:24px;" />` : ""}
      <h1 style="font-size:28px;margin:0 0 8px;">${escapeHtml(title)}</h1>
      <p style="color:#8db4ff;margin:0 0 24px;">${escapeHtml(artist)}</p>
      <a href="${safeAppUrl}" style="display:inline-block;background:#004aad;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:900;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">
        Open in UNFRAME PLAYLIST
      </a>
    </div>
  </main>

  <script>
    window.location.replace("${safeAppUrl}");
  </script>
</body>
</html>`,
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: "<!doctype html><html><body>Track not found</body></html>",
    };
  }
};