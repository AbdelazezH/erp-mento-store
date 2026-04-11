# Quickstart: Order Enhancements

**Branch**: `003-order-enhancements` | **Date**: 2026-04-11

## Implementation Steps

### Step 1: Database Schema
Add to `src/lib/db/schema.ts`:
- `discountTypeEnum` pgEnum: `["percent", "fixed"]`
- Add to `orders` table: `discountType`, `discountValue`, `trackInventory`
- Push migration with `npx drizzle-kit push`

### Step 2: API Routes
Modify `src/app/api/orders/route.ts`:
- Add `discountType`, `discountValue`, `trackInventory` to create schema
- Update profit calculation with order discount logic
- Add inventory decrement when `trackInventory` is true

Modify `src/app/api/orders/[id]/route.ts`:
- Add fields to update schema and GET response
- Handle inventory decrement/reverse on update
- Recalculate profit with discount

### Step 3: Customer Context API
Modify `src/app/api/customers/[id]/route.ts` (or verify existing):
- Ensure it returns order stats (orderCount, totalSpend)

### Step 4: OrderForm — Variant Modal
Modify `src/app/(dashboard)/orders/_components/OrderForm.tsx`:
- Add `useProduct(id)` hook to fetch variants when product selected
- Create `VariantModal` dialog component
- Auto-trigger modal when product with variants is selected
- Populate row with selected variant data
- Replace variant text input with read-only badge

### Step 5: OrderForm — Discount System
Modify OrderForm:
- Add `discountType` and `discountValue` to form schema
- Add segmented control (ToggleGroup) in Financial Summary
- Update useMemo for financial calculations
- Update submit payload

### Step 6: OrderForm — Track Inventory Toggle
Modify OrderForm:
- Add `trackInventory` switch in Order Items card header
- Default to true
- Include in submit payload

### Step 7: OrderForm — Customer Context Snippet
Modify OrderForm:
- Add `useCustomer(id)` or equivalent to fetch customer details
- Render context snippet below customer dropdown when selected
- Show phone, email, address, LTV, total orders

### Step 8: OrderForm — Table Layout
Modify OrderForm:
- Increase quantity field width to ~90px
- Replace variant text input with read-only badge display

### Step 9: Edit Page
Modify `src/app/(dashboard)/orders/[id]/page.tsx`:
- Map new fields (discountType, discountValue, trackInventory) into defaultValues

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/db/schema.ts` | Modify | Add discountTypeEnum + 3 columns to orders |
| `src/app/api/orders/route.ts` | Modify | Discount + inventory + new fields |
| `src/app/api/orders/[id]/route.ts` | Modify | Discount + inventory + new fields |
| `src/app/(dashboard)/orders/_components/OrderForm.tsx` | Modify | All 5 enhancements |
| `src/app/(dashboard)/orders/[id]/page.tsx` | Modify | Map new defaultValues |
| `src/hooks/use-api.ts` | Modify | Add useCustomer(id) if missing |

## Testing Checklist

- [ ] Discount: percentage mode calculates correctly
- [ ] Discount: fixed mode calculates correctly
- [ ] Discount: placeholder text changes between modes
- [ ] Variant modal opens for products with variants
- [ ] Variant modal skips for products without variants
- [ ] Variant badge shows in table after selection
- [ ] Track Inventory toggle defaults to ON
- [ ] Track Inventory OFF skips stock decrement
- [ ] Customer context snippet shows after selection
- [ ] Customer context shows phone, email, LTV, orders
- [ ] Quantity field is wider (~90px)
- [ ] Edit order loads all new fields correctly
