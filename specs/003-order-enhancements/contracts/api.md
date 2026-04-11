# API Contracts: Order Enhancements

**Branch**: `003-order-enhancements` | **Date**: 2026-04-11

## Modified Endpoints

### POST /api/orders

Extended request body:

```json
{
  "customerId": "uuid",
  "campaignId": "uuid",
  "orderDate": "2026-04-11",
  "status": "pending",
  "shippingFee": "50.00",
  "shippingDiscount": "0",
  "shippingDiscountReason": null,
  "discountType": "percent",
  "discountValue": "10.00",
  "trackInventory": true,
  "notes": null,
  "customerFeedback": null,
  "lineItems": [...],
  "costProfileEntries": [...]
}
```

**New fields**:
- `discountType`: `"percent"` | `"fixed"` | null
- `discountValue`: string (numeric), default `"0"`
- `trackInventory`: boolean, default `true`

**Server-side calculation**:
```
orderDiscount = discountType == "percent"
  ? (totalAmount + shippingNet) * (discountValue / 100)
  : discountType == "fixed"
    ? discountValue
    : 0

profit = totalAmount + shippingNet - orderDiscount - totalCost - costProfileTotal
```

### PUT /api/orders/[id]

Same new optional fields. When `trackInventory` changes from true to false on update, stock adjustments should be reversed.

### GET /api/orders/[id]

Response now includes:

```json
{
  "discountType": "percent",
  "discountValue": "10.00",
  "trackInventory": true,
  "costProfileEntries": [...],
  "lineItems": [
    {
      "variantId": "uuid",
      "variantName": "Red / Large",
      ...
    }
  ]
}
```

### GET /api/customers/[id] (verify)

Should return customer with order stats:

```json
{
  "id": "uuid",
  "name": "...",
  "email": "...",
  "phone": "...",
  "address": "...",
  "orderCount": 12,
  "totalSpend": "5400.00"
}
```

## Inventory Decrement Logic (NEW)

When `trackInventory` is true on order create:
- For each line item with a `variantId`: decrement `productVariants.stockQuantity`
- For each line item without variant: decrement `products.stockQuantity`
- Skip if `trackInventory` is false
