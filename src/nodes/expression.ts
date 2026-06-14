const BLOCKED_PATTERNS = [
  /\bimport\b/i,
  /\bexec\b/i,
  /\beval\s*\(/i,
  /__/,
  /\bopen\s*\(/i,
  /\bgetattr\b/i,
  /\bsetattr\b/i,
  /\bglobals\b/i,
  /\blocals\b/i,
  /\bos\./i,
  /\bsys\./i,
];

const WHITELISTED_CALLS = new Set(['abs', 'round', 'min', 'max']);

export function translateExpression(expression: string): string {
  return expression.replace(/\{(\w+)\}/g, "params['$1']");
}

export function hasParamRefs(expression: string): boolean {
  return /\{(\w+)\}/.test(expression);
}

export function normalizeExpression(expression: string, inputVar: string): string {
  return translateExpression(expression.trim()).replace(/\bdf\b/g, inputVar);
}

export function isExpressionSafe(expression: string): boolean {
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(expression))) {
    return false;
  }

  const callPattern = /\b([a-zA-Z_]\w*)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = callPattern.exec(expression)) !== null) {
    if (!WHITELISTED_CALLS.has(match[1]!)) {
      return false;
    }
  }

  return true;
}

export function extractBracketColumns(expression: string): string[] {
  const matches = expression.match(/\[["']([^"']+)["']\]/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2, -2));
}
