import { getDirectLink } from './PlayerUtils';

const SAMPLE_RATE = 16000;

const blocked = (message) => Object.assign(new Error(message), { code: 'AUDIO_BLOCKED' });

async function readAudioBytes(source, signal) {
  if (source instanceof Blob) return source.arrayBuffer();
  let response;
  try {
    response = await fetch(getDirectLink(source), { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw blocked('음원을 브라우저에서 받지 못했습니다. 음원 파일을 직접 선택해 주세요.');
  }
  if (!response.ok) throw blocked(`음원을 받지 못했습니다 (${response.status}). 음원 파일을 직접 선택해 주세요.`);
  return response.arrayBuffer();
}

// 16 kHz mono with only the vocal band left, which is what recognition does best on.
export async function decodeForSpeech(source, { signal } = {}) {
  const bytes = await readAudioBytes(source, signal);
  let decoded;
  try {
    decoded = await new OfflineAudioContext(1, 1, SAMPLE_RATE).decodeAudioData(bytes);
  } catch {
    throw blocked('음원 파일을 읽지 못했습니다. 주소가 음원 파일을 가리키는지 확인하거나 파일을 직접 선택해 주세요.');
  }
  const context = new OfflineAudioContext(1, decoded.length, SAMPLE_RATE);
  const node = context.createBufferSource();
  node.buffer = decoded;
  const highpass = new BiquadFilterNode(context, { type: 'highpass', frequency: 200 });
  const lowpass = new BiquadFilterNode(context, { type: 'lowpass', frequency: 3800 });
  node.connect(highpass).connect(lowpass).connect(context.destination);
  node.start();
  return (await context.startRendering()).getChannelData(0);
}
