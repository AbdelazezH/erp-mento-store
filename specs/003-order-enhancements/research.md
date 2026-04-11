# Research: Order Enhancements

**Branch**: `003-order-enhancements` | **Date**: 2026-04-11

## Decision 1: Discount UI Component

**Decision**: Use shadcn/ui `ToggleGroup` for segmented control (`%` | `EGP`) paired with standard `Input`.

**Rationale**: ToggleGroup provides the native segmented control UX. The existing shadcn/ui components include `Toggle` and `ToggleGroup` which integrate seamlessly with the current design system.

**Alternatives considered**:
- Custom radio buttons: less polished, more CSS needed
- Select dropdown: too many clicks for a binary choice
- Third-party segmented control: unnecessary dependency

## Decision 2: Variant Modal Implementation

**Decision**: Use shadcn/ui `Dialog` component triggered on product selection.

**Rationale**: Dialog is already used throughout the app (invoice forms, settings pages). The product detail API (`/api/products/[id]`) already returns variants with stockQuantity, so no new API needed. For products without variants (`hasVariants === false`), skip the modal entirely.

**Alternatives considered**:
- Inline dropdown in table: too cramped, poor UX for multiple variants
- Popover: limited space for variant grid
- Drawer/sheet: would overlap with sidebar

## Decision 3: Inventory Toggle Storage

**Decision**: Add `trackInventory` boolean column to `orders` table. Backend checks this flag before decrementing stock.

**Rationale**: Simple boolean flag on the order itself. No new table needed. The stock decrement logic doesn't exist yet, so this flag will gate the future implementation.

**Alternatives considered**:
- Separate inventory_transactions table: over-engineering for current needs
- Frontend-only flag: insecure, could be bypassed

## Decision 4: Discount Storage

**Decision**: Add `discountType` enum (`percent`, `fixed`) and `discountValue` numeric column to `orders` table. Replace existing `shippingDiscount` and `shippingDiscountReason` fields (or keep them alongside).

**Rationale**: Storing type + value allows accurate recalculation. The current `shippingDiscount` is a simple numeric field without type context, so the new fields provide proper discount semantics.

**Alternatives considered**:
- Single `discount` field with convention: fragile, no type safety
- JSON field: unstructured, harder to query

## Decision 5: Customer Context Data

**Decision**: Use existing `useCustomer(id)` hook or extend the customers API to return order stats inline.

**Rationale**: The customers list API already returns `orderCount` and `totalSpend`. We need to either fetch individual customer details after selection, or include stats in the customer list response. Using `useCustomer(id)` from the existing `use-api.ts` hooks is simplest.

**Alternatives considered**:
- Separate stats API call: extra network request
- Pre-loading all customer stats: inefficient for large customer lists
