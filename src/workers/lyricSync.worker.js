import { env, pipeline } from '@huggingface/transformers';
import ortModule from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasm from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url';

const MODEL = 'onnx-community/whisper-small_timestamped';
const DTYPE = { encoder_model: 'q8', decoder_model_merged: 'q8' };

env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = { mjs: ortModule, wasm: ortWasm };

let recognizer = null;

async function loadRecognizer(device) {
  if (recognizer) return recognizer;
  const files = new Map();
  recognizer = await pipeline('automatic-speech-recognition', MODEL, {
    device,
    dtype: DTYPE,
    progress_callback: (event) => {
      if (event.status !== 'progress' || !event.total) return;
      files.set(event.file, { loaded: event.loaded, total: event.total });
      const all = [...files.values()];
      const percent = Math.round(all.reduce((sum, f) => sum + f.loaded, 0) / all.reduce((sum, f) => sum + f.total, 0) * 100);
      self.postMessage({ type: 'progress', stage: 'model', percent });
    },
  });
  return recognizer;
}

self.onmessage = async ({ data }) => {
  try {
    const adapter = data.device === 'wasm' ? null : await navigator.gpu?.requestAdapter?.();
    const device = adapter ? 'webgpu' : 'wasm';
    const transcribe = await loadRecognizer(device);
    self.postMessage({ type: 'progress', stage: 'transcribe', device });
    const output = await transcribe(data.audio, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe',
      language: data.language,
    });
    self.postMessage({ type: 'done', words: output.chunks || [], device });
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
};
