import { guard, response, failure, error, jsonBody } from '../lib/server.js';
export function imageType(bytes) {
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
export async function handler(event) {
  try {
    await guard(event, 6, 3600000);
    const { image } = jsonBody(event);
    if (typeof image !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(image)) throw error(400, '이미지 파일을 확인해 주세요.');
    const bytes = Buffer.from(image, 'base64');
    if (bytes.length > 2_500_000 || !imageType(bytes)) throw error(400, '2.5MB 이하의 JPG·PNG·WebP 이미지만 업로드할 수 있습니다.');
    if (!process.env.IMGBB_API_KEY) throw error(503, '이미지 업로드를 준비 중입니다.');
    const body = new URLSearchParams({ key: process.env.IMGBB_API_KEY, image });
    const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body, signal: AbortSignal.timeout(12000) });
    const result = await r.json();
    if (!r.ok || !result.success || !/^https:\/\/i\.ibb\.co\//.test(result.data?.url || '')) throw error(502, '이미지를 저장하지 못했습니다. 다시 시도해 주세요.');
    return response(200, { url: result.data.url });
  } catch (err) { return failure(err); }
}
