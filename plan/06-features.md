# Features

Detailed design for each user-facing feature, mapped to README flows.

## F1: Dataset import (Flow A)

### Supported formats (v1)

- **CSV** — delimiter, header row, encoding options
- **JSON** — records orientation

### Import flow

1. User drags file onto the canvas or clicks "Import".
2. Main thread reads file as `ArrayBuffer`.
3. If no source node exists, auto-create a `source.csv` or `source.json` node.
4. Pass bytes to worker; worker loads into Pandas.
5. Store raw file in IndexedDB (`DatasetRecord`).
6. Display preview grid + profile panel.

### CSV options (inspector)

| Field | Default | Notes |
|-------|---------|-------|
| Delimiter | `,` | Auto-detect if possible |
| Header | `true` | First row as column names |
| Encoding | `utf-8` | |

## F2: Data profiling (Flow A)

Shown in a side panel when a source or any node is selected.

### Per-column stats

| Dtype | Stats shown |
|-------|-------------|
| All | name, dtype, null count/%, unique count |
| Numeric | min, max, mean, std, histogram (10 bins) |
| String/categorical | top 10 values with counts |
| Datetime | min, max date |

### UI

- Scrollable list of column cards.
- Click a column to highlight it in the preview grid.
- Histogram rendered as a small bar chart (Observable Plot or canvas).

## F3: Visual DAG builder (Flow B)

### Canvas interactions

| Action | Behavior |
|--------|----------|
| Drag from palette | Add node to canvas |
| Connect handles | Create edge (validate type compatibility) |
| Click node | Select → show inspector |
| Delete node/edge | Remove + invalidate downstream |
| Pan / zoom | React Flow built-in |
| Undo / redo | Zustand middleware or manual history stack |

### Node palette

Grouped by category (Source, Transform, Output). Drag onto canvas to add.

### Per-node display

- Input preview (collapsible): first N rows of upstream data.
- Output preview: first N rows after this node's transform.
- Generated Python code: read-only CodeMirror snippet for this node.

## F4: Live preview & code view (Flow B)

### Preview grid

- Virtualized with glide-data-grid.
- Shows selected node's output (or source data if source selected).
- Column headers show dtype badges.
- Row count footer: "Showing 100 of 45,231 rows".

### Code view

- Toggle between "Node code" (single node snippet) and "Full pipeline" (topo-ordered script).
- Syntax-highlighted Python in CodeMirror.
- Read-only in v1; editable code is a stretch (custom Python node).

## F5: Parameters (Flow D)

### Defining parameters

1. User creates a workflow-level parameter (name, type, default).
2. In a node's expression field, reference it as `{param_name}`.
3. Inspector shows a "linked params" indicator.

### Parameter types

| Type | UI control | Example |
|------|------------|---------|
| `string` | Text input | `country` = `"US"` |
| `number` | Number input | `min_revenue` = `1000` |
| `date` | Date picker | `start_date` = `"2024-01-01"` |
| `enum` | Dropdown | `category` = one of `["A", "B", "C"]` |
| `boolean` | Toggle | `active_only` = `true` |

### Run with parameters

- Toolbar button: "Run with parameters".
- Dialog shows all defined params with editable values.
- On confirm: substitute values, re-execute pipeline, update previews.

### Serialization

Params are part of the `Workflow` schema and included in shared URLs and version snapshots.

## F6: Sharing (Flow C)

### URL-based sharing (zero backend) (CTO Refinement: Native Compression)

To avoid external dependencies and keep the bundle size minimal, we will use the browser's native **CompressionStream** API (available in all modern browsers) instead of `pako`.

```javascript
// Native sharing flow:
1. User clicks "Share"
2. Serialize workflow (nodes, edges, params) — NO data
3. Convert JSON string to Uint8Array: const bytes = new TextEncoder().encode(jsonStr)
4. Compress bytes via native gzip:
   const cs = new CompressionStream('gzip');
   const writer = cs.writable.getWriter();
   writer.write(bytes);
   writer.close();
   const compressedBytes = await new Response(cs.readable).arrayBuffer();
5. Encode to URL-safe Base64:
   const base64 = btoa(String.fromCharCode(...new Uint8Array(compressedBytes)))
     .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
6. Set window.location.hash = "w=" + base64
7. Copy full URL to clipboard
```

### Size limits

| Condition | Action |
|-----------|--------|
| Encoded hash < ~6 KB | URL sharing works in all browsers |
| Encoded hash 6–50 KB | URL sharing works but may hit browser limits |
| Encoded hash > 50 KB | Show warning; offer `.tstudio.json` file download instead |

### Recipient flow

1. Open shared URL.
2. App parses hash, restores workflow on canvas.
3. Source nodes show "Import your dataset" placeholder.
4. User uploads their file → pipeline runs.

### File fallback

- Export: download `.tstudio.json` (uncompressed workflow).
- Import: upload `.tstudio.json` to restore workflow.

## F7: Versioning (Flow F)

### Snapshot model

- Every significant edit creates an optional snapshot (or auto-snapshot on timer).
- Stored in IndexedDB as `VersionSnapshot` (immutable).
- Parent pointer forms a linked list (git-like, not full DAG in v1).

### User actions

| Action | Behavior |
|--------|----------|
| **Save version** | Prompt for message → create snapshot |
| **View history** | List snapshots with timestamps and messages |
| **Revert** | Load a snapshot's workflow into the editor (current state auto-saved first) |
| **Fork** | Create a new workflow from any snapshot |
| **Compare** | JSON diff between two snapshots (added/removed/changed nodes) |

### Compare UI (CTO Refinement: Visual DAG Diffing)

Instead of a raw text-based JSON diff which is difficult for users to interpret, we will implement a **Visual DAG Diff** mode directly on the React Flow canvas:
1. **Canvas Overlay:** When comparing two versions, the canvas enters "Diff Mode".
2. **Color-coded Nodes:**
   - **Green border/background:** Nodes that exist in the target version but not in the base version (Added).
   - **Red dashed border/background:** Nodes that exist in the base version but were deleted in the target version (Removed).
   - **Yellow border/background:** Nodes whose configuration or parameters were modified (Modified).
   - **Grayed out:** Unchanged nodes.
3. **Interactive Inspector:** Clicking a modified (yellow) node shows a side-by-side property diff in the inspector panel, highlighting the exact config changes.

## F8: Export (Flow E)

### Python script

- Topo-ordered `compile()` output with imports and comments.
- Download as `pipeline.py`.
- Self-contained: reads from file paths (user adjusts paths as needed).

### Jupyter notebook

- Generate `.ipynb` JSON structure.
- One markdown cell per node (label + description).
- One code cell per node (compiled Python snippet).
- Download as `pipeline.ipynb`.

### Notebook structure

```json
{
  "cells": [
    { "cell_type": "markdown", "source": ["# Load CSV"] },
    { "cell_type": "code", "source": ["df = pd.read_csv('data.csv')"] },
    { "cell_type": "markdown", "source": ["# Filter: revenue > 1000"] },
    { "cell_type": "code", "source": ["df = df[df['revenue'] > 1000]"] }
  ],
  "metadata": { "kernelspec": { "name": "python3" } },
  "nbformat": 4,
  "nbformat_minor": 5
}
```

### dbt / SQL (stretch)

- Not in v1. Pandas → SQL translation is lossy.
- If pursued later: map GroupBy → `GROUP BY`, Filter → `WHERE`, Join → `JOIN`, etc.
- Clearly label as "best-effort" export.

## F9: Persistence & autosave

### What is stored (IndexedDB)

| Store | Contents |
|-------|----------|
| `workflows` | Current workflow graphs |
| `datasets` | Raw imported file bytes |
| `versions` | Immutable version snapshots |

### Autosave

- Debounced save (e.g. 2 seconds after last edit).
- On page load: restore most recent workflow + re-import datasets from IndexedDB.
- Re-execute pipeline to repopulate worker state.

### New workflow

- "New" button clears canvas, resets store, creates fresh workflow ID.

### Workflow switcher

- **Open ▾** menu in the header (between workflow name and History) is available at any time.
- Sections: **New workflow**, **Demos** (three preset pipelines), **Recent** (up to 10 saved workflows from IndexedDB, sorted by `updatedAt`).
- Unsaved-changes guard: if `editCount > 0` and no version snapshot exists, confirm before switching.
- Keyboard shortcut: `Ctrl/Cmd + N` for new workflow.
- Empty-canvas `DemoPicker` overlay remains for first-time users.
