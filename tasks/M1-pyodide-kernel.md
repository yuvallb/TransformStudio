# M1: Pyodide Kernel

**Goal:** Python/Pandas running off the main thread with a typed RPC bridge.

**Prerequisites:** M0 complete.

**Estimated effort:** 2x

---

## Task 1: Web Worker entry point

### Implementation

- Create `src/worker/pyodide.worker.ts` as the worker entry (Vite worker import: `new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })`).
- **Critical:** No React, DOM, or Zustand imports under `src/worker/`.
- Worker exposes a Comlink-wrapped API object.

### Files

| Action | Path |
|--------|------|
| Create | `src/worker/pyodide.worker.ts` |

---

## Task 2: Comlink RPC integration

### Implementation

- Install `comlink`.
- In worker: `Comlink.expose(kernelApi)`.
- On main thread: `src/engine/kernel-client.ts` wraps the worker proxy with typed methods.
- Define shared types in `src/lib/types.ts`:
  - `PreviewPayload`, `StructuredError`, `LoadCsvOptions`, `KernelStatus`

```typescript
interface PreviewPayload {
  columns: ColumnSchema[];
  rows: Record<string, unknown>[];
  totalRows: number;
  totalColumns: number;
}

interface StructuredError {
  message: string;
  traceback?: string;
  nodeId?: string;
}
```

### Files

| Action | Path |
|--------|------|
| Create | `src/engine/kernel-client.ts` |
| Update | `src/lib/types.ts` |

---

## Task 3: Lazy-load Pyodide with progress

### Implementation

- Do **not** load Pyodide on page load — only on first RPC call or explicit init.
- Use `loadPyodide({ indexURL: ... })` from `pyodide` npm package.
- Report loading progress via Comlink callback or `postMessage` events:
  - Stages: "Loading Pyodide…", "Loading pandas…", "Loading numpy…", "Ready"
- Show progress in footer status bar during load.

### Configuration

- Pin Pyodide version in `package.json`.
- Load packages via `pyodide.loadPackage(['pandas', 'numpy'])`.

---

## Task 4: Pandas Copy-on-Write configuration

### Implementation

- After Pyodide init, run setup Python:

```python
import pandas as pd
pd.options.mode.copy_on_write = True
```

- Store `pd` and `np` in the worker namespace permanently.

---

## Task 5: Python helper module

### Implementation

- Create `src/worker/python/helpers.py` with:
  - `preview_df(df, n=100)` — returns JSON-serializable preview (see [`plan/04-execution-engine.md`](../plan/04-execution-engine.md))
  - `profile_df(df)` — column stats with sampling cap at 100,000 rows
  - `compute_histogram(series, bins=10)` — safe histogram for numeric columns
- Create `src/worker/python/helpers.ts`:

```typescript
import helpersPy from './helpers.py?raw';
export function getPythonHelpers(): string {
  return helpersPy;
}
```

- Inject helpers into Pyodide namespace on init via `pyodide.runPython(helpersPy)`.

### Edge cases

- Empty DataFrames: return zero rows, empty columns array.
- All-NA columns: handle in profile without crashing.

---

## Task 6: `runPython(code)` RPC method

### Implementation

- Method signature: `runPython(code: string): Promise<{ result?: unknown; error?: StructuredError }>`
- Execute in isolated namespace or shared worker namespace as appropriate.
- Catch Python exceptions; return structured error with traceback string.
- Never throw uncaught exceptions across Comlink boundary.

---

## Task 7: `loadCsv(bytes, options)` RPC method

### Implementation

- Accept `Uint8Array` / `ArrayBuffer` from main thread.
- Write bytes to Pyodide virtual FS (`pyodide.FS.writeFile('/tmp/data.csv', bytes)`).
- Run `pd.read_csv('/tmp/data.csv', **options)`.
- Return `preview_df(df)` result.
- Options type: `{ delimiter?: string; header?: boolean; encoding?: string }`.

---

## Task 8: Error capture and surfacing

### Implementation

- Wrap all Python execution in try/except on worker side.
- Parse Pyodide exception objects into `{ message, traceback }`.
- Main thread displays errors via toast or inline in smoke test UI.
- Log worker `onerror` and `onmessageerror` events.

---

## Task 9: Worker heartbeat and crash detection

### Implementation

- Main thread sends periodic ping (e.g. every 5s during execution, or on demand).
- Worker responds with pong + timestamp.
- If no response within timeout (e.g. 30s during heavy work, extend during known-long ops):
  - Mark worker as crashed
  - Terminate and recreate worker
- Listen to `worker.onerror` for immediate crash detection.

### Files

| Action | Path |
|--------|------|
| Update | `src/engine/kernel-client.ts` |
| Update | `src/worker/pyodide.worker.ts` |

---

## Task 10: `usePyodide()` hook

### Implementation

- Create `src/hooks/usePyodide.ts`:
  - State: `idle | loading | ready | error | crashed`
  - Methods: `init()`, `runPython()`, `loadCsv()`, `restart()`
  - On crash: show toast "Python runtime crashed. Restarting…", call `restart()`
  - Auto-restart: spin up fresh worker (M6 adds IndexedDB restore; M1 only restarts kernel)

### Files

| Action | Path |
|--------|------|
| Create | `src/hooks/usePyodide.ts` |

---

## Task 11: Smoke test UI

### Implementation

- Temporary dev panel or footer button: **"Test Pyodide"**
- On click:
  1. Init Pyodide (show loading state)
  2. Run: `pd.DataFrame({"a": [1, 2, 3]})`
  3. Return and display `head()` as formatted JSON or small table
- Verify UI remains responsive (canvas pan/zoom if canvas exists, or scroll/interact elsewhere).

### Files

| Action | Path |
|--------|------|
| Create | `src/ui/PyodideSmokeTest.tsx` (temporary; can remove in M2) |
| Update | `src/app/App.tsx` or `Footer.tsx` |

---

## Testing requirements

| Layer | What to test | File / config |
|-------|--------------|---------------|
| Unit | `kernel-client` type exports, error parsing helpers | `tests/unit/engine/kernel-client.test.ts` |
| Integration | **Vitest Browser Mode** — load CSV, run Python, preview shape | `tests/integration/kernel.test.ts` |
| Integration | Worker returns preview ≤ 100 rows | same |
| E2E | Pyodide smoke: click test, see result | `tests/e2e/pyodide-smoke.spec.ts` |
| Manual | Pan/zoom or scroll during Pyodide load — UI not frozen | — |

### Integration test setup (critical)

Per [`plan/10-testing.md`](../plan/10-testing.md): Pyodide tests **must** run in Vitest Browser Mode (Playwright provider), not Node/jsdom.

```typescript
// vitest.config.ts — browser project for integration/
export default defineConfig({
  test: {
    projects: [
      { name: 'unit', environment: 'node', include: ['tests/unit/**'] },
      { name: 'browser', browser: { enabled: true, provider: 'playwright' }, include: ['tests/integration/**'] },
    ],
  },
});
```

Add npm script: `test:integration`.

### Sample integration tests

1. `loads CSV and returns preview` — 2-row CSV, assert `totalRows === 2`
2. `creates DataFrame and returns head` — smoke test equivalent
3. `returns structured error on invalid Python` — syntax error in `runPython`
4. `heartbeat responds to ping` — worker alive check

---

## Acceptance criteria

### Definition of Done

- [ ] Clicking "Test Pyodide" loads runtime, runs `pd.DataFrame({"a": [1,2,3]})`, displays result.
- [ ] UI remains responsive during Pyodide load and execution (no main-thread blocking > 100ms).
- [ ] Worker Python exceptions surface in UI as readable messages.
- [ ] `loadCsv` returns preview with correct row/column counts.
- [ ] Copy-on-Write enabled (`pd.options.mode.copy_on_write = True`).
- [ ] Heartbeat detects terminated worker; restart succeeds.
- [ ] `npm run test:integration` passes in CI (Browser Mode).
- [ ] `tests/e2e/pyodide-smoke.spec.ts` passes.

### Manual verification

1. Open app → click Test Pyodide → wait for "Ready" → see DataFrame output.
2. During load, interact with page (scroll, click) — no freeze.
3. Trigger bad Python code — error message visible, app recoverable.
4. DevTools → Performance: main thread not blocked during worker execution.

---

## Verification checklist

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

---

## Out of scope (do not implement)

- React Flow canvas, node types, execution engine topo sort
- Dexie persistence, crash recovery with workflow restore (M6)
- Full preview grid (glide-data-grid) — M2
- Expression AST validation — M2/M4
