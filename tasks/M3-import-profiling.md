# M3: Data Import + Profiling

**Goal:** Robust import options and automatic data profiling for any selected node.

**Prerequisites:** M2 complete.

**Estimated effort:** 2x

**README flow:** Flow A (first-time data exploration)

---

## Task 1: JSON source node

### Implementation

- Create `src/nodes/source-json.ts`:
  - Config: `filename`, `orient` (default `'records'`)
  - `compile`: `node_id = pd.read_json(path, orient=...)`
  - `validate`: filename required
  - Category: `source`
- Register in `registry.ts`
- File drop: detect `.json` extension → create `source.json` node (parallel to CSV logic)

### Files

| Action | Path |
|--------|------|
| Create | `src/nodes/source-json.ts` |
| Update | `src/nodes/registry.ts`, `src/ui/FileDropzone.tsx` |

---

## Task 2: CSV import options in inspector

### Implementation

- Extend `source.csv` inspector fields:
  - **Delimiter** — text input, default `,`; optional auto-detect hint
  - **Header** — boolean toggle, default `true`
  - **Encoding** — select: `utf-8`, `latin-1`, etc.
- Pass options through to worker `loadCsv` / source `compile`
- On option change: mark source + downstream stale, re-run

### Auto-detect (optional enhancement)

- Sniff first KB of file for common delimiters (`,`, `\t`, `;`)
- Show detected value as placeholder; user can override

---

## Task 3: Profile RPC in worker

### Implementation

- Extend kernel RPC: `profileNode(nodeId)` or include profile in execution response
- Call `profile_df(df)` from helpers.py after node execution
- Return `ColumnProfile[]`:

```typescript
type ColumnProfile = {
  name: string;
  dtype: string;
  nullCount: number;
  nullPct: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  histogram?: { bin_start: number; bin_end: number; count: number }[];
  topValues?: Record<string, number>;
};
```

- Profile computed for **selected node's output** DataFrame in worker
- Large datasets: sample at 100,000 rows (already in helpers.py)

---

## Task 4: Profile panel UI

### Implementation

- Create `src/ui/ProfilePanel.tsx` in right sidebar (tab or split with Inspector)
- Scrollable column cards showing:
  - All types: name, dtype, null count/%, unique count
  - Numeric: min, max, mean, histogram
  - String/categorical: top 10 values with counts
  - Datetime: min, max date
- Update when user selects any node in pipeline (not just sources)
- Loading skeleton while profile computes

### Layout

Per UX guidelines: right sidebar shows profile when node selected.

---

## Task 5: Numeric histogram rendering

### Implementation

- Render histogram as small bar chart per numeric column
- Options (pick one):
  - Lightweight HTML/CSS bars (no extra dependency)
  - Canvas-based mini chart
  - Observable Plot (if bundle size acceptable)
- 10 bins from `profile_df` histogram data
- Handle empty/all-NA: show "No data" state

---

## Task 6: Categorical top-values display

### Implementation

- Show top 10 values as labeled bars or list with counts
- Truncate long string values in display (ellipsis)
- Sort by count descending

---

## Task 7: Column click → preview highlight

### Implementation

- Click column card in ProfilePanel → highlight corresponding column in PreviewGrid
- glide-data-grid: use column selection/highlight API
- Click again or click elsewhere to clear highlight
- Optional: scroll preview grid to selected column

---

## Task 8: Wire profile to execution lifecycle

### Implementation

- After successful node execution, fetch/cache profile in `runtime-store`
- Extend `NodeRuntimeState` with optional `profile: ColumnProfile[]`
- Debounce profile refresh on rapid selection changes
- Show stale indicator on profile when node is stale

### Files

| Action | Path |
|--------|------|
| Update | `src/state/runtime-store.ts`, `src/lib/types.ts` |
| Update | `src/hooks/useExecution.ts` |

---

## Task 9: Test fixtures

### Implementation

- Add fixtures per [`plan/10-testing.md`](../plan/10-testing.md):
  - `tests/fixtures/customers.json` (50 records)
  - `tests/fixtures/empty.csv`
  - `tests/fixtures/messy.csv` (nulls, mixed types)
- Mirror demo files in `public/demo/` for E2E

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | `source-json` compile/validate | `tests/unit/nodes/source-json.test.ts` |
| Unit | Profile payload shape from helpers (mock) | `tests/unit/worker/profile.test.ts` if extractable |
| Integration | Load JSON, profile returns column stats | `tests/integration/profile.test.ts` |
| Integration | CSV with custom delimiter | same |
| Integration | Empty CSV — profile handles gracefully | same |
| E2E | Flow A: upload CSV → table + profile visible | extend `vertical-slice.spec.ts` or new spec |
| E2E | Select downstream node → profile updates | same |

### Profile correctness tests (integration)

1. Numeric column: histogram length ≤ 10, min ≤ max
2. String column: topValues has ≤ 10 entries
3. 100k+ row dataset: profiling completes (uses sampling)

---

## Acceptance criteria

### Definition of Done

- [ ] Load CSV or JSON → see table preview + full profile panel.
- [ ] CSV inspector: delimiter, header, encoding options affect loaded data.
- [ ] Profile updates when selecting **any** node in the pipeline (source or transform).
- [ ] Numeric columns show histogram; categorical show top values.
- [ ] Click column in profile → highlights column in preview grid.
- [ ] README **Flow A** works end-to-end.
- [ ] Empty and messy fixtures do not crash profiler.

### Manual verification

1. Upload `sales.csv` — profile shows expected columns and stats
2. Add Filter node — select it — profile reflects filtered data (fewer rows, updated stats)
3. Upload `customers.json` — JSON source works
4. Change CSV delimiter to `\t` on TSV file — parses correctly

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

## Out of scope

- Excel import (deferred)
- Profile export
- Dexie persistence of profiles (recomputed on run)
- Parameters (M5)
