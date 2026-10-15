import { useEffect, useState } from 'react';
import { Copy, QrCode, Download } from 'lucide-react';

export default function ArchiveShareTools({ kind = 'playlist', id, title }) {
  const [qr, setQr] = useState(''), [message, setMessage] = useState(''), [showQr, setShowQr] = useState(false);
  const url = `${window.location.origin}/?${kind}=${encodeURIComponent(id)}`;
  useEffect(() => {
    if (!showQr) return;
    let alive = true;
    import('qrcode').then((module) => module.default.toDataURL(url, { width: 512, margin: 3, color: { dark: '#004aad', light: '#ffffff' } })).then((image) => { if (alive) setQr(image); }).catch(() => { if (alive) setMessage('QR을 만들지 못했습니다. 링크를 복사해 주세요.'); });
    return () => { alive = false; };
  }, [url, showQr]);
  return <div className="up-archive-share">
    <div><button onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('링크를 복사했습니다.'); } catch { setMessage(url); } }}><Copy size={16} /> 링크 복사</button><button aria-expanded={showQr} onClick={() => setShowQr((v) => !v)}><QrCode size={16} /> 현장에서 듣기 QR</button></div>
    {showQr && qr && <figure><img src={qr} alt={`${title} 플레이리스트 QR 코드`} width="160" height="160" /><figcaption>{title}<a href={qr} download={`UP-${id}.png`}><Download size={16} /> QR 이미지 저장</a></figcaption></figure>}
    <p role="status">{message}</p>
  </div>;
}
