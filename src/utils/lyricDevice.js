// Firefox 159 was still working on a 277s song after 20 minutes on WebGPU, against 218s on WASM.
// Nothing fails, so the fallback below never fires.
export function shouldTryWebGPU(requested, userAgent) {
  return requested !== 'wasm' && !/Firefox\//.test(userAgent);
}

// WebGPU can pass the adapter check and still fail on a given model or driver.
export async function runWithDeviceFallback(device, run) {
  try {
    return { value: await run(device), device };
  } catch (error) {
    if (device === 'wasm') throw error;
    return { value: await run('wasm'), device: 'wasm' };
  }
}

export function describeSyncError(error) {
  const message = String(error?.message || error);
  if (/fetch|network|download|load|404|403|model/i.test(message)) return 'AI 모델을 받지 못했습니다. 인터넷 연결을 확인하고 다시 시도하거나 탭으로 직접 맞춰 주세요.';
  if (/memory|allocation|out of bounds|oom/i.test(message)) return '메모리가 부족해 분석하지 못했습니다. 다른 탭을 닫고 다시 시도하거나 탭으로 직접 맞춰 주세요.';
  return '분석을 끝내지 못했습니다. 다시 시도하거나 탭으로 직접 맞춰 주세요.';
}
