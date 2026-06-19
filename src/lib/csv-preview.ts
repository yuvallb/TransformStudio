export function peekCsvColumnNames(
  data: Uint8Array,
  options: { delimiter?: string; header?: boolean } = {},
): string[] {
  const delimiter = options.delimiter ?? ',';
  const header = options.header !== false;
  if (!header) return [];

  const text = new TextDecoder().decode(data.slice(0, 8192));
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  if (!firstLine) return [];

  return firstLine.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
}
