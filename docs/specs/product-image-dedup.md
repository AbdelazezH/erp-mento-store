# Feature Spec: Deduplicated Product Image Uploads with Gallery Auto-Sync

## Overview

This feature addresses three gaps in the current product image upload system:

1. The same image file can be uploaded multiple times, producing redundant files on disk and duplicate entries in the gallery.
2. The same image URL can be added to `galleryImages` state more than once, causing visual duplicates in the gallery grid.
3. When a user uploads or selects an image for the main product image slot on the Details tab, that image is not automatically added to the gallery — so the gallery and the product image fall out of sync.

---

## Goals

- Prevent content-level duplicate uploads (same file bytes, different filename).
- Prevent URL-level duplicate entries in the gallery state and database.
- Automatically add any image set as the main product image to the gallery, so all product images are always visible in one place.
- Preserve the single-slot constraint on the main product image field (`imageUrl`).

## Non-Goals

- No changes to the database schema or migrations.
- No new npm dependencies.
- No changes to variant image upload behavior (variant images do not sync to gallery).
- No changes to `MediaPickerDialog` internals (it is shared between main product image and variant image pickers).
- No server-side content-hash storage or image deduplication across different products.

---

## User Stories

### US-1: Duplicate file upload is blocked
**As a** product manager uploading images,  
**I want** the system to detect if I accidentally select the same image file twice,  
**So that** I don't end up with duplicate images cluttering the gallery.

**Acceptance criteria:**
- When a user selects a file in `GalleryUploadCell` whose content is identical to a file already uploaded in the current session, no upload request is made to the server.
- A toast notification is shown: `"This image is already in the gallery"`.
- The gallery state is unchanged.

### US-2: Same URL cannot appear twice in the gallery
**As a** product manager,  
**I want** the gallery to never show the same image twice,  
**So that** the gallery grid is clean and accurate.

**Acceptance criteria:**
- If an image URL is already present in `galleryImages` state, any attempt to add it again (via upload or selection) is silently ignored.
- The gallery PUT endpoint also deduplicates by URL before inserting, as a server-side safety net.

### US-3: Main product image is auto-synced to gallery
**As a** product manager,  
**I want** any image I set as the main product image to automatically appear in the gallery,  
**So that** I don't need to upload it twice.

**Acceptance criteria:**
- When a user selects or uploads an image via `ProductImagePicker` on the Details tab, the same URL is added to `galleryImages` (if not already present).
- This applies whether the user uploads a new file or picks an existing gallery image.
- The gallery tab badge count reflects the addition without requiring a page reload.
- If the image URL is already in the gallery, no duplicate is added.

### US-4: Single product image slot is preserved
**As a** developer,  
**I want** the main product image to remain a single-value field,  
**So that** the data model stays consistent.

**Acceptance criteria:**
- `imageUrl` remains a `string | null` field.
- `ProductImagePicker` continues to replace the current value on selection.
- No multi-select behavior is introduced for the main product image.

---

## Constraints

| Constraint | Detail |
|---|---|
| No schema migration | `products`, `product_images`, `product_variants` tables are unchanged |
| No new dependencies | Use `crypto.subtle.digest` (browser built-in) for SHA-256 hashing |
| Session-scoped hash tracking | Hashes of existing gallery images (loaded from DB) are not pre-computed; only files uploaded in the current session are tracked for content dedup |
| Shared dialog unchanged | `MediaPickerDialog` is used for both main product and variant image pickers; its internals must not be modified |

---

## Behavior Matrix

| Action | Content dup? | URL dup? | Result |
|---|---|---|---|
| Upload new file to gallery (unique) | No | No | Uploaded, added to gallery |
| Upload same file to gallery again | Yes | — | Blocked before upload; toast shown |
| Select existing gallery image from picker (for gallery) | — | Yes | Silently ignored; no duplicate added |
| Upload new file via main product image picker | No | No | Uploaded, set as `imageUrl`, added to gallery |
| Select existing gallery image as main product image | — | Yes (already in gallery) | Set as `imageUrl`; gallery unchanged (URL already present) |
| Submit form with duplicate URLs in gallery state | — | Yes | Server deduplicates before DB insert |

---

## Out of Scope

- Cross-session content dedup (e.g., detecting that the same file was uploaded in a previous browser session).
- Deduplication across different products.
- Image compression or resizing.
- Drag-and-drop reordering of gallery images.
- Removing orphaned files from `public/uploads/` when images are removed from the gallery.
