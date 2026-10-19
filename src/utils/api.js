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
export async function uploadImage(image) {
  let base64 = image;
  if (image instanceof Blob) {
    if (image.size > 2_500_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) throw new Error('2.5MB 이하 JPG·PNG·WebP 이미지를 선택해 주세요.');
    base64 = await new Promise((resolve, reject) => { const r = new FileReader(); r.onerror = reject; r.onload = () => resolve(String(r.result).split(',')[1]); r.readAsDataURL(image); });
  }
  return (await callApi('upload-image', { image: base64 })).url;
}
