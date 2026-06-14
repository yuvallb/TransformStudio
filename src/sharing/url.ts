import type { Workflow } from '@/lib/types';

import { compressToBase64url, decompressFromBase64url } from './compress';
import { deserializeWorkflow, serializeWorkflow } from './serialize';

export const SHARE_HASH_PREFIX = 'w=';
export const SHARE_SIZE_SAFE_BYTES = 6 * 1024;
export const SHARE_SIZE_WARN_BYTES = 50 * 1024;

export type ShareSizeLevel = 'safe' | 'warning' | 'tooLarge';

export function getShareSizeLevel(sizeBytes: number): ShareSizeLevel {
  if (sizeBytes > SHARE_SIZE_WARN_BYTES) return 'tooLarge';
  if (sizeBytes > SHARE_SIZE_SAFE_BYTES) return 'warning';
  return 'safe';
}

export function formatShareSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}

function normalizeHash(hash: string): string {
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

export async function encodeWorkflowToHash(
  workflow: Workflow,
): Promise<{ hash: string; sizeBytes: number }> {
  const json = serializeWorkflow(workflow);
  const encoded = await compressToBase64url(json);
  const hash = `${SHARE_HASH_PREFIX}${encoded}`;
  return { hash, sizeBytes: new TextEncoder().encode(hash).length };
}

export async function decodeWorkflowFromHash(hash: string): Promise<Workflow> {
  const normalized = normalizeHash(hash);
  if (!normalized.startsWith(SHARE_HASH_PREFIX)) {
    throw new Error('Invalid share link: missing workflow prefix');
  }

  const encoded = normalized.slice(SHARE_HASH_PREFIX.length);
  if (!encoded) {
    throw new Error('Invalid share link: empty payload');
  }

  const json = await decompressFromBase64url(encoded);
  return deserializeWorkflow(json);
}

export function writeWorkflowHash(hash: string): void {
  window.location.hash = hash;
}

export function clearWorkflowHash(): void {
  const url = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', url);
}

export function parseHashOnLoad(): string | null {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith(SHARE_HASH_PREFIX)) return hash;
  return null;
}

export async function copyShareUrl(): Promise<string> {
  const url = window.location.href;
  await navigator.clipboard.writeText(url);
  return url;
}
