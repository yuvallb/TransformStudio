# AGENTS.md — Transform Studio

Guidance for AI coding agents working on this repository. Read this file before making changes.

## Project summary

Transform Studio is a **client-side-only** visual data transformation app: users build Pandas pipelines on a DAG canvas, Python runs in the browser via **Pyodide** in a Web Worker, and workflows are shareable without a backend.

> One sentence: a GitHub-like visual workspace for data transformations that runs Python (Pandas) entirely in the browser, making workflows shareable, reproducible, and code-exportable without infrastructure.

## Current status

The repo is **pre-implementation** (planning docs only). No `src/` tree exists yet. Start at **M0** and do not skip milestones.

## Authoritative references

| Topic | Document |
|-------|----------|
| Product vision & user flows | [`README.md`](./README.md) |
| Plan index & confirmed decisions | [`plan/README.md`](./plan/README.md) |
| Architecture & thread model | [`plan/01-architecture.md`](./plan/01-architecture.md) |
| Libraries & tooling | [`plan/02-tech-stack.md`](./plan/02-tech-stack.md) |
| Workflow schema & node contract | [`plan/03-domain-model.md`](./plan/03-domain-model.md) |
| Execution kernel, caching, codegen | [`plan/04-execution-engine.md`](./plan/04-execution-engine.md) |
| Node types | [`plan/05-node-library.md`](./plan/05-node-library.md) |
| Feature specs | [`plan/06-features.md`](./plan/06-features.md) |
| **Delivery order (strict)** | [`plan/07-milestones.md`](./plan/07-milestones.md) |
| Source layout | [`plan/08-repo-structure.md`](./plan/08-repo-structure.md) |
| Risks | [`plan/09-risks-and-mitigations.md`](./plan/09-risks-and-mitigations.md) |
| Testing | [`plan/10-testing.md`](./plan/10-testing.md) |
| UX layout & visual language | [`plan/UX-guidelines.md`](./plan/UX-guidelines.md) |

When plan docs and code disagree, **plan docs win** until the user explicitly changes a decision. Update code to match the plan, not the reverse.

---

## Non-negotiable constraints

1. **Zero backend** — parsing, execution, persistence, and sharing all run in the browser.
2. **Privacy / local-first** — user datasets stay on the machine unless explicitly exported.
3. **Pyodide in a Web Worker** — never run Python on the main thread.
4. **Workflow ≠ data** — shared URLs and exports contain logic + parameters only, never imported files.
5. **GitHub Pages deployment** — static Vite build; set `base` to `/TransformStudio/`.
6. **Target data size** — design for ~50–100 MB CSVs; preview caps and memory hygiene matter.

### Deferred (do not implement unless asked)

- Excel import (`openpyxl`)
- dbt/SQL export
- Custom Python node (user-supplied code)
- Arrow IPC / chunking for >100 MB datasets
- Any server, API, or cloud dependency

---

## Milestone discipline (strict)

Follow **M0 → M1 → … → M9** in order. See [`plan/07-milestones.md`](./plan/07-milestones.md).

| Milestone | Focus |
|-----------|-------|
| **M0** | Vite + React + TS skeleton, Tailwind/shadcn, lint/test/CI, GitHub Pages |
| **M1** | Pyodide worker + Comlink RPC |
| **M2** | Vertical slice: CSV → Filter → GroupBy → Output |
| **M3** | Import + profiling |
| **M4** | Full v1 node library |
| **M5** | Parameters |
| **M6** | Dexie persistence + versioning |
| **M7** | Jupyter notebook export |
| **M8** | URL/file sharing |
| **M9** | Hardening, perf, polish |

**Rules:**

- Complete the current milestone's **Definition of Done** before starting the next.
- Do not add nodes, features, or stretch goals from later milestones early.
- M2 is the critical path — prioritize end-to-end pipeline correctness over UI polish.
- If a task spans milestones, implement only the portion required for the current one.

---

## Tech stack (confirmed)

| Area | Choice |
|------|--------|
| Build | Vite + TypeScript |
| UI | React 19, Tailwind CSS, shadcn/ui |
| Canvas | React Flow (`@xyflow/react`) |
| State | Zustand (workflow, runtime, ui stores) |
| Python | Pyodide in Web Worker + Comlink |
| Storage | Dexie (IndexedDB) |
| Preview grid | glide-data-grid |
| Code view | CodeMirror 6 |
| Tests | Vitest, React Testing Library, Playwright |
| Package manager | **npm** (`package-lock.json`) |
| CI / host | GitHub Actions → GitHub Pages |

Use native browser APIs where specified (e.g. `CompressionStream` for gzip, not extra libraries).

---

## Repository layout

Follow [`plan/08-repo-structure.md`](./plan/08-repo-structure.md). Key areas:

```
src/app/          Root shell, layout
src/canvas/       React Flow integration
src/nodes/        One file per node type + registry.ts
src/engine/       Topo sort, fingerprints, codegen (main-thread client)
src/worker/       Pyodide kernel (NO React/DOM imports)
src/data/         Dexie repos
src/sharing/      Serialize, compress, URL hash
src/state/        Zustand stores
src/ui/           Panels, dialogs, shadcn components
tests/unit/       Mirrors src/ structure
tests/e2e/        Playwright specs
plan/             Architecture docs (do not move or delete)
```

---

## Architecture rules

### Main thread vs worker

| Main thread | Web Worker (`src/worker/`) |
|-------------|------------------------------|
| React UI, React Flow, Zustand | Pyodide, Pandas, execution loop |
| Lightweight JSON previews | Full DataFrames in `node_<id>` namespace |
| File read → pass bytes to worker | `pd.read_csv` / transforms |
| Comlink client (`kernel-client.ts`) | Comlink server (`kernel.ts`) |

**Never** import React, DOM APIs, or Zustand inside `src/worker/`.

**Never** pass full DataFrames to the main thread — return `head(N)` JSON previews only (cap at 100 rows per plan).

### State boundaries

| Store | Owns | Persisted? |
|-------|------|------------|
| `workflow-store` | Graph, params, selection | Yes (Dexie) |
| `runtime-store` | Per-node status, previews, errors | No |
| `ui-store` | Panel toggles, dialogs | No |

### Execution engine

- Topological sort with cycle detection (Kahn's algorithm).
- Content fingerprints for cache keys; incremental recompute on stale nodes only.
- On node delete: `del namespace["node_<id>"]` and run `gc.collect()`.
- Enable Pandas Copy-on-Write: `pd.options.mode.copy_on_write = True`.
- Worker crash recovery: heartbeat, auto-restart, restore from IndexedDB, re-run pipeline.

### Python helpers

Store helper code in `src/worker/python/helpers.py`. Load via Vite raw import:

```typescript
import helpersPy from './python/helpers.py?raw';
```

### Node contract

Each node in `src/nodes/` exports one `NodeDefinition` registered in `registry.ts`:

- `type`, `label`, `category`, `inputs`, `defaultConfig`
- `validate(config, upstreamSchemas)` → errors
- `compile(config, inputVars, outputVar, params)` → Python snippet string
- `inspectorSchema()` → form field definitions (when applicable)

Use safe `params` dict passing — never string-interpolate untrusted values into Python without validation.

### Expression security

Filter/Derive expressions must be validated via Python `ast.parse()` + AST whitelist before execution. Reject imports, arbitrary calls, and unsafe attribute access. See [`plan/01-architecture.md`](./plan/01-architecture.md).

---

## Coding standards

### General

- **Minimize scope** — smallest correct change; no drive-by refactors.
- **Match existing patterns** — read surrounding code before adding new abstractions.
- **One concern per change** — especially when adding nodes (one file per node type).
- **No over-engineering** — no premature abstractions, excessive error handling, or unused helpers.
- **Comments sparingly** — only for non-obvious business or security logic.

### TypeScript / React

- Functional components and hooks.
- Strict TypeScript; no `any` unless unavoidable (document why).
- Colocate hooks with features (`src/hooks/`).
- shadcn/ui components live under `src/ui/components/` — prefer extending these over one-off styles.
- Follow UX layout from [`plan/UX-guidelines.md`](./plan/UX-guidelines.md): three-panel workspace, bottom preview grid, status colors (green = success, amber = stale, red = error).

### Schema evolution

- Workflow objects include `schemaVersion` (start at `1`).
- Add migration functions when bumping schema version; test migrations in CI.

---

## Testing requirements

See [`plan/10-testing.md`](./plan/10-testing.md).

| Layer | Tool | What to test |
|-------|------|--------------|
| Unit | Vitest (Node) | Node `compile()` / `validate()`, topo-sort, fingerprints, serialize/compress |
| Integration | Vitest **Browser Mode** | Pyodide worker RPC — **not** Node/jsdom |
| E2E | Playwright | Vertical slice (M2), sharing (M8), Pyodide smoke |

**Add unit tests** when implementing node types (M4) and engine modules. **Add E2E** for milestone DoD flows.

Fixtures go in `tests/fixtures/`; demo data in `public/demo/`.

Do not snapshot-test canvas layout or histogram pixels.

---

## Git & workflow

- **Do not commit or push** unless the user explicitly asks.
- **Do not** amend commits, force-push, or skip hooks unless explicitly requested.
- Keep `plan/` docs accurate when implementation reveals necessary plan corrections — propose updates to the user rather than silently diverging.

---

## Common pitfalls (from risk register)

| Risk | Agent must |
|------|------------|
| UI freeze during Python | Keep all Pandas work in the worker |
| Memory OOM | Previews only; CoW; delete worker vars on node removal |
| Large URL shares | gzip + base64url; warn + `.tstudio.json` fallback |
| Worker crash | Heartbeat + restart + IndexedDB restore |
| Expression injection | AST whitelist before eval |
| Skipping milestones | Stop — finish current milestone DoD first |

---

## Verification checklist (before marking work done)

For any milestone or significant change:

1. `npm run lint` passes
2. `npm run typecheck` passes
3. `npm run test:unit` passes (when tests exist)
4. `npm run build` produces static output
5. Behavior matches the milestone **Definition of Done** in [`plan/07-milestones.md`](./plan/07-milestones.md)
6. No backend code, no full DataFrame transfers to main thread, no deferred features added
7. New files follow layout in [`plan/08-repo-structure.md`](./plan/08-repo-structure.md)

---

## Quick decision guide

| Question | Answer |
|----------|--------|
| Add a backend endpoint? | **No** |
| Run Python on main thread? | **No** |
| Embed dataset in share URL? | **No** |
| Add Excel support now? | **No** (deferred) |
| Skip to M4 nodes before M2 slice? | **No** |
| Which milestone am I on? | Check git history / user instruction; default **M0** |
| Commit without being asked? | **No** |
| Where is the node contract? | [`plan/03-domain-model.md`](./plan/03-domain-model.md) |
| Where is the vertical slice spec? | M2 in [`plan/07-milestones.md`](./plan/07-milestones.md) |
