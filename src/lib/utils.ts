import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ColumnDtype, ColumnSchema } from '@/lib/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function createId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function mapPandasDtype(pandasDtype: string): ColumnDtype {
  const lower = pandasDtype.toLowerCase();
  if (lower.includes('int')) return 'int';
  if (lower.includes('float')) return 'float';
  if (lower.includes('bool')) return 'bool';
  if (lower.includes('datetime') || lower.includes('date')) return 'datetime';
  if (lower === 'object' || lower.includes('str') || lower.includes('string')) return 'string';
  return 'unknown';
}

export function normalizePreviewColumns(
  columns: { name: string; dtype: string; nullable: boolean }[],
): ColumnSchema[] {
  return columns.map((col) => ({
    name: col.name,
    dtype: mapPandasDtype(col.dtype),
    pandasDtype: col.dtype,
    nullable: col.nullable,
  }));
}

export function paramsToRecord(
  params: { name: string; default: unknown }[],
): Record<string, unknown> {
  return Object.fromEntries(params.map((p) => [p.name, p.default]));
}
