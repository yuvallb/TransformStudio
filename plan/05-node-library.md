# Node Library

## Node categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Source** | Load data into the pipeline | CSV, JSON |
| **Transform** | Modify data | Filter, GroupBy, Join, ... |
| **Output** | Terminal node for export | Output/Export |

## v1 nodes (MVP + full library)

### Sources

| Node | Type ID | Inputs | Config | Compile output |
|------|---------|--------|--------|----------------|
| **CSV Source** | `source.csv` | 0 | `filename`, `delimiter`, `header`, `encoding` | `node_id = pd.read_csv(...)` |
| **JSON Source** | `source.json` | 0 | `filename`, `orient` | `node_id = pd.read_json(...)` |

Source nodes receive file bytes from the main thread at import time. The worker writes them to a virtual path and reads with Pandas.

### Transforms

| Node | Type ID | Inputs | Config | Compile output |
|------|---------|--------|--------|----------------|
| **Filter** | `filter` | 1 | `expression` (e.g. `df["revenue"] > 1000`) | `out = inp[inp.eval(expr)]` or bracket notation |
| **Select** | `select` | 1 | `columns: string[]`, `mode: 'keep' \| 'drop'` | `out = inp[columns]` or `out = inp.drop(columns)` |
| **Rename** | `rename` | 1 | `mapping: Record<string, string>` | `out = inp.rename(columns=mapping)` |
| **Derive** | `derive` | 1 | `column`, `expression` | `out = inp.assign(**{column: expression})` (optimized for Copy-on-Write) |
| **Sort** | `sort` | 1 | `columns: string[]`, `ascending: boolean[]` | `out = inp.sort_values(by=columns, ascending=ascending)` |
| **GroupBy** | `groupby` | 1 | `groupColumns: string[]`, `aggregations: { column, func }[]` | `out = inp.groupby(...).agg(...).reset_index()` |
| **Join** | `join` | 2 | `leftOn`, `rightOn`, `how: 'inner' \| 'left' \| 'right' \| 'outer'`, `suffixes?: [string, string]` | `out = left.merge(right, left_on=..., right_on=..., how=..., suffixes=suffixes || ('_left', '_right'))` |
| **Concat** | `concat` | 2+ | `axis: 0 \| 1` | `out = pd.concat([inp1, inp2], axis=axis)` |
| **Drop NA** | `dropna` | 1 | `columns?: string[]`, `how: 'any' \| 'all'` | `out = inp.dropna(subset=columns, how=how)` |
| **Fill NA** | `fillna` | 1 | `columns?: string[]`, `value` | `out = inp.fillna({col: value for col in columns})` |
| **Cast** | `cast` | 1 | `mapping: Record<string, string>` (col → dtype) | `out = inp.astype(mapping)` |

### Output

| Node | Type ID | Inputs | Config | Compile output |
|------|---------|--------|--------|----------------|
| **Output** | `output` | 1 | `format: 'csv' \| 'json'`, `filename` | `inp.to_csv(...)` or `inp.to_json(...)` — triggers browser download |

## Vertical slice nodes (M2)

The first working pipeline uses only these four:

```
CSV Source → Filter → GroupBy → Output
```

This proves the full loop: import, canvas, execution, preview, code view, export.

## Phase 2 nodes (stretch)

| Node | Type ID | Notes |
|------|---------|-------|
| **Excel Source** | `source.excel` | Requires `openpyxl` in Pyodide; adds ~2 MB |
| **Pivot** | `pivot` | `pd.pivot_table(...)` |
| **Unpivot (melt)** | `melt` | `pd.melt(...)` |
| **Window** | `window` | Rolling/expanding aggregations |
| **Dedup** | `dedup` | `drop_duplicates(subset=..., keep=...)` |
| **Sample** | `sample` | `sample(n=...)` or `sample(frac=...)` |
| **String transform** | `str_transform` | upper/lower/strip/contains/replace |
| **Date transform** | `date_transform` | extract year/month/day, parse dates |
| **Custom Python** | `custom.python` | Freeform Python snippet; escape hatch |

## Node UI on canvas

Each node renders as a React Flow custom node:

```
┌─────────────────────────┐
│  🔵 Filter              │
│  revenue > 1000         │
│  ─────────────────────  │
│  ✓ 1,234 rows × 8 cols │
└─────────────────────────┘
```

- Header: icon + type label + user title.
- Body: summary of key config (truncated).
- Footer: status indicator + row/col count from preview.
- Handles: input (left), output (right). Join has two input handles.
- Error state: red border + error icon; click to see traceback.

## Inspector panel (right sidebar)

When a node is selected, the inspector renders form fields from `inspectorSchema()`:

- Auto-generated from the node's field definitions.
- Column pickers populated from upstream schema.
- Expression fields with syntax highlighting.
- Param-ref fields show a dropdown of defined workflow params.
- Validation errors shown inline before execution.
