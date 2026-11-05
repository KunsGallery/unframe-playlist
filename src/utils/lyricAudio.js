import { getDirectLink } from './PlayerUtils';

const SAMPLE_RATE = 16000;

async function readAudioBytes(source) {
  if (source instanceof Blob) return source.arrayBuffer();
  let response;
  try {
    response = await fetch(getDirectLink(source));
  } catch {
    throw Object.assign(new Error('음원을 브라우저에서 받지 못했습니다. 음원 파일을 직접 선택해 주세요.'), { code: 'AUDIO_BLOCKED' });
  }
  if (!response.ok) throw Object.assign(new Error(`음원을 받지 못했습니다 (${response.status}). 음원 파일을 직접 선택해 주세요.`), { code: 'AUDIO_BLOCKED' });
  return response.arrayBuffer();
}

// 16 kHz mono with only the vocal band left, which is what recognition does best on.
export async function decodeForSpeech(source) {
  const bytes = await readAudioBytes(source);
  const decoded = await new OfflineAudioContext(1, 1, SAMPLE_RATE).decodeAudioData(bytes);
  const context = new OfflineAudioContext(1, decoded.length, SAMPLE_RATE);
  const node = context.createBufferSource();
  node.buffer = decoded;
  const highpass = new BiquadFilterNode(context, { type: 'highpass', frequency: 200 });
  const lowpass = new BiquadFilterNode(context, { type: 'lowpass', frequency: 3800 });
  node.connect(highpass).connect(lowpass).connect(context.destination);
  node.start();
  return (await context.startRendering()).getChannelData(0);
}
