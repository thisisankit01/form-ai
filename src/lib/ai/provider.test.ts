import { describe, expect, it } from 'vitest';
import { extractCloudflareResponse } from './provider';

describe('Cloudflare AI response contract', () => {
  it('documents that chat completions may place output in the choice message', () => {
    expect(extractCloudflareResponse({
      choices: [{ message: { content: null, reasoning_content: '{"ok":true}' } }],
    })).toBe('{"ok":true}');
  });
});
