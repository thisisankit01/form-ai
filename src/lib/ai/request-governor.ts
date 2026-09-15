const WINDOW_MS = 60_000;
const requestTimes: number[] = [];
let queue = Promise.resolve();

function limit(): number {
  const value = Number.parseInt(process.env.AI_REQUESTS_PER_MINUTE || '39', 10);
  return Number.isFinite(value) && value > 0 && value < 40 ? value : 39;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reserve(): Promise<void> {
  while (requestTimes.length >= limit()) {
    const wait = requestTimes[0] + WINDOW_MS - Date.now();
    if (wait > 0) await sleep(wait);
    const cutoff = Date.now() - WINDOW_MS;
    while (requestTimes[0] !== undefined && requestTimes[0] <= cutoff) requestTimes.shift();
  }
  requestTimes.push(Date.now());
}

/** Serializes reservations so concurrent jobs share one provider budget. */
export function reserveAIRequest(): Promise<void> {
  const next = queue.then(reserve, reserve);
  queue = next.catch(() => undefined);
  return next;
}

export function resetAIRequestGovernorForTests(): void {
  requestTimes.length = 0;
  queue = Promise.resolve();
}
