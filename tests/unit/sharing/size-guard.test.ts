import { describe, expect, it } from 'vitest';

import {
  SHARE_SIZE_SAFE_BYTES,
  SHARE_SIZE_WARN_BYTES,
  getShareSizeLevel,
} from '@/sharing/url';

describe('share size guard', () => {
  it('treats payloads under 6 KB as safe', () => {
    expect(getShareSizeLevel(SHARE_SIZE_SAFE_BYTES)).toBe('safe');
    expect(getShareSizeLevel(SHARE_SIZE_SAFE_BYTES - 1)).toBe('safe');
  });

  it('warns for payloads between 6 KB and 50 KB', () => {
    expect(getShareSizeLevel(SHARE_SIZE_SAFE_BYTES + 1)).toBe('warning');
    expect(getShareSizeLevel(SHARE_SIZE_WARN_BYTES)).toBe('warning');
  });

  it('blocks URL sharing above 50 KB', () => {
    expect(getShareSizeLevel(SHARE_SIZE_WARN_BYTES + 1)).toBe('tooLarge');
  });
});
