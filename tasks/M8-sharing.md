# M8: Sharing

**Goal:** Share workflows via URL and file export without any backend.

**Prerequisites:** M6 complete (persistence helps testing; serialization is independent).

**Estimated effort:** 2x

**README flow:** Flow C

---

## Task 1: Workflow serializer

### Implementation

- Create `src/sharing/serialize.ts`
- `serializeWorkflow(workflow): string` — JSON.stringify with stable key order
- **Strip:** runtime state, previews, errors, selection, UI state
- **Include:** id, name, schemaVersion, nodes, edges, params, createdAt, updatedAt
- **Exclude:** dataset bytes, IndexedDB references, preview payloads
- `deserializeWorkflow(json): Workflow` — validate schemaVersion, run migrations

---

## Task 2: gzip compress + base64url encode

### Implementation

- Create `src/sharing/compress.ts`
- Use native **CompressionStream** API (no pako):

```typescript
async function compressJson(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const cs = new CompressionStream('gzip');
  // write bytes, read compressed ArrayBuffer
  // base64url encode: replace +/= for URL safety
}
```

- `decompressToJson(encoded): Promise<string>` — reverse pipeline
- Round-trip must be lossless

---

## Task 3: URL hash read/write

### Implementation

- Create `src/sharing/url.ts`
- Write: `window.location.hash = 'w=' + encoded`
- Read on app load: parse `#w=...`, decompress, deserialize
- If hash present on boot: replace current workflow (prompt if unsaved changes — optional)
- `copyShareUrl()` — full URL to clipboard

---

## Task 4: Size guard and fallback

### Implementation

Per [`plan/06-features.md`](../plan/06-features.md):

| Encoded size | Action |
|--------------|--------|
| < ~6 KB | Silent URL share |
| 6–50 KB | URL share with info toast |
| > 50 KB | Warning modal; recommend `.tstudio.json` file export |

Measure encoded string length before writing hash.

---

## Task 5: `.tstudio.json` file export/import

### Implementation

- Export: uncompressed JSON download (`application/json`)
- Import: file picker → parse → validate → hydrate workflow store
- File extension: `.tstudio.json`
- Include in Share dialog as fallback

---

## Task 6: Share UI

### Implementation

- `src/ui/ShareDialog.tsx`:
  - **Copy link** button (primary)
  - Shows encoded size estimate
  - Fallback: **Download .tstudio.json**
  - Import shared file option
- Header **Share** button opens dialog
- Success toast: "Link copied to clipboard"

---

## Task 7: Shared workflow dataset placeholder

### Implementation

- When workflow loaded from URL/file without local datasets:
  - Source nodes show **"Import your dataset"** placeholder on canvas
  - Source node footer: amber stale state
  - Preview empty until user uploads file
- After upload: normal import flow, pipeline runs

---

## Task 8: Integration with params and schema version

### Implementation

- Shared URLs include params with defaults
- Recipient can Run with parameters immediately after importing data
- `schemaVersion` migration on deserialize protects old links after schema bumps

---

## Testing requirements

| Layer | What to test | File |
|-------|--------------|------|
| Unit | Serialize round-trip (no data leak) | `tests/unit/sharing/serialize.test.ts` |
| Unit | Assert serialized JSON has no `ArrayBuffer`, no preview fields | same |
| Unit | Compress/decompress round-trip | `tests/unit/sharing/compress.test.ts` |
| Unit | base64url encoding URL-safe (no `+`, `/`, `=`) | same |
| Unit | URL hash write/read | `tests/unit/sharing/url.test.ts` |
| Unit | Size guard triggers fallback threshold | `tests/unit/sharing/size-guard.test.ts` |
| E2E | Full sharing round-trip | `tests/e2e/sharing.spec.ts` |

### E2E sharing spec steps

1. Build simple pipeline (source + filter)
2. Click Share → copy URL
3. Open URL in new browser context/tab
4. Verify nodes/edges restored on canvas
5. Source shows import placeholder
6. Upload CSV → pipeline runs → preview populated

### Data leak test

```typescript
const json = serializeWorkflow(workflowWithDataset);
expect(json).not.toMatch(/ArrayBuffer/);
expect(JSON.parse(json)).not.toHaveProperty('datasets');
```

---

## Acceptance criteria

### Definition of Done

- [ ] Share workflow → copy URL → open in new tab → workflow restored on canvas.
- [ ] Recipient uploads dataset → pipeline runs successfully.
- [ ] Shared payload contains **no** dataset bytes or preview data.
- [ ] Large workflow (>50 KB encoded) shows warning and offers `.tstudio.json` download.
- [ ] `.tstudio.json` import restores workflow identically.
- [ ] Params preserved in shared workflow.
- [ ] README **Flow C** works end-to-end.

### Manual verification

1. Share minimal pipeline — URL length reasonable, works in Chrome/Firefox
2. Share complex pipeline (many nodes) — fallback triggers gracefully
3. Open shared URL incognito — no datasets, import prompt visible
4. Compare shared workflow graph with original — identical structure

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

- Backend short-link service
- Embedding datasets in URLs (never)
- Real-time collaborative editing
- QR codes or social share metadata
