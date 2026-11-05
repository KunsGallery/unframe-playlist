// Copies published ImgBB artwork into public/media so visitors never depend on ImgBB.
// Reads only the public Firestore projection; needs no credentials and changes no database document.
// Usage: npm run media:mirror   (re-run after uploading new artwork, then commit and deploy)
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA_DIR = join(ROOT, 'public/media');
const MANIFEST = join(ROOT, 'src/constants/mediaMirror.js');
const API = 'https://firestore.googleapis.com/v1/projects/unframe-playlist/databases/(default)/documents/artifacts/unframe-playlist-v1/public/data';
const COLLECTIONS = ['tracks', 'playlists', 'gathering_playlists', 'site_config', 'featured'];
const ATTEMPTS = Number(process.argv.find((arg) => arg.startsWith('--attempts='))?.slice(11)) || 12;
const CONCURRENCY = 6;
const SOURCE = /^https:\/\/i\.ibb\.co\//;

export function imageExtension(bytes) {
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'jpg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (bytes.toString('ascii', 4, 8) === 'ftyp' && /avi[fs]/.test(bytes.toString('ascii', 8, 12))) return 'avif';
  return null;
}

function collectUrls(value, found) {
  if (Array.isArray(value)) value.forEach((item) => collectUrls(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectUrls(item, found));
  else if (typeof value === 'string' && SOURCE.test(value)) found.add(value);
}

// Large originals are shrunk with macOS sips. Elsewhere, or if sips fails, the original is kept.
const MAX_BYTES = 800_000, MAX_EDGE = '1600';
async function optimized(bytes, extension) {
  if (bytes.length <= MAX_BYTES || process.platform !== 'darwin') return { bytes, extension };
  const dir = await mkdtemp(join(tmpdir(), 'up-media-'));
  try {
    const input = join(dir, `in.${extension}`), output = join(dir, 'out.jpg');
    await writeFile(input, bytes);
    execFileSync('sips', ['-Z', MAX_EDGE, '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', input, '--out', output], { stdio: 'ignore' });
    const smaller = await readFile(output);
    return smaller.length < bytes.length ? { bytes: smaller, extension: 'jpg' } : { bytes, extension };
  } catch { return { bytes, extension }; } finally { await rm(dir, { recursive: true, force: true }); }
}

async function publishedUrls() {
  const found = new Set();
  for (const name of COLLECTIONS) {
    const response = await fetch(`${API}/${name}?pageSize=300`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${name}: Firestore ${response.status}`);
    collectUrls((await response.json()).documents || [], found);
  }
  return [...found].sort();
}

async function download(url) {
  let lastError = 'no attempt';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const extension = imageExtension(bytes);
      if (!extension) throw new Error('not an image');
      return { bytes, extension };
    } catch (error) {
      lastError = error.message;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(lastError);
}

async function readManifest() {
  if (!existsSync(MANIFEST)) return {};
  const match = /export default (\{[\s\S]*\});/.exec(await readFile(MANIFEST, 'utf8'));
  return match ? JSON.parse(match[1]) : {};
}

const mirror = await readManifest();
const urls = await publishedUrls();
const pending = urls.filter((url) => !mirror[url] || !existsSync(join(ROOT, 'public', mirror[url])));
await mkdir(MEDIA_DIR, { recursive: true });

// ImgBB's outage notice is served as a normal image, so identical bytes for different
// URLs are the signal that a download is the notice and not the artwork.
const byHash = new Map();
const queue = [...pending];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let url = queue.shift(); url; url = queue.shift()) {
    try {
      const { bytes, extension } = await download(url);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
      byHash.set(hash, [...(byHash.get(hash) || []), { url, bytes, extension }]);
      console.log(`ok      ${url}`);
    } catch (error) {
      console.log(`failed  ${url} (${error.message})`);
    }
  }
}));

const rejected = [];
for (const [hash, entries] of byHash) {
  if (entries.length > 1) { rejected.push(...entries.map((entry) => entry.url)); continue; }
  const [{ url, bytes: original, extension: originalExtension }] = entries;
  const { bytes, extension } = await optimized(original, originalExtension);
  const name = `${hash}.${extension}`;
  await writeFile(join(MEDIA_DIR, name), bytes);
  mirror[url] = `/media/${name}`;
}
const sorted = Object.fromEntries(Object.entries(mirror).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(MANIFEST, `// Generated by scripts/mirror-images.mjs. Do not edit by hand.\nexport default ${JSON.stringify(sorted, null, 2)};\n`);

const missing = urls.filter((url) => !sorted[url]);
if (rejected.length) console.log(`identical bytes, not saved (likely the outage notice):\n  ${rejected.join('\n  ')}`);
console.log(`mirrored ${urls.length - missing.length}/${urls.length}`);
if (missing.length) { console.log(`missing:\n  ${missing.join('\n  ')}\nRe-run when ImgBB recovers.`); process.exitCode = 1; }
