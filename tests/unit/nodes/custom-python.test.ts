import { describe, expect, it } from 'vitest';

import {
  CUSTOM_PYTHON_DEFAULT_CODE,
  CUSTOM_PYTHON_INPUT_ALIAS,
  CUSTOM_PYTHON_OUTPUT_ALIAS,
  customPython,
  isCustomPythonSafe,
} from '@/nodes/custom-python';

describe('customPython', () => {
  it('wraps user code with inp/out template', () => {
    const code = customPython.compile(
      { code: 'out["total"] = out["a"] + out["b"]' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain(`${CUSTOM_PYTHON_INPUT_ALIAS} = node_a`);
    expect(code).toContain(`${CUSTOM_PYTHON_OUTPUT_ALIAS} = ${CUSTOM_PYTHON_INPUT_ALIAS}.copy()`);
    expect(code).toContain('out["total"] = out["a"] + out["b"]');
    expect(code).toContain('node_b = out');
  });

  it('includes export warning comment in export mode', () => {
    const code = customPython.compile(
      { code: 'out = inp.head()' },
      ['sales_1'],
      'custom_2',
      {},
      { mode: 'export' },
    );
    expect(code).toContain('WARNING: Custom Python');
    expect(code).toContain('inp = sales_1');
  });

  it('rejects when feature flag is off', () => {
    if (import.meta.env.VITE_ENABLE_CUSTOM_PYTHON === 'true') return;
    const errors = customPython.validate({ code: 'out = inp.copy()' }, [[]]);
    expect(errors.some((e) => e.message.includes('disabled'))).toBe(true);
  });

  it('rejects import via isCustomPythonSafe', () => {
    expect(isCustomPythonSafe('import os\nout = inp')).toBe(false);
  });

  it('rejects exec and open patterns', () => {
    expect(isCustomPythonSafe('exec("x")')).toBe(false);
    expect(isCustomPythonSafe('open("/etc/passwd")')).toBe(false);
    expect(isCustomPythonSafe('out = inp.assign(x=1)')).toBe(true);
  });

  it('seeds new nodes with starter code', () => {
    expect(customPython.defaultConfig().code).toBe(CUSTOM_PYTHON_DEFAULT_CODE);
    expect(CUSTOM_PYTHON_DEFAULT_CODE).toContain('inp');
    expect(CUSTOM_PYTHON_DEFAULT_CODE).toContain('out = inp.copy()');
  });

  it('uses code inspector field kind', () => {
    expect(customPython.inspectorSchema()[0]?.kind).toBe('code');
  });

  it('is marked advanced in palette', () => {
    expect(customPython.paletteAdvanced).toBe(true);
  });
});
