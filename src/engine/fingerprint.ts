import type { WorkflowNode } from '@/lib/types';

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function computeFingerprint(
  node: WorkflowNode,
  params: Record<string, unknown>,
  upstreamFingerprints: string[],
  datasetFingerprint?: string | null,
): Promise<string> {
  const payload = JSON.stringify({
    type: node.type,
    config: node.config,
    params,
    upstream: upstreamFingerprints,
    dataset: datasetFingerprint ?? null,
  });
  return sha256(payload);
}

export async function computeDatasetFingerprint(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
