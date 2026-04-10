# Implementation Tasks: Deduplicated Product Image Uploads with Gallery Auto-Sync

Spec: `product-image-dedup.md`  
Plan: `product-image-dedup-plan.md`

Work through these tasks in order. Each task maps to exactly one surgical change in the codebase. Check off each item before moving to the next.

---

## Phase 1 — Helper & State (foundation, no UI impact yet)

- [X] **1.1** Open `src/components/features/products/product-form.tsx`.

- [X] **1.2** After the import block and before the first component or type definition (~line 120), add the `computeFileHash` helper:
  ```ts
  async function computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  ```
  Confirm it is a module-level function (not inside any component).

- [X] **1.3** Locate the `galleryImages` state declaration inside `ProductForm` (~line 907):
  ```ts
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  ```
  Add `galleryHashes` state on the next line:
  ```ts
  const [galleryHashes, setGalleryHashes] = useState<Set<string>>(new Set());
  ```

- [X] **1.4** Verify the project compiles with no TypeScript errors after tasks 1.2 and 1.3 before continuing.

---

## Phase 2 — Update `GalleryUploadCell`

- [X] **2.1** Locate the `GalleryUploadCell` function definition (~line 450). Update its props destructuring and inline type from:
  ```ts
  function GalleryUploadCell({ onUpload }: { onUpload: (url: string) => void })
  ```
  to:
  ```ts
  function GalleryUploadCell({
    onUpload,
    existingHashes,
  }: {
    onUpload: (url: string, hash: string) => void;
    existingHashes: Set<string>;
  })
  ```

- [X] **2.2** Inside `GalleryUploadCell`, locate the `handleFile` async function (~line 454). Replace the entire body with:
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
  Confirm:
  - `computeFileHash` is called before `fetch`.
  - Early return on hash match is inside the `try` block so `finally` still resets `uploading`.
  - `onUpload` receives both `url` and `hash`.

- [X] **2.3** Verify TypeScript: `GalleryUploadCell` should now show type errors at its two call sites (lines ~1665 and ~1685) because the props no longer match. This is expected — fix in Phase 3.

---

## Phase 3 — Update `GalleryUploadCell` Call Sites

- [X] **3.1** Locate the first `GalleryUploadCell` usage at ~line 1665 (inside the empty-state branch of the gallery tab). Replace:
  ```tsx
  <GalleryUploadCell onUpload={(url) => setGalleryImages((g) => [...g, url])} />
  ```
  with:
  ```tsx
  <GalleryUploadCell
    existingHashes={galleryHashes}
    onUpload={(url, hash) => {
      setGalleryImages((g) => (g.includes(url) ? g : [...g, url]));
      setGalleryHashes((h) => new Set([...h, hash]));
    }}
  />
  ```

- [X] **3.2** Locate the second `GalleryUploadCell` usage at ~line 1685 (inside the image grid, rendered after the last image thumbnail). Replace with the same JSX as task 3.1 (identical props).

- [X] **3.3** Confirm both call sites now pass `existingHashes` and the new two-argument `onUpload`. TypeScript errors from task 2.3 should be resolved.

- [X] **3.4** Verify the project compiles cleanly after Phase 3.

---

## Phase 4 — Auto-Sync Main Product Image to Gallery

- [X] **4.1** Locate the `ProductImagePicker` usage on the Details tab at ~line 1478–1481:
  ```tsx
  <ProductImagePicker
    value={imageUrl}
    onSelect={(url) => setValue("imageUrl", url)}
    onRemove={() => setValue("imageUrl", null)}
    galleryImages={galleryImages}
  />
  ```

- [X] **4.2** Update the `onSelect` prop only (leave all other props unchanged):
  ```tsx
  onSelect={(url) => {
    setValue("imageUrl", url);
    setGalleryImages((g) => (g.includes(url) ? g : [...g, url]));
  }}
  ```

- [X] **4.3** Confirm the `onRemove` prop is unchanged — removing the main product image should NOT remove it from the gallery.

- [X] **4.4** Verify TypeScript compiles cleanly. No other `ProductImagePicker` usages (e.g., in variant rows) should be changed.

---

## Phase 5 — Server-Side URL Deduplication

- [X] **5.1** Open `src/app/api/products/[id]/gallery/route.ts`.

- [X] **5.2** Locate the `PUT` handler. Find the block that starts at ~line 42:
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

- [X] **5.3** Replace it with:
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

- [X] **5.4** Confirm the `unique` array preserves the first occurrence of each URL and that `sortOrder` is re-derived from the deduplicated index.

- [X] **5.5** Verify the file compiles with no TypeScript errors.

---

## Phase 6 — Manual QA Checklist

Run through each scenario in the browser after completing all code changes.

### Gallery tab — content dedup
- [ ] **6.1** Navigate to any product edit page. Open the Gallery tab.
- [ ] **6.2** Upload an image. Confirm it appears in the gallery grid.
- [ ] **6.3** Click "Add Image" again and select the **same file**. Confirm:
  - No upload request is made (check Network tab in DevTools).
  - A toast appears: `"This image is already in the gallery"`.
  - The gallery grid does not gain a duplicate entry.

### Gallery tab — URL dedup
- [ ] **6.4** Confirm there is no way to add the same URL twice through normal UI interaction (the `g.includes(url)` guard makes this impossible to trigger manually, but verify the gallery grid never shows duplicates after multiple upload actions).

### Details tab — main image auto-syncs to gallery
- [ ] **6.5** Navigate to the Details tab. Click the main product image slot to open the picker.
- [ ] **6.6** Upload a **new** image. Confirm:
  - The image appears in the main product image slot.
  - Switch to the Gallery tab — the same image is present there.
  - The gallery tab badge count has incremented by 1.
- [ ] **6.7** Click the main product image slot again. Select an **existing gallery image** from the "From Gallery" section in the picker. Confirm:
  - The main product image updates.
  - The gallery tab does **not** gain a duplicate entry.
  - Gallery count is unchanged.

### Save and reload
- [ ] **6.8** Save the product (click "Save Changes").
- [ ] **6.9** Reload the page. Confirm:
  - The gallery images are persisted correctly with no duplicates.
  - The main product image is correct.

### Variant images — not affected
- [ ] **6.10** Navigate to the Variants tab. Upload or select an image for a variant. Confirm:
  - The variant image is set correctly.
  - The gallery tab is **not** affected (no auto-sync for variant images).

---

## Phase 7 — Cleanup & Review

- [X] **7.1** Run the full TypeScript compiler check (`npx tsc --noEmit`) and confirm zero errors.
- [X] **7.2** Run the project linter if configured (`npm run lint` or equivalent) and fix any warnings in modified files.
- [X] **7.3** Review the final diff. Confirm only these two files were modified:
  - `src/components/features/products/product-form.tsx`
  - `src/app/api/products/[id]/gallery/route.ts`
- [X] **7.4** Confirm no new files were created, no imports were added, and no schema files were touched.
- [X] **7.5** Mark this feature complete and remove this checklist from the active work queue.

---

## Quick Reference — Change Map

| Task | File | What changes |
|---|---|---|
| 1.2 | `product-form.tsx` | Add `computeFileHash` helper |
| 1.3 | `product-form.tsx` | Add `galleryHashes` state |
| 2.1–2.2 | `product-form.tsx` | Update `GalleryUploadCell` props + `handleFile` |
| 3.1–3.2 | `product-form.tsx` | Update both `GalleryUploadCell` call sites |
| 4.2 | `product-form.tsx` | Update `ProductImagePicker` `onSelect` on Details tab |
| 5.3 | `gallery/route.ts` | Add URL dedup filter before DB insert |
