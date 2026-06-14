# Transform Studio — Build Plan

This folder contains the architecture and implementation plan for building **Transform Studio** as a **client-side-only** application powered by **Pyodide**.

## Confirmed decisions

| Area | Decision |
|------|----------|
| Frontend | React 19 + TypeScript + Vite |
| DAG canvas | React Flow (`@xyflow/react`) |
| State | Zustand |
| UI | Tailwind CSS + shadcn/ui |
| Python runtime | Pyodide in a Web Worker + Comlink |
| Storage | IndexedDB via Dexie |
| Sharing | Compressed URL hash (`#w=...`) + `.tstudio.json` file fallback |
| v1 features | Parameters, versioning, Jupyter notebook export |
| Target data size | ~50–100 MB |
| Deployment | GitHub Pages (static) |
| Build approach | Vertical slice first: import → filter → groupby → export |

## Deferred (stretch)

- Excel import (openpyxl adds bundle weight)
- dbt/SQL export (lossy from Pandas; best-effort only)
- Custom Python node (escape hatch)
- >100 MB datasets (Arrow IPC + chunking)

## Documents

| File | Contents |
|------|----------|
| [01-architecture.md](./01-architecture.md) | High-level system design, thread model, data flow |
| [02-tech-stack.md](./02-tech-stack.md) | Library choices and rationale |
| [03-domain-model.md](./03-domain-model.md) | Workflow graph schema, node contract |
| [04-execution-engine.md](./04-execution-engine.md) | Kernel, topo sort, caching, code generation |
| [05-node-library.md](./05-node-library.md) | MVP and phase-2 transformation nodes |
| [06-features.md](./06-features.md) | Import, profiling, params, sharing, versioning, export |
| [07-milestones.md](./07-milestones.md) | Phased delivery plan with exit criteria |
| [08-repo-structure.md](./08-repo-structure.md) | Proposed source layout |
| [09-risks-and-mitigations.md](./09-risks-and-mitigations.md) | Technical risks |
| [10-testing.md](./10-testing.md) | Test strategy |

## One-sentence summary

> Transform Studio is a GitHub-like visual workspace for data transformations that runs Python (Pandas) entirely in the browser via Pyodide, making workflows shareable, reproducible, and code-exportable without infrastructure.

## Delivery order

```
M0 → M1 → M2 (vertical slice) → M3 → M4 → M5 → M6 → M7 → M8 → M9
```

See [07-milestones.md](./07-milestones.md) for full details.
