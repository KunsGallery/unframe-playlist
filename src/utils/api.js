import { auth, appCheck } from '../firebase';
import { getToken } from 'firebase/app-check';
export async function callApi(name, body) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Google 로그인 후 이용할 수 있습니다.');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` };
  if (appCheck) { try { headers['X-Firebase-AppCheck'] = (await getToken(appCheck)).token; } catch { /* Monitoring phase: ID-token protection still applies. */ } }
  const r = await fetch(`/.netlify/functions/${name}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  let result;
  try { result = await r.json(); } catch { throw new Error('서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  if (!r.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
  return result;
}
const UPLOAD_MAX_BYTES = 2_400_000;
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Large or unusual images (a 6MB PNG cover, an AVIF, a camera photo) are redrawn as a JPEG
// no larger than 2400px, stepping quality and size down until the file fits the server's limit.
export async function shrinkImage(file) {
  if (UPLOAD_TYPES.includes(file.type) && file.size <= UPLOAD_MAX_BYTES) return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('이 이미지 형식은 읽지 못했습니다. JPG·PNG·WebP로 저장해서 다시 올려 주세요.'); }
  try {
    for (const side of [2400, 2000, 1600, 1200]) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // transparent PNG corners turn white, not black, as a JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.82, 0.74]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= UPLOAD_MAX_BYTES) return blob;
      }
    }
  } finally { bitmap.close?.(); }
  throw new Error('이미지를 충분히 줄이지 못했습니다. 더 작은 이미지로 다시 시도해 주세요.');
}

export async function uploadImage(image) {
  let base64 = image;
  if (image instanceof Blob) {
    image = await shrinkImage(image);
    if (image.size > 2_500_000 || !UPLOAD_TYPES.includes(image.type)) throw new Error('2.5MB 이하 JPG·PNG·WebP 이미지를 선택해 주세요.');
    base64 = await new Promise((resolve, reject) => { const r = new FileReader(); r.onerror = reject; r.onload = () => resolve(String(r.result).split(',')[1]); r.readAsDataURL(image); });
  }
  return (await callApi('upload-image', { image: base64 })).url;
}
