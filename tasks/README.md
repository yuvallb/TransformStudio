# Transform Studio — Milestone Tasks

Detailed implementation task breakdown for each delivery milestone. These documents expand [`plan/07-milestones.md`](../plan/07-milestones.md) with file-level guidance, testing requirements, and acceptance criteria.

## How to use

1. **Follow strict order:** M0 → M1 → … → M9. Do not start a milestone until the previous one's acceptance criteria are met.
2. **Plan docs are authoritative:** When tasks and plan docs disagree, follow [`plan/`](../plan/) until the user explicitly changes a decision.
3. **Mark progress:** Check off tasks in each milestone file as they are completed.
4. **Verify before advancing:** Run the verification checklist at the bottom of each milestone doc.

## Milestone index

| Milestone | Document | Goal | README flow |
|-----------|----------|------|-------------|
| **M0** | [M0-project-setup.md](./M0-project-setup.md) | Runnable skeleton, CI, GitHub Pages | — |
| **M1** | [M1-pyodide-kernel.md](./M1-pyodide-kernel.md) | Pyodide worker + Comlink RPC | — |
| **M2** | [M2-vertical-slice.md](./M2-vertical-slice.md) | CSV → Filter → GroupBy → Output (critical path) | Flow B |
| **M3** | [M3-import-profiling.md](./M3-import-profiling.md) | Robust import + data profiling | Flow A |
| **M4** | [M4-node-library.md](./M4-node-library.md) | Full v1 transform node library | — |
| **M5** | [M5-parameters.md](./M5-parameters.md) | Parameterized workflows | Flow D |
| **M6** | [M6-persistence-versioning.md](./M6-persistence-versioning.md) | Dexie autosave + version history | Flow F |
| **M7** | [M7-export-notebook.md](./M7-export-notebook.md) | Jupyter notebook + polished script export | Flow E |
| **M8** | [M8-sharing.md](./M8-sharing.md) | URL hash + file sharing (no backend) | Flow C |
| **M9** | [M9-hardening-launch.md](./M9-hardening-launch.md) | Performance, polish, demo workflows | All |

## Delivery timeline (relative effort)

```
M0 (1x) → M1 (2x) → M2 (4x) → M3 (2x) → M4 (4x) → M5 (2x) → M6 (3x) → M7 (2x) → M8 (2x) → M9 (3x)
```

M2 is the **critical path** — prioritize end-to-end pipeline correctness over UI polish until M2 DoD is met.

## Cross-cutting constraints (every milestone)

- **Zero backend** — all logic runs in the browser.
- **Pyodide in a Web Worker** — never on the main thread.
- **Workflow ≠ data** — shared URLs and exports contain logic + params only.
- **Preview cap** — max 100 rows cross the worker boundary.
- **GitHub Pages** — Vite `base: '/TransformStudio/'`.
- **Deferred features** — Excel, dbt/SQL, custom Python node, Arrow IPC (see [`plan/README.md`](../plan/README.md)).

## Verification commands (from M0 onward)

```bash
npm run lint
npm run typecheck
npm run test:unit        # when tests exist
npm run test:integration # from M1 (Vitest Browser Mode)
npm run test:e2e         # from M2
npm run build
```

## Reference documents

| Topic | Plan doc |
|-------|----------|
| Architecture & thread model | [`plan/01-architecture.md`](../plan/01-architecture.md) |
| Tech stack | [`plan/02-tech-stack.md`](../plan/02-tech-stack.md) |
| Domain model & node contract | [`plan/03-domain-model.md`](../plan/03-domain-model.md) |
| Execution engine | [`plan/04-execution-engine.md`](../plan/04-execution-engine.md) |
| Node library | [`plan/05-node-library.md`](../plan/05-node-library.md) |
| Feature specs | [`plan/06-features.md`](../plan/06-features.md) |
| Repo layout | [`plan/08-repo-structure.md`](../plan/08-repo-structure.md) |
| Testing strategy | [`plan/10-testing.md`](../plan/10-testing.md) |
| UX layout | [`plan/UX-guidelines.md`](../plan/UX-guidelines.md) |
