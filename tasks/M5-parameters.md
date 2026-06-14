# M5: Parameters

**Goal:** Reusable, parameterized workflows with safe runtime substitution.

**Prerequisites:** M4 complete.

**Estimated effort:** 2x

**README flow:** Flow D

---

## Task 1: Workflow params in domain model

### Implementation

- Extend `workflow-store` with `params: WorkflowParam[]`
- CRUD actions: `addParam`, `updateParam`, `removeParam`
- Validation on param names:
  - Regex: `^[a-zA-Z_][a-zA-Z0-9_]*$`
  - Reject Python keywords (`import`, `def`, `class`, etc.)
  - Unique names within workflow

```typescript
type WorkflowParam = {
  name: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean';
  default: unknown;
  label?: string;
  options?: string[];  // enum only
};
```

---

## Task 2: Params CRUD UI

### Implementation

- Params panel in header or dedicated sidebar section
- List existing params with edit/delete
- "Add parameter" opens form:
  - Name, label, type, default value
  - Enum: options list editor
- Show param count badge in toolbar

### Files

| Action | Path |
|--------|------|
| Create | `src/ui/ParamsPanel.tsx` |

---

## Task 3: Param type editors

### Implementation

| Type | Control | Default handling |
|------|---------|------------------|
| `string` | Text input | `"US"` |
| `number` | Number input | `1000` |
| `date` | Date picker (ISO string) | `"2024-01-01"` |
| `enum` | Select from `options` | first option |
| `boolean` | Toggle/switch | `true` |

Used in ParamsPanel and ParamDialog.

---

## Task 4: `{param}` reference syntax

### Implementation

- In expression fields (Filter, Derive): user writes `{country}` or `{min_revenue}`
- Inspector shows linked-params indicator when `{name}` detected in config strings
- Parse param references: regex `\{(\w+)\}` for validation (param must exist)

---

## Task 5: Safe param substitution in compile()

### Implementation

Per [`plan/04-execution-engine.md`](../plan/04-execution-engine.md) — **no JS string interpolation of values**.

1. Worker loads params dict into Python namespace before execution:

```python
params = {"country": "US", "min_revenue": 1000}
```

2. Node `compile()` translates `{country}` → `params['country']` in generated Python:

```python
node_xyz = node_abc[node_abc["country"] == params["country"]]
```

3. Fingerprint includes resolved param **names** referenced by node + param values from workflow defaults (or override from dialog)

### Files

| Action | Path |
|--------|------|
| Create | `src/engine/param-substitute.ts` — reference parsing helpers only |
| Update | All expression nodes' `compile()` methods |

---

## Task 6: "Run with parameters" dialog

### Implementation

- `src/ui/ParamDialog.tsx`
- Header button: **Run with parameters**
- Lists all workflow params with type-appropriate editors
- Pre-fill with current defaults
- On confirm:
  1. Pass override values to execution engine
  2. Re-run pipeline with overridden `params` dict
  3. Update previews
- Cancel discards overrides (defaults remain in workflow definition)

---

## Task 7: Params in serialization

### Implementation

- Params included in `Workflow` object for:
  - Future Dexie save (M6)
  - Codegen export (defaults in comments or params dict at top of script)
  - Sharing (M8)
- `generateScript()` optionally emits:

```python
params = {"country": "US", "min_revenue": 1000}
```

---

## Task 8: Stale propagation on param change

### Implementation

- When param default or override changes: mark all nodes whose config references that param + downstream as stale
- `param-substitute.ts`: `getNodesReferencingParam(workflow, paramName)`

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | `{param}` → `params['param']` in compile output | `tests/unit/nodes/filter.test.ts` |
| Unit | Invalid param names rejected | `tests/unit/state/params.test.ts` |
| Unit | `param-substitute` reference extraction | `tests/unit/engine/param-substitute.test.ts` |
| Unit | Fingerprint changes when param value changes | `tests/unit/engine/fingerprint.test.ts` |
| Integration | Run pipeline with param override | `tests/integration/params.test.ts` |
| E2E | Flow D: create filter with `{country}`, change via dialog | `tests/e2e/params.spec.ts` |

### Key unit test

```typescript
filter.compile(
  { expression: 'df["country"] == {country}' },
  ['df_input'], 'df_output', {}
);
// expect: df_output = df_input[df_input["country"] == params["country"]]
```

---

## Acceptance criteria

### Definition of Done

- [ ] Create filter `country = {country}` with param `country` defaulting to `"US"`.
- [ ] Change param to `"UK"` via Run with parameters dialog → pipeline re-runs with new value.
- [ ] Preview reflects filtered results for UK rows only.
- [ ] Exported Python script references `params["country"]` safely.
- [ ] Invalid param names blocked in UI (Python keywords, bad chars).
- [ ] README **Flow D** works end-to-end.
- [ ] Param change only invalidates referencing nodes + downstream (not entire graph unnecessarily).

### Manual verification

1. Define params: `country` (string), `min_revenue` (number)
2. Filter: `df["revenue"] > {min_revenue}` AND country logic
3. Run with parameters → change both → verify preview
4. Inspect generated code — no raw string injection vulnerabilities

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

- Param UI in shared URL recipient flow beyond defaults (M8)
- Version snapshots of param overrides vs defaults (M6 stores workflow defaults)
- SQL/dbt param syntax
