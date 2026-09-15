import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetAIRequestGovernorForTests, reserveAIRequest } from './request-governor';

describe('request governor', () => {
  afterEach(() => {
    delete process.env.AI_REQUESTS_PER_MINUTE;
    resetAIRequestGovernorForTests();
    vi.useRealTimers();
  });

  it('holds the third request until a two-request window expires', async () => {
    vi.useFakeTimers();
    process.env.AI_REQUESTS_PER_MINUTE = '2';

    await reserveAIRequest();
    await reserveAIRequest();
    let released = false;
    const waiting = reserveAIRequest().then(() => { released = true; });

    await vi.advanceTimersByTimeAsync(59_999);
    expect(released).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(released).toBe(true);
  });

  it('caps invalid or unsafe limits below the provider maximum', async () => {
    process.env.AI_REQUESTS_PER_MINUTE = '40';
    await expect(reserveAIRequest()).resolves.toBeUndefined();
  });
});
