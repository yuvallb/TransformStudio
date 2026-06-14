# Repository Structure

Proposed layout for the Transform Studio codebase.

```
TransformStudio/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI: lint, test, build, deploy to Pages
├── public/
│   ├── 404.html                # SPA fallback for GitHub Pages
│   └── demo/                   # Sample datasets for demo workflows
│       ├── sales.csv
│       └── customers.csv
├── plan/                       # Architecture docs (this folder)
├── src/
│   ├── app/
│   │   ├── App.tsx             # Root component, routing
│   │   ├── main.tsx            # Entry point
│   │   └── layout/
│   │       ├── Header.tsx      # Logo, share, export, params buttons
│   │       ├── Sidebar.tsx     # Node palette
│   │       └── Footer.tsx      # Status bar (row counts, Pyodide status)
│   ├── canvas/
│   │   ├── FlowCanvas.tsx      # React Flow wrapper
│   │   ├── NodeRenderer.tsx    # Custom node component
│   │   ├── EdgeRenderer.tsx    # Custom edge (if needed)
│   │   ├── NodePalette.tsx     # Draggable node list
│   │   └── useFlowHandlers.ts  # onConnect, onDrop, onDelete
│   ├── nodes/
│   │   ├── types.ts            # NodeDefinition interface
│   │   ├── registry.ts         # Node type registry (lookup by type ID)
│   │   ├── source-csv.ts
│   │   ├── source-json.ts
│   │   ├── filter.ts
│   │   ├── select.ts
│   │   ├── rename.ts
│   │   ├── derive.ts
│   │   ├── sort.ts
│   │   ├── groupby.ts
│   │   ├── join.ts
│   │   ├── concat.ts
│   │   ├── dropna.ts
│   │   ├── fillna.ts
│   │   ├── cast.ts
│   │   └── output.ts
│   ├── engine/
│   │   ├── topo-sort.ts        # Kahn's algorithm + cycle detection
│   │   ├── fingerprint.ts      # Content hash for cache keys
│   │   ├── codegen.ts          # Full pipeline script/notebook generation
│   │   ├── param-substitute.ts # {param} → value replacement
│   │   └── kernel-client.ts    # Main-thread API to worker (Comlink wrapper)
│   ├── worker/
│   │   ├── pyodide.worker.ts   # Web Worker entry point
│   │   ├── kernel.ts           # Execution loop (topo, cache, run)
│   │   └── python/
│   │       ├── helpers.py      # preview_df, profile_df (loaded into Pyodide)
│   │       └── helpers.ts      # TS loader that injects helpers.py using Vite `?raw` import
│   ├── data/
│   │   ├── db.ts               # Dexie database definition
│   │   ├── workflow-repo.ts    # CRUD for workflows
│   │   ├── dataset-repo.ts     # CRUD for imported files
│   │   └── version-repo.ts     # CRUD for version snapshots
│   ├── sharing/
│   │   ├── serialize.ts        # Workflow → JSON (strip runtime)
│   │   ├── compress.ts         # gzip + base64url encode/decode
│   │   └── url.ts              # Read/write hash, clipboard copy
│   ├── versioning/
│   │   ├── snapshot.ts         # Create/revert/fork snapshots
│   │   └── diff.ts             # JSON diff between two workflows
│   ├── export/
│   │   ├── python-script.ts    # Generate .py file
│   │   └── notebook.ts         # Generate .ipynb file
│   ├── ui/
│   │   ├── components/         # shadcn/ui components (auto-generated)
│   │   ├── PreviewGrid.tsx     # glide-data-grid wrapper
│   │   ├── ProfilePanel.tsx    # Column profiling display
│   │   ├── CodeView.tsx        # CodeMirror wrapper
│   │   ├── Inspector.tsx       # Node config form (auto-generated from schema)
│   │   ├── ParamDialog.tsx     # "Run with parameters" dialog
│   │   ├── VersionHistory.tsx  # Version list, revert, fork, compare
│   │   ├── ShareDialog.tsx     # Share URL / export file
│   │   └── FileDropzone.tsx    # Drag-and-drop file import
│   ├── state/
│   │   ├── workflow-store.ts   # Zustand: graph, selection, params
│   │   ├── runtime-store.ts    # Zustand: per-node status, previews
│   │   └── ui-store.ts         # Zustand: panel visibility, dialogs
│   ├── hooks/
│   │   ├── usePyodide.ts       # Pyodide lifecycle hook
│   │   ├── useWorkflow.ts      # Workflow CRUD + autosave
│   │   └── useExecution.ts     # Trigger recompute, handle results
│   └── lib/
│       ├── types.ts            # Shared types (Workflow, Node, Edge, Param, etc.)
│       ├── constants.ts        # Preview row cap, schema version, etc.
│       └── utils.ts            # Shared utilities
├── tests/
│   ├── unit/
│   │   ├── nodes/              # Per-node compile/validate tests
│   │   ├── engine/             # topo-sort, fingerprint, codegen tests
│   │   └── sharing/            # serialize, compress round-trip tests
│   └── e2e/
│       ├── vertical-slice.spec.ts
│       ├── sharing.spec.ts
│       └── pyodide-smoke.spec.ts
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Key conventions

### One file per node type

Each node in `src/nodes/` exports a single `NodeDefinition` object. Registration happens in `registry.ts`:

```typescript
import { sourceCsv } from './source-csv';
import { filter } from './filter';
// ...

export const nodeRegistry: Record<NodeType, NodeDefinition> = {
  'source.csv': sourceCsv,
  'filter': filter,
  // ...
};
```

### Worker isolation

Everything under `src/worker/` runs in the Web Worker. It must not import React or DOM APIs. Communication with the main thread is exclusively via Comlink RPC defined in `kernel-client.ts`.

### Raw asset loading for Python helpers

To keep the Python helper code clean and maintainable with syntax highlighting, we store it in a standard `.py` file (`helpers.py`). In `helpers.ts`, we load this file as a raw string using Vite's native raw import syntax:

```typescript
import helpersPy from './python/helpers.py?raw';

export function getPythonHelpers(): string {
  return helpersPy;
}
```

This avoids any custom build steps or loader scripts, providing an excellent developer experience (DX).

### State boundaries

| Store | Owns | Persisted? |
|-------|------|------------|
| `workflow-store` | Graph, params, selection | Yes (Dexie) |
| `runtime-store` | Per-node status, previews, errors | No (recomputed) |
| `ui-store` | Panel toggles, dialog open state | No |

### Test colocation

Unit tests live in `tests/unit/` mirroring `src/` structure. E2E tests in `tests/e2e/`.
