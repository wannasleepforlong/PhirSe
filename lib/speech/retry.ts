// Retry Sarvam calls on rate limits and transient server errors, with jittered backoff.

export async function fetchWithRetry(url: string, init: RequestInit, tries = 5): Promise<Response> {
  let delay = 400;
  for (let i = 1; ; i++) {
    const res = await fetch(url, init);
    if (res.ok || i >= tries || (res.status !== 429 && res.status < 500)) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay + Math.random() * delay;
    await new Promise((r) => setTimeout(r, wait));
    delay *= 2;
  }
}
