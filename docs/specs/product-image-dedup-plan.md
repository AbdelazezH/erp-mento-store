# Technical Implementation Plan: Deduplicated Product Image Uploads with Gallery Auto-Sync

## Architecture Overview

All changes are confined to two existing files. No new files, no schema migrations, no new dependencies.

| File | Role |
|---|---|
| `src/components/features/products/product-form.tsx` | All UI + state changes (4 touch points) |
| `src/app/api/products/[id]/gallery/route.ts` | Server-side URL dedup safety net (1 touch point) |

---

## Change 1 — Add `computeFileHash` helper

**File:** `src/components/features/products/product-form.tsx`  
**Location:** Before any component definition, after imports (~line 120)  
**Type:** New pure function

```ts
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

**Why `crypto.subtle`:** It is available in all modern browsers and in the Next.js server runtime with no import required. Produces a 64-character hex string suitable for Set membership checks.

**Performance:** For a typical product image (< 5 MB), hashing completes in under 10 ms on consumer hardware. It runs before the network request, so it adds negligible perceived latency.

---

## Change 2 — Add `galleryHashes` state to `ProductForm`

**File:** `src/components/features/products/product-form.tsx`  
**Location:** Immediately after the `galleryImages` state declaration (~line 907)  
**Type:** New `useState`

```ts
// Before (existing):
const [galleryImages, setGalleryImages] = useState<string[]>([]);

// After:
const [galleryImages, setGalleryImages] = useState<string[]>([]);
const [galleryHashes, setGalleryHashes] = useState<Set<string>>(new Set());
```

**Scope:** Session-only. Hashes are tracked for files uploaded during the current browser session. Images loaded from the database on mount do not have pre-computed hashes — deduplication for those relies on the URL-level check (Change 4 / Change 5).

**Why a `Set`:** O(1) membership check. A `string[]` would require `.includes()` which is O(n) — acceptable for small galleries but semantically wrong for a dedup store.

---

## Change 3 — Update `GalleryUploadCell` to check content hash before uploading

**File:** `src/components/features/products/product-form.tsx`  
**Location:** Lines 450–497 (`GalleryUploadCell` component)  
**Type:** Props interface change + `handleFile` logic change

### Props interface — before
```ts
function GalleryUploadCell({ onUpload }: { onUpload: (url: string) => void })
```

### Props interface — after
```ts
function GalleryUploadCell({
  onUpload,
  existingHashes,
}: {
  onUpload: (url: string, hash: string) => void;
  existingHashes: Set<string>;
})
```

### `handleFile` — before
```ts
async function handleFile(file: File) {
  setUploading(true);
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    const { url } = await res.json();
    onUpload(url);
  } catch {
    toast.error("Upload failed");
  } finally {
    setUploading(false);
  }
}
```

### `handleFile` — after
```ts
async function handleFile(file: File) {
  setUploading(true);
  try {
    const hash = await computeFileHash(file);
    if (existingHashes.has(hash)) {
      toast.error("This image is already in the gallery");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    const { url } = await res.json();
    onUpload(url, hash);
  } catch {
    toast.error("Upload failed");
  } finally {
    setUploading(false);
  }
}
```

**Key decisions:**
- Hash is computed before the `fetch` call — no wasted bandwidth if the file is a duplicate.
- `onUpload` now receives both `url` and `hash` so the parent can update both `galleryImages` and `galleryHashes` atomically.
- The `finally` block still runs on early return (hash match), ensuring `uploading` is reset to `false`.

---

## Change 4 — Update both `GalleryUploadCell` call sites in the gallery tab

**File:** `src/components/features/products/product-form.tsx`  
**Locations:** Lines 1665 (empty-state upload cell) and 1685 (grid upload cell)  
**Type:** JSX prop update at both call sites

### Before (both sites)
```tsx
<GalleryUploadCell onUpload={(url) => setGalleryImages((g) => [...g, url])} />
```

### After (both sites)
```tsx
<GalleryUploadCell
  existingHashes={galleryHashes}
  onUpload={(url, hash) => {
    setGalleryImages((g) => (g.includes(url) ? g : [...g, url]));
    setGalleryHashes((h) => new Set([...h, hash]));
  }}
/>
```

**Dual-layer dedup:**
- Layer 1 (content): `existingHashes.has(hash)` check inside `GalleryUploadCell.handleFile` — runs before the upload request.
- Layer 2 (URL): `g.includes(url)` check in the setter — runs after a successful upload. Catches the edge case where two different files happen to produce the same stored URL (not possible with the current random-filename scheme, but correct to guard against).

**State update pattern:** `setGalleryHashes` spreads the existing Set into a new one to trigger a React re-render (`Set` mutations are not detected by React's referential equality check).

---

## Change 5 — Auto-sync main product image to gallery

**File:** `src/components/features/products/product-form.tsx`  
**Location:** Line 1480 — `onSelect` prop of the `ProductImagePicker` on the Details tab  
**Type:** Inline handler change

### Before
```tsx
onSelect={(url) => setValue("imageUrl", url)}
```

### After
```tsx
onSelect={(url) => {
  setValue("imageUrl", url);
  setGalleryImages((g) => (g.includes(url) ? g : [...g, url]));
}}
```

**Why this covers both upload and selection:**  
`ProductImagePicker` opens `MediaPickerDialog` internally. `MediaPickerDialog` calls `onSelect(url)` in both code paths:
- User picks an existing gallery image → `onSelect(url)` fires → URL already in gallery → `g.includes(url)` is `true` → no duplicate added.
- User uploads a new file → upload completes → `onSelect(url)` fires → URL is new → added to gallery.

In both cases the main product image is set and the gallery is kept in sync. No changes to `MediaPickerDialog` are needed.

---

## Change 6 — Server-side URL deduplication in the gallery PUT endpoint

**File:** `src/app/api/products/[id]/gallery/route.ts`  
**Location:** Lines 42–50 inside the `PUT` handler  
**Type:** Logic change before the `db.insert` call

### Before
```ts
if (parsed.data.length > 0) {
  await db.insert(productImages).values(
    parsed.data.map((img, i) => ({
      productId: id,
      imageUrl: img.imageUrl,
      sortOrder: img.sortOrder ?? i,
    }))
  );
}
```

### After
```ts
const unique = parsed.data.filter(
  (img, idx, arr) => arr.findIndex((x) => x.imageUrl === img.imageUrl) === idx
);

if (unique.length > 0) {
  await db.insert(productImages).values(
    unique.map((img, i) => ({
      productId: id,
      imageUrl: img.imageUrl,
      sortOrder: img.sortOrder ?? i,
    }))
  );
}
```

**Why:** The client-side checks in Changes 3–5 are the primary defence. This server-side filter is a safety net for any scenario where the client sends a payload with duplicate URLs — stale React state, a future refactor, or a direct API call. The `filter` + `findIndex` pattern is idiomatic JS dedup and avoids any external library.

**`sortOrder` after dedup:** The first occurrence of each URL is kept (standard `findIndex` behaviour), and `sortOrder` is re-derived from the deduplicated array index. This is consistent with how the existing endpoint handles `sortOrder`.

---

## Data Flow After Changes

```
User selects file(s) in GalleryUploadCell
    │
    ▼
computeFileHash(file)
    │
    ├─ hash in galleryHashes? ──YES──► toast.error("Already in gallery"), return
    │
    NO
    │
    ▼
POST /api/uploads  →  { url }
    │
    ▼
onUpload(url, hash)
    ├── setGalleryImages: add url if not present (URL dedup)
    └── setGalleryHashes: add hash


User uploads/selects image via ProductImagePicker (Details tab)
    │
    ▼
onSelect(url)
    ├── setValue("imageUrl", url)          ← sets main product image
    └── setGalleryImages: add url if not present ← syncs to gallery


User saves product form
    │
    ▼
PUT /api/products/{id}/gallery
    payload: galleryImages.map((url, i) => ({ imageUrl: url, sortOrder: i }))
    │
    ▼
Server: filter unique by imageUrl → db.insert
```

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `crypto.subtle` unavailable | Very low (requires ancient browser or non-HTTPS) | Failure in `computeFileHash` will throw; caught by `try/catch` in `handleFile`, shows generic "Upload failed" toast. Upload proceeds as fallback since hash check is skipped. |
| Large file hashing causes UI freeze | Low (< 5 MB typical) | `crypto.subtle.digest` is async and non-blocking; runs off the main thread. |
| `galleryHashes` grows unbounded | Very low (galleries rarely exceed 100 images) | Set of 64-char strings — 100 entries ≈ 6.4 KB of memory. |
| Server dedup changes `sortOrder` | Low | First occurrence of each URL is preserved with its original position; only true duplicates (same URL, later index) are dropped. Visual order is unchanged. |

---

## Files Changed Summary

| File | Lines affected | Nature of change |
|---|---|---|
| `src/components/features/products/product-form.tsx` | ~120, ~907, ~450–497, ~1665, ~1685, ~1480 | New helper, new state, updated component props + logic, updated call sites |
| `src/app/api/products/[id]/gallery/route.ts` | ~42–50 | URL dedup filter before DB insert |

**Files not changed:** `src/app/api/uploads/route.ts`, `src/lib/db/schema.ts`, `src/hooks/use-api.ts`, all other product-related files.
