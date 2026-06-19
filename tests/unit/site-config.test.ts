import { describe, expect, it } from 'vitest';

import { SITE } from '@/lib/site-config';

describe('site-config', () => {
  it('uses valid HTTPS URLs', () => {
    for (const url of Object.values(SITE.urls)) {
      expect(url.startsWith('https://')).toBe(true);
    }
  });

  it('points issue URL at GitHub issues', () => {
    expect(SITE.urls.issues).toContain('/issues');
  });

  it('defines four value propositions', () => {
    expect(SITE.valueProps).toHaveLength(4);
  });
});
