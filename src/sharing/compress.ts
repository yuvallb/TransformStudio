import {
  SHARE_DECODE_MAX_BYTES,
  SHARE_DECODE_MAX_ENCODED_LENGTH,
} from '@/lib/constants';

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(encoded: string): Uint8Array {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function compressToBase64url(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const cs = new CompressionStream('gzip');
  const readPromise = new Response(cs.readable).arrayBuffer();
  const writer = cs.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  const compressed = new Uint8Array(await readPromise);
  return bytesToBase64url(compressed);
}

export async function decompressFromBase64url(encoded: string): Promise<string> {
  if (encoded.length > SHARE_DECODE_MAX_ENCODED_LENGTH) {
    throw new Error('Share link payload is too large');
  }

  const compressed = base64urlToBytes(encoded);
  const ds = new DecompressionStream('gzip');
  const readPromise = new Response(ds.readable).arrayBuffer();
  const writer = ds.writable.getWriter();
  await writer.write(compressed);
  await writer.close();
  const decompressed = await readPromise;

  if (decompressed.byteLength > SHARE_DECODE_MAX_BYTES) {
    throw new Error('Decompressed share payload exceeds size limit');
  }

  return new TextDecoder().decode(decompressed);
}
