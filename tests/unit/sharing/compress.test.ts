import { describe, expect, it } from 'vitest';

import { SHARE_DECODE_MAX_ENCODED_LENGTH } from '@/lib/constants';
import { compressToBase64url, decompressFromBase64url } from '@/sharing/compress';

describe('compress', () => {
  it('round-trips JSON through gzip and base64url', async () => {
    const input = JSON.stringify({ name: 'Pipeline', nodes: [{ id: 'n1', type: 'filter' }] });
    const encoded = await compressToBase64url(input);
    const decoded = await decompressFromBase64url(encoded);

    expect(decoded).toBe(input);
  });

  it('produces URL-safe base64 without +, /, or padding', async () => {
    const encoded = await compressToBase64url('{"test":"value with special chars ++//=="}');

    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('rejects oversized encoded payloads', async () => {
    const oversized = 'A'.repeat(SHARE_DECODE_MAX_ENCODED_LENGTH + 1);
    await expect(decompressFromBase64url(oversized)).rejects.toThrow(/too large/);
  });
});
