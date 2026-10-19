export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  if ((event.body || '').length > 4096) return { statusCode: 413, body: '' };
  try {
    const report = JSON.parse(event.body || '{}')['csp-report'] || {};
    let host = '';
    try { host = new URL(report['blocked-uri']).hostname; } catch { host = ['inline', 'eval', 'data', 'blob'].includes(report['blocked-uri']) ? report['blocked-uri'] : 'other'; }
    console.info(JSON.stringify({ metric: 'csp_violation', directive: String(report['violated-directive'] || '').split(' ')[0].slice(0, 80), host }));
  } catch { /* Invalid reports carry no useful telemetry. */ }
  return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
}
