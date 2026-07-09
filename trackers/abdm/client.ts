/** Throttled, retrying HTTP client for the ABDM dashboard API. */

const BASE = "https://dashboard.abdm.gov.in/abdmservice/api/dashboard";

const THROTTLE_MS = 300;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 60_000;

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

export interface StatedistReq {
  type?: string;
  state_code?: string;
  district_code?: string;
  rpttype?: string;
  duration?: string;
  fromDateHrl?: string;
  toDateHrl?: string;
  partner?: string;
  profType?: string;
  document?: string;
  facility?: string;
  microsite?: string;
  [key: string]: string | undefined;
}

export interface ApiResponse {
  status?: string;
  list?: Record<string, string>[];
  list2?: Record<string, string>[];
  today?: string;
  total1?: string;
  total2?: string;
  total3?: string;
  ts?: string;
  [key: string]: unknown;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttledFetch(url: string, body: object): Promise<ApiResponse> {
  const wait = Math.max(0, lastRequestAt + THROTTLE_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: "https://dashboard.abdm.gov.in",
          Referer: "https://dashboard.abdm.gov.in/abdm/",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return (await res.json()) as ApiResponse;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/** POST to an ABDM dashboard endpoint. Requests are serialized + throttled globally. */
export function post(endpoint: string, body: StatedistReq): Promise<ApiResponse> {
  const payload: StatedistReq = { microsite: "A", ...body };
  const result = queue.then(() => throttledFetch(`${BASE}/${endpoint}`, payload));
  queue = result.catch(() => {});
  return result;
}
