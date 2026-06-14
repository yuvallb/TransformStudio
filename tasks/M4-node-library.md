# M4: Full v1 Node Library

**Goal:** All transform nodes needed for real-world pipelines, with validation and inspector UX.

**Prerequisites:** M3 complete.

**Estimated effort:** 4x

---

## Task 1: Implement remaining transform nodes

### Implementation

One file per node in `src/nodes/`. Each exports a `NodeDefinition` registered in `registry.ts`.

| Node | File | Key config | Compile pattern |
|------|------|------------|-----------------|
| Select | `select.ts` | `columns`, `mode: 'keep'\|'drop'` | `inp[columns]` or `inp.drop(columns=...)` |
| Rename | `rename.ts` | `mapping: Record<string,string>` | `inp.rename(columns=mapping)` |
| Derive | `derive.ts` | `column`, `expression` | `inp.assign(**{column: expr})` |
| Sort | `sort.ts` | `columns`, `ascending: boolean[]` | `sort_values(by=..., ascending=...)` |
| Join | `join.ts` | `leftOn`, `rightOn`, `how`, `suffixes?` | `left.merge(right, ...)` |
| Concat | `concat.ts` | `axis: 0\|1` | `pd.concat([...], axis=axis)` |
| Drop NA | `dropna.ts` | `columns?`, `how: 'any'\|'all'` | `dropna(subset=..., how=...)` |
| Fill NA | `fillna.ts` | `columns?`, `value` | `fillna(...)` |
| Cast | `cast.ts` | `mapping: Record<string,string>` | `astype(mapping)` |

Reference compile output in [`plan/05-node-library.md`](../plan/05-node-library.md).

---

## Task 2: Multi-input handles (Join, Concat)

### Implementation

- **Join** inputs: `[{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }]`
- **Concat** inputs: `[{ id: 'input1', label: 'Input 1' }, { id: 'input2', label: 'Input 2' }]` (v1: exactly 2)
- React Flow: two target handles on left side of node, labeled
- `WorkflowEdge.targetHandle` stores which input port
- Execution engine: map edges to `inputVars` order for `compile()`
- Topo sort: node waits until all required inputs connected

### Validation

- Join: `leftOn`/`rightOn` columns must exist in respective upstream schemas
- Concat: warn if column sets differ (row concat) — allow but validate axis

---

## Task 3: Expression security (Filter, Derive)

### Implementation

Per [`plan/01-architecture.md`](../plan/01-architecture.md):

1. Send expression to worker for validation before execution
2. Python `ast.parse()` + AST visitor whitelist:
   - Allow: `Name`, `Constant`, `Compare`, `BinOp`, `UnaryOp`, `Subscript`, `Attribute`, `BoolOp`
   - Reject: `Import`, `ImportFrom`, `Call` (except whitelisted), `Lambda`, dunder attributes
3. Whitelisted calls if any: basic math only
4. On rejection: validation error in inspector, no execution

Add worker RPC: `validateExpression(expr: string): { valid: boolean; error?: string }`

---

## Task 4: Auto-generated inspector forms

### Implementation

- Refactor `Inspector.tsx` to render from `inspectorSchema()`:
  - `text` → Input
  - `number` → number Input
  - `select` → Select dropdown
  - `column` → ColumnPicker (single)
  - `columns` → ColumnPicker (multi)
  - `expression` → ExpressionInput
  - `param-ref` → stub for M5 (disabled or hidden)
- Unknown field kind → dev console warning

---

## Task 5: Column picker component

### Implementation

- `src/ui/ColumnPicker.tsx`:
  - Populated from upstream `ColumnSchema[]` (propagated through graph)
  - Single and multi-select modes
  - Show dtype badge next to column name
  - Filter/search for wide schemas
- Schema propagation: engine computes per-node upstream schema from preview columns

---

## Task 6: Expression input component

### Implementation

- `src/ui/ExpressionInput.tsx`:
  - CodeMirror with Python expression mode (lightweight)
  - Placeholder: `df["revenue"] > 1000`
  - Inline validation on blur (call AST validator)
  - Error state styling

---

## Task 7: Per-node input preview

### Implementation

- Collapsible section in Inspector: **Input preview**
- Shows first N rows of upstream node's output (from runtime store)
- Read-only mini grid or simplified table
- Hidden for source nodes (no upstream)

---

## Task 8: Pre-execution validation UX

### Implementation

- On config change: run `validate(config, upstreamSchemas)` locally
- Display errors inline under each field
- Block execution if validation errors exist (node stays idle/stale)
- Join missing keys, unknown columns, empty expression → clear messages

---

## Task 9: Update node palette

### Implementation

- Add all v1 nodes to `NodePalette.tsx`, grouped by category
- Icons per node type (lucide-react)

---

## Task 10: Unit tests for every node

### Implementation

Per [`plan/10-testing.md`](../plan/10-testing.md), one test file per node:

- `compile()` output matches expected Python
- `validate()` catches bad config (missing fields, invalid columns)
- Edge cases: empty column lists, duplicate rename keys

### Files

| Action | Path |
|--------|------|
| Create | `tests/unit/nodes/select.test.ts`, `rename.test.ts`, … (all nodes) |

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | All 13 node types compile/validate | `tests/unit/nodes/*.test.ts` |
| Unit | Expression AST rejects `__import__`, `exec` | `tests/unit/engine/expression-validator.test.ts` |
| Integration | Join two CSVs correctly | `tests/integration/join.test.ts` |
| Integration | Concat row-wise | same |
| E2E | Build pipeline with Join node | extend vertical slice or new spec |

### Join integration test scenario

1. Load customers + orders fixtures
2. Join on `customer_id`
3. Assert merged column count and row count

---

## Acceptance criteria

### Definition of Done

- [ ] All v1 nodes (sources, transforms, output) work in isolation and in combination.
- [ ] Join node correctly merges two upstream datasets on configured keys.
- [ ] Concat node stacks or side-by-side concatenates per axis config.
- [ ] Invalid config shows clear validation errors **without executing**.
- [ ] Expression nodes reject unsafe AST before execution.
- [ ] Inspector auto-renders from `inspectorSchema()` for all nodes.
- [ ] Column picker shows upstream schema with dtypes.
- [ ] Per-node input preview shows upstream data when collapsed section opened.
- [ ] All node unit tests pass in CI.

### Manual verification

1. Build pipeline: CSV → Filter → Join (customers) → GroupBy → Sort → Output
2. Break Join keys intentionally — see validation error, no crash
3. Derive new column — appears in preview and profile
4. Cast column types — dtypes update in preview headers

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

- Workflow parameters `{param}` substitution (M5)
- Pivot, melt, dedup, sample (phase 2 nodes)
- Custom Python node
- param-ref inspector field functionality (M5)
