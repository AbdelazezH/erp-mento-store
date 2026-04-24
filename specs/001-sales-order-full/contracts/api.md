# API Contracts: Sales Order Full-Page Migration

**Branch**: `001-sales-order-full` | **Date**: 2026-04-11

## Modified Endpoints

### POST /api/orders

**Changes**: Add `campaignId` field to request body.

#### Request Body
```json
{
  "customerId": "uuid | null",
  "campaignId": "uuid | null",
  "orderDate": "ISO date string (optional)",
  "status": "draft | pending | delivered | cancelled",
  "shippingFee": "string | number",
  "shippingDiscount": "string | number",
  "shippingDiscountReason": "string | null",
  "notes": "string | null",
  "customerFeedback": "string | null",
  "lineItems": [
    {
      "productId": "uuid | null",
      "variantId": "uuid | null",
      "productName": "string",
      "variantName": "string | null",
      "quantity": 1,
      "unitPrice": "string",
      "unitCost": "string",
      "total": "string",
      "profit": "string",
      "isFree": false,
      "originalUnitPrice": "string | null"
    }
  ]
}
```

#### Response (201)
```json
{
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20260411-XXXX",
    "customerId": "uuid | null",
    "campaignId": "uuid | null",
    "orderDate": "ISO timestamp",
    "status": "pending",
    "totalAmount": "0.00",
    "totalCost": "0.00",
    "profit": "0.00",
    "shippingFee": "0",
    "shippingDiscount": "0",
    "shippingDiscountReason": null,
    "notes": null,
    "customerFeedback": null,
    "createdAt": "ISO timestamp"
  }
}
```

### PUT /api/orders/[id]

**Changes**: Add `campaignId` to update schema.

#### Request Body
```json
{
  "campaignId": "uuid | null",
  "customerId": "uuid | null",
  "status": "pending",
  "lineItems": ["...same as POST..."]
}
```

### GET /api/orders/[id]

**Changes**: Response now includes `campaignId` and `campaignName`.

#### Response
```json
{
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20260411-XXXX",
    "customerId": "uuid | null",
    "campaignId": "uuid | null",
    "campaignName": "string | null",
    "orderDate": "ISO timestamp",
    "status": "pending",
    "totalAmount": "0.00",
    "totalCost": "0.00",
    "profit": "0.00",
    "shippingFee": "0",
    "shippingDiscount": "0",
    "shippingDiscountReason": null,
    "notes": null,
    "customerFeedback": null,
    "createdAt": "ISO timestamp",
    "customerName": "string | null",
    "lineItems": [
      {
        "id": "uuid",
        "productId": "uuid | null",
        "variantId": "uuid | null",
        "productName": "string",
        "variantName": "string | null",
        "quantity": 1,
        "unitPrice": "0.00",
        "unitCost": "0.00",
        "total": "0.00",
        "profit": "0.00",
        "isFree": false,
        "originalUnitPrice": "0.00",
        "productImage": "string | null"
      }
    ]
  }
}
```

## Unchanged Endpoints

### GET /api/orders
No changes to query params or response shape. `campaignId` included in select but not filterable in v1.

### DELETE /api/orders/[id]
No changes.

## New Hook: useCampaigns

Already exists in `use-api.ts`. The full-page form will consume:
- `useCampaigns()` - populate campaign dropdown
- `useCampaign(id)` - fetch campaign products for COGS lookup (if needed)

## Frontend Form → API Mapping

| Form Field | API Field | Transform |
|-----------|-----------|-----------|
| customer (select) | customerId | Direct UUID |
| campaign (select) | campaignId | Direct UUID or null |
| orderDate (date input) | orderDate | ISO date string |
| status (select) | status | Enum string |
| shippingFee (number) | shippingFee | `String(value)` |
| shippingDiscount (number) | shippingDiscount | `String(value)` |
| shippingDiscountReason | shippingDiscountReason | Direct string |
| notes (textarea) | notes | Direct string |
| customerFeedback (textarea) | customerFeedback | Direct string |
| items[].unitPrice | lineItems[].unitPrice | `String(value)` |
| items[].unitCost | lineItems[].unitCost | `String(value)` |
| items[].total | lineItems[].total | `String(quantity * unitPrice)` |
| items[].profit | lineItems[].profit | `String(total - unitCost * quantity)` |
