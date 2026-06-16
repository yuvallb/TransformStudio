# Feature: Workflow Switcher ("Open…" menu)

**Goal:** Allow users to navigate away from their current workflow at any time — loading a demo, opening a different saved workflow, or starting fresh — without needing an empty canvas first.

**Depends on:** M6 complete (Dexie persistence, `listWorkflows()`, `newWorkflow()` in store).

**Estimated effort:** 1x

---

## Background & problem statement

The "Start with a demo" overlay (`DemoPicker`) is only shown when the canvas has zero nodes. Once a user starts working there is no in-app path to:

- Open a different saved workflow from IndexedDB
- Load a demo without manually deleting every node first
- Start a blank workflow without going through History → "New workflow"

The History dialog already has a "New workflow" button but it is buried, not discoverable, and gives no access to demos or the full list of saved workflows.

---

## Feature scope

### In scope

1. **"Open…" dropdown menu** in the header, between the logo/name and the History button.
2. **Three sections** in the dropdown:
   - **New** — clear canvas, start fresh (equivalent to current History → "New workflow")
   - **Demos** — the three demo workflows from `DemoPicker` (sales-analysis, customer-join, parameterized-filter)
   - **Recent** — up to 10 saved workflows from IndexedDB, sorted by `updatedAt` descending, with name + relative timestamp; current workflow is checked/highlighted
3. **Unsaved-changes guard** — if the current workflow has no saved version snapshot yet and has been edited, prompt the user before discarding (same pattern as other destructive actions: `confirm()` or a small confirmation dialog).
4. **DemoPicker stays** — the empty-canvas overlay remains for first-time / fresh-workflow state. It is complementary.

### Out of scope (do not add now)

- Renaming workflows from this menu
- Deleting workflows from this menu (separate concern)
- Search or filter of saved workflows
- Workflow thumbnails / previews
- Pagination beyond 10 most recent

---

## UX design

### Header placement

```
[T] Transform Studio — Pipeline name  [Open ▾]  [History]  [Save version]  [Run…]  [Share]  [Export]
```

The button sits left-of-center, grouped with the workflow identity area rather than the action buttons.

### Dropdown anatomy (shadcn `DropdownMenu`)

```
┌─────────────────────────────────┐
│  New workflow           Ctrl+N  │
├─────────────────────────────────┤
│  DEMOS                          │
│  ○ Sales analysis               │
│    CSV → Filter → GroupBy       │
│  ○ Customer join                │
│    Two sources → Join → Select  │
│  ○ Parameterized filter         │
│    Filter with {country} param  │
├─────────────────────────────────┤
│  RECENT                         │
│  ✓ Pipeline v3         just now │
│  ○ Customer analysis   2h ago   │
│  ○ Untitled workflow   Jun 14   │
└─────────────────────────────────┘
```

- Current workflow row: check icon + slightly bold name, non-clickable (or clicking is a no-op with no toast).
- Demo rows: `Sparkles` icon.
- Recent rows: `FileText` icon; timestamp uses a short relative format (`just now`, `3 min ago`, `2h ago`, `Jun 14`).
- Loading state: button disabled + spinner while fetching (demos fetch JSON, recent list is fast IndexedDB read).

### Unsaved-changes guard

Show only when `editCount > 0` AND no version snapshot exists for the current workflow (`listVersions(workflowId)` returns `[]`). Use a simple `<AlertDialog>` (shadcn) with:

- Title: "Unsaved changes"
- Body: "This workflow has no saved version. Open anyway? Any unsaved changes will remain in history."
- Actions: **Cancel** / **Open anyway**

Reuse the same guard for New, Demo, and Recent actions.

---

## File map

| Action | Path |
|--------|------|
| Create | `src/ui/WorkflowSwitcher.tsx` |
| Create | `src/lib/relativeTime.ts` |
| Modify | `src/app/layout/Header.tsx` — add `WorkflowSwitcher` |
| Modify | `src/ui/DemoPicker.tsx` — extract `DEMOS` constant to `src/lib/demos.ts` so both components share it |
| Create | `src/lib/demos.ts` |
| Create | `tests/unit/lib/relativeTime.test.ts` |
| Modify | `tests/e2e/workflow-switcher.spec.ts` (new file) |

No new Zustand stores, no new Dexie tables, no new worker messages.

---

## Step-by-step tasks

### Task 1 — Extract shared demos manifest

Move the `DEMOS` array out of `DemoPicker.tsx` into a dedicated module so `WorkflowSwitcher` can import the same list without duplication.

**Implementation**

- Create `src/lib/demos.ts`:

```typescript
export const DEMOS = [
  {
    id: 'sales-analysis',
    label: 'Sales analysis',
    description: 'CSV → Filter → GroupBy → Output',
    file: `${import.meta.env.BASE_URL}demo/sales-analysis.tstudio.json`,
  },
  {
    id: 'customer-join',
    label: 'Customer join',
    description: 'Two sources → Join → Select → Output',
    file: `${import.meta.env.BASE_URL}demo/customer-join.tstudio.json`,
  },
  {
    id: 'parameterized-filter',
    label: 'Parameterized filter',
    description: 'Filter with {country} parameter',
    file: `${import.meta.env.BASE_URL}demo/parameterized-filter.tstudio.json`,
  },
] as const;

export type Demo = (typeof DEMOS)[number];
```

- Update `DemoPicker.tsx` to import `DEMOS` from `@/lib/demos` instead of defining it inline.

**Acceptance**

- `DemoPicker` renders identically before and after the import change.
- `npm run lint && npm run typecheck` pass.

---

### Task 2 — Relative timestamp helper

**Implementation**

Create `src/lib/relativeTime.ts`:

```typescript
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
```

**Tests** — `tests/unit/lib/relativeTime.test.ts`:

```typescript
import { relativeTime } from '@/lib/relativeTime';

describe('relativeTime', () => {
  const now = new Date('2026-06-15T18:00:00Z').getTime();
  beforeAll(() => vi.setSystemTime(now));
  afterAll(() => vi.useRealTimers());

  it('returns "just now" for < 1 minute', () => {
    expect(relativeTime(new Date(now - 30_000).toISOString())).toBe('just now');
  });
  it('returns minutes for < 1 hour', () => {
    expect(relativeTime(new Date(now - 3 * 60_000).toISOString())).toBe('3 min ago');
  });
  it('returns hours for < 24 hours', () => {
    expect(relativeTime(new Date(now - 2 * 3_600_000).toISOString())).toBe('2h ago');
  });
  it('returns date for older', () => {
    expect(relativeTime('2026-06-14T10:00:00Z')).toMatch(/Jun 14/);
  });
});
```

**Acceptance**

- All four cases pass in `npm run test:unit`.

---

### Task 3 — `WorkflowSwitcher` component

**Implementation**

Create `src/ui/WorkflowSwitcher.tsx`:

- Use shadcn `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuGroup` + `DropdownMenuLabel` + `DropdownMenuSeparator` + `DropdownMenuItem`.
- Use shadcn `AlertDialog` for the unsaved-changes guard.
- State:
  - `recentWorkflows: WorkflowRecord[]` — loaded on dropdown open via `listWorkflows()` (limit 10)
  - `loadingId: string | null` — which item is loading
  - `pendingAction: (() => Promise<void>) | null` — action held while guard dialog is open
- Logic:
  - `openDropdown()` callback fetches recent workflows from IndexedDB each time the menu opens.
  - `guardedOpen(action)` — checks `shouldGuard()`:
    - `shouldGuard()` returns `true` if `editCount > 0 && (await listVersions(workflowId)).length === 0`.
    - If guarded: store `action` in `pendingAction`, open `AlertDialog`.
    - If not guarded: run `action` immediately.
  - `handleNew()` — calls `newWorkflow()`, saves to IndexedDB, resets runtime, toasts.
  - `handleLoadDemo(demo)` — same logic as current `DemoPicker.loadDemo`.
  - `handleLoadRecent(record)` — load workflow + datasets, set runtime, toast.
  - Current workflow item in the recent list: render with `Check` icon, `onClick` is a no-op (or early return).

Key types needed (from `workflow-repo.ts`): `WorkflowRecord` already exported via `@/lib/types`.

**Acceptance**

- New, Demo, and Recent actions each load the correct workflow state.
- Guard dialog appears when `editCount > 0` and no versions exist; does not appear when a version snapshot exists.
- Loading state (spinner) shows on the button while a demo is being fetched.
- Current workflow entry in Recent list is visually distinct and non-actionable.
- `npm run lint && npm run typecheck` pass.

---

### Task 4 — Wire into Header

**Implementation**

In `src/app/layout/Header.tsx`:

- Import `WorkflowSwitcher`.
- Place it in the left section of the header, after the workflow name span:

```tsx
<span className="text-xs text-muted-foreground">— {workflow.name}</span>
<WorkflowSwitcher />
```

- The button label: `Open` with a `ChevronDown` icon, `variant="ghost"` size `"sm"`.
- Register `Ctrl/Cmd + N` shortcut to trigger "New workflow" (add to keyboard shortcuts task or handle here via `useEffect` + `keydown`). Keep in scope only if keyboard shortcuts task (M9 Task 5) is not already handling this.

**Acceptance**

- `WorkflowSwitcher` renders in the header between the workflow name and the History button.
- Clicking "New workflow" from the header matches the existing History → "New workflow" behavior exactly.
- No visual regression in header layout (check at 1280px and 1440px viewport widths).

---

### Task 5 — Remove redundancy in VersionHistory

Now that "New workflow" is first-class in the header, the button inside the History dialog is secondary context. Keep it but reduce visual weight.

**Implementation**

In `src/ui/VersionHistory.tsx`:

- Change the "New workflow" `Button` from `variant="outline"` to `variant="ghost"` to de-emphasize it relative to "Save version".
- No functional changes.

**Acceptance**

- "New workflow" button still works inside the dialog.
- Visual weight is lower than "Save version" button.

---

### Task 6 — Unit tests for WorkflowSwitcher

**Implementation**

Add `tests/unit/ui/WorkflowSwitcher.test.tsx` using React Testing Library + Vitest:

- Mock `listWorkflows` to return two records.
- Mock `listVersions` to return `[]` (unsaved) in guarded tests, and one snapshot in unguarded tests.
- Test: opening dropdown shows "New workflow", demo entries, and mocked recent records.
- Test: clicking a demo calls `loadWorkflowState` and `saveWorkflow`.
- Test: clicking a recent workflow calls `loadWorkflowState`.
- Test: guard dialog shown when clicking New with `editCount > 0` and no versions.
- Test: guard dialog not shown when a version snapshot exists.
- Test: current workflow row is not clickable (or click has no side effect).

**Acceptance**

- All cases pass in `npm run test:unit`.

---

### Task 7 — E2E test

**Implementation**

Create `tests/e2e/workflow-switcher.spec.ts`:

```typescript
test('Open menu → New workflow clears canvas', async ({ page }) => {
  // Load the demo via DemoPicker first to populate the canvas
  // Then click Open → New workflow
  // Verify DemoPicker overlay reappears (nodeCount === 0)
});

test('Open menu → Demo loads and runs', async ({ page }) => {
  // Click Open → Sales analysis
  // Verify nodes appear on canvas
  // Run pipeline → Output node turns green
});

test('Open menu → Recent shows saved workflow', async ({ page }) => {
  // Load Sales analysis demo (saved to IndexedDB)
  // Load Customer join demo (replaces current)
  // Open menu → Recent → click Sales analysis entry
  // Verify correct nodes are present
});
```

Use `data-testid` attributes on:
- The Open trigger button: `data-testid="workflow-switcher-trigger"`
- Each demo item: `data-testid="demo-item-{id}"`
- Each recent item: `data-testid="recent-item-{workflowId}"`
- The "New workflow" item: `data-testid="new-workflow-item"`
- The guard dialog confirm button: `data-testid="guard-confirm"`

**Acceptance**

- All three E2E scenarios pass against the local dev server (`npm run dev`).
- No Playwright flakiness (await network idle after demo fetch).

---

### Task 8 — Documentation

**Implementation**

- Update `README.md` under the "Quick start" / Flow A section: add a line explaining that the `Open ▾` menu provides access to demos and recent workflows at any time.
- Update `plan/06-features.md` section **F9: Persistence & autosave** — add a "Workflow switcher" subsection describing the menu.
- If a `CHANGELOG.md` or release notes section exists, note the addition.

**Acceptance**

- README accurately describes the Open menu.
- Plan doc is internally consistent with implementation.

---

## Verification checklist

Before marking this feature done:

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test:unit` passes (includes `relativeTime` and `WorkflowSwitcher` unit tests)
- [ ] `npm run test:e2e` passes (includes `workflow-switcher.spec.ts`)
- [ ] `npm run build` produces static output with no type errors
- [ ] Open menu renders at both 1280px and 1440px without overflow
- [ ] Keyboard shortcut `Ctrl/Cmd + N` triggers New workflow
- [ ] `DemoPicker` overlay still appears on empty canvas (no regression)
- [ ] `VersionHistory` "New workflow" still works (no regression)
- [ ] Guard dialog fires when it should and is skipped when it should not
- [ ] No backend calls, no full DataFrame transfers, no deferred features added
