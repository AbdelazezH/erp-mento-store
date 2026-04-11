# Data Model: Order Enhancements

**Branch**: `003-order-enhancements` | **Date**: 2026-04-11

## Entity Changes

### orders table (MODIFY)

Add columns:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `discount_type` | pgEnum: `discount_type` (`percent`, `fixed`) | `null` | null = no discount |
| `discount_value` | numeric(12,2) | `"0"` | Discount amount or percentage |
| `track_inventory` | boolean | `true` | Whether to decrement stock |

Keep existing `shipping_discount` and `shipping_discount_reason` fields (separate from order discount).

### discount_type enum (NEW)

```typescript
export const discountTypeEnum = pgEnum("discount_type", ["percent", "fixed"]);
```

### productVariants table (NO CHANGE)

Already exists with: id, productId, name, attributeName, attributeValue, sku, barcode, imageUrl, additionalCost, sellingPrice, stockQuantity.

## Entity Relationships

No new relationships needed. The variant modal reads from existing `productVariants` via the product detail API.

## Validation Rules

### Discount
- `discountType` is optional (null = no discount)
- `discountValue` must be >= 0
- If `discountType` is "percent", `discountValue` must be 0–100
- If `discountType` is "fixed", `discountValue` can be any positive number

### Inventory
- `trackInventory` defaults to true
- When false, order creation/update skips stock decrement

### Variant Selection
- `variantId` on line items should reference a real variant belonging to the selected product
- Variant name populated from variant record (no free text)

## Financial Calculations

Updated profit formula:
```
subtotal = sum of (qty × unitPrice) for non-free items
shippingNet = shippingFee - shippingDiscount

if discountType == "percent":
  orderDiscount = (subtotal + shippingNet) × (discountValue / 100)
elif discountType == "fixed":
  orderDiscount = discountValue
else:
  orderDiscount = 0

grandTotal = subtotal + shippingNet - orderDiscount
totalCost = COGS from line items + cost profile total
profit = grandTotal - totalCost
```
