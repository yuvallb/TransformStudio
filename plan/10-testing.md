# Testing Strategy

## Test pyramid

```
        ╱ E2E (Playwright) ╲         few, high-value flows
       ╱──────────────────────╲
      ╱  Integration (Vitest)  ╲      engine + worker RPC
     ╱──────────────────────────╲
    ╱     Unit (Vitest)          ╲    nodes, codegen, sharing
   ╱──────────────────────────────╲
```

## Unit tests (Vitest)

### Node compile/validate tests

One test file per node type. Verify that `compile()` produces correct Python and `validate()` catches bad config.

```typescript
// tests/unit/nodes/filter.test.ts
describe('filter node', () => {
  it('compiles a simple expression', () => {
    const code = filter.compile(
      { expression: 'df["revenue"] > 1000' },
      ['df_input'],
      'df_output',
      {}
    );
    expect(code).toBe('df_output = df_input[df_input["revenue"] > 1000]');
  });

  it('substitutes params in expression', () => {
    const code = filter.compile(
      { expression: 'df["country"] == {country}' },
      ['df_input'],
      'df_output',
      { country: 'US' }
    );
    expect(code).toContain('"US"');
  });

  it('validates missing expression', () => {
    const errors = filter.validate({}, [[]]);
    expect(errors).toHaveLength(1);
  });
});
```

### Engine tests

| Module | Tests |
|--------|-------|
| `topo-sort.ts` | Linear graph, diamond graph, cycle detection, disconnected components |
| `fingerprint.ts` | Same config → same hash; different config → different hash; param change → different hash |
| `codegen.ts` | Full pipeline script matches expected output; notebook structure valid |
| `param-substitute.ts` | String, number, boolean substitution; missing param handling |

### Sharing tests

| Module | Tests |
|--------|-------|
| `serialize.ts` | Round-trip: workflow → JSON → workflow (no data leak) |
| `compress.ts` | Round-trip: JSON → gzip → base64url → decode → JSON |
| `url.ts` | Hash write/read round-trip |

### Versioning tests

| Module | Tests |
|--------|-------|
| `snapshot.ts` | Create, revert, fork |
| `diff.ts` | Added/removed/changed nodes detected correctly |

## Integration tests (Vitest in Browser Mode)

### Worker RPC (with Pyodide)

> **CRITICAL ARCHITECTURAL NOTE:** Running Pyodide inside standard Vitest (Node.js/jsdom) is highly problematic because Pyodide relies heavily on browser-native features like WebAssembly, Web Workers, and Fetch. Trying to polyfill these in Node.js leads to fragile and brittle test suites.
>
> Therefore, all integration tests that load Pyodide **MUST run in Vitest's Browser Mode** (using Playwright under the hood) rather than Node.js/jsdom. This guarantees a real browser environment and ensures test fidelity.

```typescript
// tests/integration/kernel.test.ts
// Configured to run in Vitest Browser Mode
describe('execution kernel', () => {
  let kernel: KernelClient;

  beforeAll(async () => {
    kernel = await initKernel();
  });

  it('loads CSV and returns preview', async () => {
    const csv = 'name,age\nAlice,30\nBob,25\n';
    const preview = await kernel.loadCsv(new TextEncoder().encode(csv), {});
    expect(preview.totalRows).toBe(2);
    expect(preview.columns).toHaveLength(2);
  });

  it('executes a filter and returns updated preview', async () => {
    // ... setup source, run filter, check rows
  });

  it('incremental recompute skips unchanged nodes', async () => {
    // ... run pipeline, change one node, verify only downstream re-executed
  });
});
```

## E2E tests (Playwright)

### vertical-slice.spec.ts

The most important E2E test. Covers the full M2 pipeline.

```
1. Open app
2. Wait for Pyodide ready indicator
3. Upload sample CSV
4. Verify preview grid shows data
5. Add Filter node, connect to source
6. Configure filter: revenue > 1000
7. Verify preview updates (fewer rows)
8. Add GroupBy node, connect to filter
9. Configure groupby: group by region, sum revenue
10. Verify preview shows aggregated data
11. Open code view → verify Python script content
12. Click export → verify download
```

### sharing.spec.ts

```
1. Build a simple pipeline
2. Click Share → copy URL
3. Open URL in new tab
4. Verify workflow restored on canvas
5. Upload different CSV
6. Verify pipeline runs
```

### pyodide-smoke.spec.ts

```
1. Open app
2. Wait for "Pyodide ready" status
3. Verify no console errors
4. Verify worker is responsive (run test DataFrame)
```

## CI pipeline

```yaml
# .github/workflows/deploy.yml
jobs:
  test:
    steps:
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit        # fast, no Pyodide
      - run: npm run test:integration # slower, loads Pyodide
      - run: npm run test:e2e         # Playwright, headless

  deploy:
    needs: test
    steps:
      - run: npm run build
      - deploy to GitHub Pages
```

## What we don't test (v1)

| Area | Reason |
|------|--------|
| Visual canvas layout/positioning | Low value; React Flow is tested upstream |
| Exact histogram rendering | Snapshot tests are brittle; profile data correctness is unit-tested |
| Cross-browser compatibility | Manual QA for Safari/Firefox; CI runs Chromium only |
| Performance benchmarks | Manual profiling in M9; not automated in v1 |

## Test data

Ship small fixtures in `tests/fixtures/`:

| File | Rows | Purpose |
|------|------|---------|
| `sales.csv` | 100 | Standard test dataset |
| `sales-large.csv` | 100,000 | Performance testing (M9) |
| `customers.json` | 50 | JSON import test |
| `empty.csv` | 0 | Edge case: empty file |
| `messy.csv` | 100 | Missing values, mixed types |

Demo datasets in `public/demo/` are the same files, accessible to E2E and users.
