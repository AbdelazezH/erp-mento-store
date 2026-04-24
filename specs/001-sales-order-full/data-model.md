# Data Model: Sales Order Full-Page Migration

**Branch**: `001-sales-order-full` | **Date**: 2026-04-11

## Entity Changes

### 1. `orders` table (MODIFIED)

Add one new column:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `campaignId` | `uuid` | nullable, FK → `campaigns.id` | Links order to a campaign |

**Existing columns** (unchanged):
- `id` (uuid, PK)
- `orderNumber` (text, unique, not null)
- `customerId` (uuid, nullable, FK → customers)
- `orderDate` (timestamp, not null, default now)
- `status` (enum: draft/pending/delivered/cancelled, not null, default "pending")
- `totalAmount` (numeric 12,2, not null, default "0")
- `totalCost` (numeric 12,2, not null, default "0")
- `profit` (numeric 12,2, not null, default "0")
- `shippingFee` (numeric 12,2, default "0")
- `shippingDiscount` (numeric 12,2, default "0")
- `shippingDiscountReason` (text, nullable)
- `notes` (text, nullable)
- `customerFeedback` (text, nullable)
- `createdAt` (timestamp, not null, default now)

### 2. `orderLineItems` table (UNCHANGED)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| orderId | uuid | not null, FK → orders |
| productId | uuid | nullable, FK → products |
| variantId | uuid | nullable, FK → productVariants |
| productName | text | not null |
| variantName | text | nullable |
| quantity | integer | not null, default 1 |
| unitPrice | numeric 12,2 | not null |
| unitCost | numeric 12,2 | not null, default "0" |
| total | numeric 12,2 | not null |
| profit | numeric 12,2 | not null, default "0" |
| isFree | boolean | not null, default false |
| originalUnitPrice | numeric 12,2 | nullable |

### 3. `campaigns` table (UNCHANGED)

Referenced for campaign dropdown and COGS lookup.

### 4. `campaignProducts` table (UNCHANGED)

Referenced for campaign-specific pricing and COGS when an order is linked to a campaign.

## Relationships

```
orders.campaignId → campaigns.id (nullable, many-to-one)
orders.customerId → customers.id (nullable, many-to-one)
orderLineItems.orderId → orders.id (cascade delete)
orderLineItems.productId → products.id (set null)
orderLineItems.variantId → productVariants.id (set null)
campaignProducts.campaignId → campaigns.id (cascade delete)
campaignProducts.productId → products.id (cascade delete)
```

## Validation Rules

### Order Form (Frontend Zod Schema)
- `customerId`: required (string, min 1)
- `campaignId`: optional (string, nullable)
- `orderDate`: optional (string date)
- `status`: required (enum: draft | pending | delivered | cancelled)
- `shippingFee`: coerce number, min 0
- `shippingDiscount`: coerce number, min 0
- `shippingDiscountReason`: optional string
- `notes`: optional string
- `customerFeedback`: optional string
- `items`: array of line items, min 1 item
  - `productId`: required string
  - `variantId`: optional string
  - `productName`: required string
  - `quantity`: coerce number, int, min 1
  - `unitPrice`: coerce number, min 0
  - `isFree`: boolean, default false

### API Validation (Backend Zod Schema)
- Same rules as frontend, with:
  - `advertisingBudget`, `shippingCost`, `otherCosts` accept string | number
  - Price fields accept string | number, transform to string
  - `expectedUnits` coerced to integer

## State Transitions

### Order Status Workflow
```
draft → pending → delivered
draft → cancelled
pending → cancelled
pending → delivered
```

- `draft`: Initial state, freely editable
- `pending`: Confirmed order, awaiting fulfillment
- `delivered`: Completed order
- `cancelled`: Cancelled order

### Financial Calculation
- `totalAmount` = sum of (lineItem.unitPrice * lineItem.quantity) where !isFree
- `totalCost` = sum of (lineItem.unitCost * lineItem.quantity) where !isFree
- `profit` = totalAmount - totalCost - shippingFee + shippingDiscount
- When campaign linked: `unitCost` sourced from `campaignProducts.cogs` if available, else `products.averageCost`

## Migration Required

```sql
ALTER TABLE orders ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
```
