export async function fetchJson(path, { fetchImpl = globalThis.fetch, attempts = 2, timeoutMs = 8000, retryDelayMs = 250 } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch unavailable');
  const totalAttempts = Math.max(1, Math.floor(Number(attempts) || 1));
  const requestTimeout = Math.max(250, Math.floor(Number(timeoutMs) || 8000));
  const delay = Math.max(0, Math.floor(Number(retryDelayMs) || 0));
  let lastError = new Error('Request failed: ' + path);

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    let timer;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const request = Promise.resolve()
      .then(() => fetchImpl(path, controller ? { signal: controller.signal } : undefined))
      .then(response => {
        if (!response?.ok) {
          const error = new Error('Request failed: ' + path);
          error.retryable = false;
          throw error;
        }
        return response.json();
      });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller?.abort();
        reject(new Error('Request timed out: ' + path));
      }, requestTimeout);
    });

    try {
      return await Promise.race([request, timeout]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.retryable === false || attempt + 1 >= totalAttempts) break;
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}