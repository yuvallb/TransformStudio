import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workflow } from '@/lib/types';
import {
  SHARE_HASH_PREFIX,
  decodeWorkflowFromHash,
  encodeWorkflowToHash,
  getShareSizeLevel,
  parseHashOnLoad,
  writeWorkflowHash,
} from '@/sharing/url';

const sampleWorkflow = (): Workflow => ({
  id: 'wf-1',
  name: 'Shared Pipeline',
  schemaVersion: 1,
  nodes: [
    {
      id: 'src-1',
      type: 'source.csv',
      position: { x: 0, y: 0 },
      config: { filename: 'data.csv', delimiter: ',', header: true, encoding: 'utf-8' },
    },
  ],
  edges: [],
  params: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('url sharing', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('encodes and decodes workflow hash round-trip', async () => {
    const { hash } = await encodeWorkflowToHash(sampleWorkflow());
    const restored = await decodeWorkflowFromHash(hash);

    expect(restored.name).toBe('Shared Pipeline');
    expect(restored.nodes).toHaveLength(1);
    expect(restored.nodes[0]?.type).toBe('source.csv');
    expect(restored.nodes[0]?.config.filename).toBe('');
  });

  it('writes and parses location hash', async () => {
    const { hash } = await encodeWorkflowToHash(sampleWorkflow());
    writeWorkflowHash(hash);

    expect(window.location.hash).toBe(`#${hash}`);
    expect(parseHashOnLoad()).toBe(hash);
  });

  it('returns null when hash is not a workflow share link', () => {
    window.location.hash = '#other=abc';
    expect(parseHashOnLoad()).toBeNull();
  });

  it('classifies share size thresholds', () => {
    expect(getShareSizeLevel(1024)).toBe('safe');
    expect(getShareSizeLevel(7 * 1024)).toBe('warning');
    expect(getShareSizeLevel(60 * 1024)).toBe('tooLarge');
  });

  it('rejects invalid hash prefix', async () => {
    await expect(decodeWorkflowFromHash('bad=abc')).rejects.toThrow(/Invalid share link/);
  });
});

describe('copyShareUrl', () => {
  it('copies current href to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    window.location.hash = `#${SHARE_HASH_PREFIX}abc`;
    const { copyShareUrl } = await import('@/sharing/url');
    const url = await copyShareUrl();

    expect(writeText).toHaveBeenCalledWith(url);
    expect(url).toContain(SHARE_HASH_PREFIX);
  });
});
