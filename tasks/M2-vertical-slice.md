# M2: Vertical Slice (Critical Path)

**Goal:** End-to-end pipeline proving the full product loop.

**Pipeline:** `CSV Source → Filter → GroupBy → Output`

**Prerequisites:** M1 complete.

**Estimated effort:** 4x (highest priority milestone)

---

## Task 1: Domain types and node contract

### Implementation

- Implement full types from [`plan/03-domain-model.md`](../plan/03-domain-model.md):
  - `Workflow`, `WorkflowNode`, `WorkflowEdge`, `ColumnSchema`
  - `NodeDefinition`, `NodeInputPort`, `InspectorField`, `ValidationError`
- Create `src/nodes/types.ts` with the `NodeDefinition` interface.
- Create `src/nodes/registry.ts` — registry stub for M2 nodes only.
- `schemaVersion: 1` on all workflow objects.

### Files

| Action | Path |
|--------|------|
| Create | `src/nodes/types.ts`, `src/nodes/registry.ts` |
| Update | `src/lib/types.ts` |

---

## Task 2: Zustand stores

### Implementation

Three stores per architecture:

**`workflow-store.ts`**
- State: `nodes`, `edges`, `selection`, `params` (empty array in M2)
- Actions: add/remove/update node, add/remove edge, select node, set config
- On graph edit: compute downstream stale set (delegate to engine helper)

**`runtime-store.ts`**
- State: `Map<nodeId, NodeRuntimeState>` (status, fingerprint, preview, error)
- Not persisted

**`ui-store.ts`**
- Panel visibility, code view mode (`node` | `pipeline`), bottom panel open

Wire React Flow controlled mode to `workflow-store`.

### Files

| Action | Path |
|--------|------|
| Create | `src/state/workflow-store.ts`, `runtime-store.ts`, `ui-store.ts` |

---

## Task 3: React Flow canvas

### Implementation

- Install `@xyflow/react`.
- `src/canvas/FlowCanvas.tsx` — ReactFlow wrapper with pan/zoom, background grid.
- `src/canvas/NodeRenderer.tsx` — custom node component:
  - Header: type label + optional title
  - Body: config summary (truncated)
  - Footer: status color + row/col count from runtime store
  - Handles: input (left), output (right)
  - Error state: red border (`#EF4444` per UX guidelines)
  - Stale state: amber border (`#F59E0B`)
  - Success: green indicator (`#10B981`)
- `src/canvas/useFlowHandlers.ts` — onConnect, onNodesChange, onEdgesChange, onDelete
- Validate connections: transform nodes require one input; sources have no input.

### Files

| Action | Path |
|--------|------|
| Create | `src/canvas/FlowCanvas.tsx`, `NodeRenderer.tsx`, `useFlowHandlers.ts` |

---

## Task 4: Node palette

### Implementation

- `src/canvas/NodePalette.tsx` — grouped list (Source, Transform, Output).
- Drag from palette → drop on canvas creates node with `defaultConfig()` and unique ID.
- M2 palette entries only: CSV Source, Filter, GroupBy, Output.

### Files

| Action | Path |
|--------|------|
| Create | `src/canvas/NodePalette.tsx` |

---

## Task 5: Implement M2 node types

### Implementation

One file per node per [`plan/05-node-library.md`](../plan/05-node-library.md).

#### `source.csv`
- Config: `filename`, `delimiter` (default `,`), `header` (default `true`), `encoding` (default `utf-8`)
- `compile`: reads from virtual path or injected bytes reference
- `validate`: requires filename or attached dataset
- No inputs

#### `filter`
- Config: `expression` (e.g. `df["revenue"] > 1000`)
- `compile`: generate safe bracket notation or `.query()` with **params dict** pattern (even if params empty in M2)
- `validate`: expression required; optional column existence check from upstream schema
- **Security (M2 minimum):** reject obvious injection patterns; full AST whitelist in M4

#### `groupby`
- Config: `groupColumns: string[]`, `aggregations: { column: string; func: 'sum'|'mean'|'count'|'min'|'max' }[]`
- `compile`: `out = inp.groupby(groupColumns).agg(...).reset_index()`
- `validate`: group columns exist upstream

#### `output`
- Config: `format: 'csv' | 'json'`, `filename`
- `compile`: export snippet (for script export); terminal node
- Category: `output`

Register all four in `registry.ts`.

### Files

| Action | Path |
|--------|------|
| Create | `src/nodes/source-csv.ts`, `filter.ts`, `groupby.ts`, `output.ts` |

---

## Task 6: Execution engine (main thread + worker)

### Implementation

**Main thread (`src/engine/`):**

- `topo-sort.ts` — Kahn's algorithm; throw/return error on cycle
- `fingerprint.ts` — SHA-256 hash of `{ type, config, params, upstreamFingerprints }`
- `codegen.ts` — full pipeline script from topo-sorted nodes
- `useExecution.ts` hook — orchestrates run requests

**Worker (`src/worker/kernel.ts`):**

- Receive run request: `{ nodes, edges, params, staleNodeIds?, nodeRegistry compile fns serialized? }`
- Note: `compile()` runs on main thread; worker receives **compiled Python snippets** per node
- Maintain namespace: `node_<id>` → DataFrame
- Execute only stale nodes in topo order
- After each node: compute fingerprint, cache preview, emit to main thread
- **Memory cleanup on node delete:** `del namespace["node_<id>"]` + `gc.collect()`

**Stale propagation:**
- Node config edit → node + all downstream stale
- Edge change → target + downstream stale

### Files

| Action | Path |
|--------|------|
| Create | `src/engine/topo-sort.ts`, `fingerprint.ts`, `codegen.ts` |
| Create | `src/worker/kernel.ts` |
| Create | `src/hooks/useExecution.ts` |
| Update | `src/engine/kernel-client.ts` |

---

## Task 7: Wire engine to Pyodide worker

### Implementation

- Extend kernel RPC: `executePipeline(request) → NodeRuntimeState[]`
- Main thread:
  1. Topo sort
  2. For each stale node: call `nodeDefinition.compile()` locally
  3. Send compiled snippets + execution order to worker
- Worker executes snippets, returns previews/errors per node
- Update `runtime-store` with results

---

## Task 8: CSV drag-and-drop import

### Implementation

- `src/ui/FileDropzone.tsx` — drag file onto canvas or dedicated drop target
- Main thread reads file as `ArrayBuffer`
- Auto-create `source.csv` node if none exists; attach filename to config
- Pass bytes to worker via `loadCsv` or pipeline source execution
- Trigger pipeline run for source node

### Files

| Action | Path |
|--------|------|
| Create | `src/ui/FileDropzone.tsx` |

---

## Task 9: Preview grid

### Implementation

- Install `@glideapps/glide-data-grid`
- `src/ui/PreviewGrid.tsx` — shows selected node's output preview
- Virtualized rendering for wide/tall tables
- Column headers with dtype badges
- Footer: "Showing {N} of {totalRows} rows" (N capped at 100)
- Empty state when no node selected or no preview

### Files

| Action | Path |
|--------|------|
| Create | `src/ui/PreviewGrid.tsx` |

---

## Task 10: Code view panel

### Implementation

- Install `@codemirror/lang-python`, `@uiw/react-codemirror` (or CM6 direct)
- `src/ui/CodeView.tsx`:
  - Toggle: **Node code** (single `compile()` output) vs **Full pipeline** (`codegen.ts`)
  - Read-only in M2
- Update on selection change and after execution

### Files

| Action | Path |
|--------|------|
| Create | `src/ui/CodeView.tsx` |

---

## Task 11: Inspector panel (M2 minimal)

### Implementation

- `src/ui/Inspector.tsx` — render form fields from `inspectorSchema()` for selected node
- M2: manual forms per node type acceptable; auto-generation comes in M4
- Filter: expression text input
- GroupBy: group column multi-select, aggregation builder
- Source CSV: filename display, delimiter/header fields
- On config change: mark stale + debounced re-execute (300–500ms)

---

## Task 12: Python script export

### Implementation

- `src/export/python-script.ts` — `generateScript(workflow): string`
- Header: imports (`pandas`, `numpy`), CoW comment optional
- Topo-ordered nodes with comment labels
- Download via browser `Blob` + anchor click as `pipeline.py`
- Wire to Header "Export" button (script only in M2; notebook in M7)

### Files

| Action | Path |
|--------|------|
| Create | `src/export/python-script.ts` |

---

## Task 13: Error display per node

### Implementation

- Runtime error: red border on node card + error icon
- Click node → inspector shows error message/traceback (truncated in M2; expandable in M9)
- Validation errors: show inline in inspector before execution
- Graph-level errors (cycle): toast + banner

---

## Task 14: Layout integration

### Implementation

- Wire three-panel layout per UX guidelines:
  - Left: NodePalette
  - Center: FlowCanvas
  - Right: Inspector (+ CodeView tab)
  - Bottom: PreviewGrid
- Footer: Pyodide status, selected node row count

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | `topo-sort`: linear, diamond, cycle detection | `tests/unit/engine/topo-sort.test.ts` |
| Unit | `fingerprint`: same/different config | `tests/unit/engine/fingerprint.test.ts` |
| Unit | `codegen`: full pipeline script shape | `tests/unit/engine/codegen.test.ts` |
| Unit | Each M2 node `compile()` and `validate()` | `tests/unit/nodes/*.test.ts` |
| Integration | Execute filter + groupby in worker | `tests/integration/pipeline.test.ts` |
| Integration | Incremental recompute skips unchanged source | same |
| E2E | **Full vertical slice** (most important test) | `tests/e2e/vertical-slice.spec.ts` |

### E2E vertical slice steps

1. Open app → wait for Pyodide ready
2. Upload `tests/fixtures/sales.csv`
3. Verify preview grid shows data
4. Add Filter node, connect to source, set `revenue > 1000`
5. Verify preview row count decreases
6. Add GroupBy, connect, group by region, sum revenue
7. Verify aggregated preview
8. Open code view → assert Python contains filter and groupby
9. Export script → verify download contains topo-ordered code

### Fixtures

Create `tests/fixtures/sales.csv` (~100 rows) with columns: `region`, `revenue`, `country`, etc.

---

## Acceptance criteria

### Definition of Done

- [ ] User can drag CSV → see preview → add Filter → add GroupBy → see live previews → view generated code → export Python script.
- [ ] Editing Filter config recomputes **only** Filter + GroupBy (not Source) — verify via integration test or debug logging.
- [ ] Exported script contains correct topo-ordered Pandas code matching live execution.
- [ ] README **Flow B** works end-to-end (minus Join/Sort nodes not in M2 palette).
- [ ] Cycle in graph shows error before execution.
- [ ] Node deletion frees worker memory (`del` + `gc.collect()`).
- [ ] Preview never exceeds 100 rows across worker boundary.
- [ ] `tests/e2e/vertical-slice.spec.ts` passes in CI.

### Incremental recompute verification

1. Build pipeline Source → Filter → GroupBy
2. Run pipeline (all nodes success)
3. Change Filter expression only
4. Assert Source fingerprint unchanged; Filter and GroupBy re-executed

### Manual verification

1. Complete Flow B with sample sales data
2. Compare preview totals with exported script run locally in Python (optional sanity check)
3. Delete GroupBy node — worker namespace cleaned (no OOM on re-add)

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

- JSON source, profiling panel, parameters
- M4 nodes (Select, Join, etc.)
- Dexie persistence, sharing, versioning
- Jupyter export (M7)
- Full AST expression validation (M4)
- Auto-generated inspector forms (M4)
