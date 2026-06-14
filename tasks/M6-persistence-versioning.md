# M6: Persistence + Versioning

**Goal:** Workflows and datasets survive page reload; users can track, revert, and fork changes.

**Prerequisites:** M5 complete.

**Estimated effort:** 3x

**README flow:** Flow F

---

## Task 1: Dexie database schema

### Implementation

- Install `dexie`
- Create `src/data/db.ts`:

```typescript
class TransformStudioDB extends Dexie {
  workflows!: Table<WorkflowRecord>;
  datasets!: Table<DatasetRecord>;
  versions!: Table<VersionSnapshot>;
}
```

**Tables:**

| Store | Key | Contents |
|-------|-----|----------|
| `workflows` | `id` | Current workflow graphs |
| `datasets` | `id` | Raw imported file bytes |
| `versions` | `id` | Immutable snapshots |

Types from [`plan/03-domain-model.md`](../plan/03-domain-model.md):

```typescript
type DatasetRecord = {
  id: string;
  workflowId: string;
  nodeId: string;
  filename: string;
  mimeType: string;
  data: ArrayBuffer;
  importedAt: string;
};

type VersionSnapshot = {
  id: string;
  workflowId: string;
  parentId: string | null;
  message: string;
  workflow: Workflow;
  createdAt: string;
};
```

---

## Task 2: Repository layer

### Implementation

- `src/data/workflow-repo.ts` — save, load, list, delete workflows
- `src/data/dataset-repo.ts` — save/load bytes by workflowId + nodeId
- `src/data/version-repo.ts` — create, list, get snapshot

Keep Dexie calls out of React components — use repos + hooks.

---

## Task 3: Autosave (debounced)

### Implementation

- `src/hooks/useWorkflow.ts`:
  - Subscribe to `workflow-store` changes
  - Debounce 2 seconds → persist to Dexie
  - Save indicator in header: "Saving…" / "Saved"
- Persist: nodes, edges, params, positions, name, schemaVersion
- Do **not** persist runtime state

---

## Task 4: Restore on page load

### Implementation

- On app init:
  1. Load most recent workflow from Dexie (or create default empty)
  2. Hydrate `workflow-store`
  3. Load associated `DatasetRecord`s from IndexedDB
  4. Re-pass file bytes to worker for each source node
  5. Trigger full pipeline execution
- Handle missing/corrupt data gracefully (new workflow fallback)

---

## Task 5: Store imported file bytes

### Implementation

- On CSV/JSON import (update M2/M3 flow):
  - Save `ArrayBuffer` to `datasets` table
  - Link via `workflowId` + `nodeId`
- On source node delete: remove associated dataset record + worker cleanup
- On revert/fork: datasets copied or re-linked as needed

---

## Task 6: Version snapshots

### Implementation

- `src/versioning/snapshot.ts`:
  - `createSnapshot(workflow, message, parentId?)` — deep clone workflow
  - `revertToSnapshot(snapshotId)` — load workflow into editor
  - `forkFromSnapshot(snapshotId)` — new workflow ID from snapshot
- **Manual save:** Header "Save version" → prompt for message → create snapshot
- **Auto snapshot (optional):** every N minutes or every N edits — configurable constant

Before revert: auto-save current state as snapshot (safety net).

---

## Task 7: Version history panel

### Implementation

- `src/ui/VersionHistory.tsx`:
  - List snapshots: timestamp, message, parent link
  - Actions: **Revert**, **Fork**, **Compare**
  - New workflow button clears canvas and creates fresh ID

### Files

| Action | Path |
|--------|------|
| Create | `src/ui/VersionHistory.tsx` |

---

## Task 8: JSON diff compare

### Implementation

- `src/versioning/diff.ts`:
  - Compare two `Workflow` objects
  - Return: `{ added: NodeId[], removed: NodeId[], modified: NodeId[], unchanged: NodeId[] }`
  - Config-level diff for modified nodes: `{ field, oldValue, newValue }[]`

---

## Task 9: Visual DAG diff mode

### Implementation

Per [`plan/06-features.md`](../plan/06-features.md) F7:

- Canvas overlay when comparing two versions:
  - **Green:** added nodes
  - **Red dashed:** removed nodes
  - **Yellow:** modified config/params
  - **Gray:** unchanged
- Inspector side-by-side property diff for modified (yellow) nodes
- Exit compare mode returns to normal editing

---

## Task 10: Worker crash recovery with persistence

### Implementation

Extend M1 crash recovery in `usePyodide.ts`:

1. Detect crash
2. Toast: "Python runtime crashed. Restarting…"
3. Restart worker
4. Restore workflow from Dexie (already in memory or re-load)
5. Re-import datasets from IndexedDB to worker
6. Re-execute pipeline incrementally

---

## Task 11: Schema migrations

### Implementation

- `CURRENT_SCHEMA_VERSION = 1` in constants
- On load: if `workflow.schemaVersion < CURRENT`, run migration chain
- `src/data/migrations/v1-to-v2.ts` stub (no-op until needed)
- Unit test migration round-trip when v2 added

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | `snapshot.ts` create/revert/fork | `tests/unit/versioning/snapshot.test.ts` |
| Unit | `diff.ts` added/removed/modified detection | `tests/unit/versioning/diff.test.ts` |
| Unit | Workflow repo save/load round-trip | `tests/unit/data/workflow-repo.test.ts` |
| Integration | Import file → reload page → data restored | `tests/integration/persistence.test.ts` |
| E2E | Save version → edit → revert | `tests/e2e/versioning.spec.ts` |
| E2E | Flow F end-to-end | same |

### Persistence integration test

1. Create workflow with source + filter in browser test
2. Save to IndexedDB (fake-indexeddb or real in Browser Mode)
3. Simulate reload — hydrate store
4. Assert nodes/edges/params match

---

## Acceptance criteria

### Definition of Done

- [ ] Reload page → workflow and imported data restored, pipeline re-executed automatically.
- [ ] Save version → make changes → revert → previous graph state restored.
- [ ] Fork creates independent workflow with new ID from snapshot.
- [ ] Compare shows visual diff on canvas with color-coded nodes.
- [ ] Modified node inspector shows side-by-side config diff.
- [ ] Autosave persists edits within ~2s of last change.
- [ ] Worker crash recovery restores from IndexedDB and re-runs pipeline.
- [ ] README **Flow F** works end-to-end.
- [ ] "New workflow" clears canvas and starts fresh persisted record.

### Manual verification

1. Build pipeline, import CSV, reload — preview matches pre-reload
2. Save version "v1", add Join node, revert — Join gone
3. Fork from v1 — two workflows in storage, independent edits
4. Compare v1 vs current — colors match diff algorithm

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

- Multi-user collaboration
- Full git-style branch DAG (v1 uses linked list)
- Cloud sync
- Sharing URLs (M8) — but workflow schema must be share-ready
