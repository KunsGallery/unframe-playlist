// Each run gets its own worker so cancelling can stop the model mid-computation.
export function transcribeLyrics({ audio, language, device, onProgress }) {
  const worker = new Worker(new URL('../workers/lyricSync.worker.js', import.meta.url), { type: 'module' });
  let rejectRun = () => {};
  const promise = new Promise((resolve, reject) => {
    rejectRun = reject;
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') onProgress?.(data);
      if (data.type === 'done') { worker.terminate(); resolve(data.words); }
      if (data.type === 'error') { worker.terminate(); reject(new Error(data.message)); }
    };
    worker.onerror = (event) => { worker.terminate(); reject(new Error(event.message || '분석을 시작하지 못했습니다.')); };
  });
  worker.postMessage({ audio, language, device }, [audio.buffer]);
  return {
    promise,
    cancel() {
      worker.terminate();
      rejectRun(Object.assign(new Error('분석을 취소했습니다.'), { code: 'CANCELLED' }));
    },
  };
}
