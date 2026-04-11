# Data Model: Operational Cost Profiles

**Branch**: `002-operational-cost-profiles` | **Date**: 2026-04-11

## New Entities

### `costProfiles` table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, defaultRandom | Unique identifier |
| `name` | `text` | not null | e.g. "Standard Eco-Box", "Bubble Wrap Large" |
| `category` | `costCategoryEnum` | not null | Packaging, Handling, Transaction Fee |
| `unitCost` | `numeric(12,2)` | not null, default "0" | Cost in EGP |
| `applicationRule` | `applicationRuleEnum` | not null | Per Order, Per Item, Manual |
| `isActive` | `boolean` | not null, default true | Active/inactive toggle |
| `createdAt` | `timestamp` | not null, defaultNow | Creation timestamp |

### New Enums

```typescript
export const costCategoryEnum = pgEnum("cost_category", [
  "packaging",
  "handling",
  "transaction_fee",
]);

export const applicationRuleEnum = pgEnum("application_rule", [
  "per_order",
  "per_item",
  "manual",
]);
```

## Relationships

None in v1. Future integration with campaigns/orders will add:
- `campaignCostProfiles` junction table (campaign ↔ cost profile)
- `orderCostProfiles` junction table (order ↔ cost profile with actual cost)

## Validation Rules

### Cost Profile Form (Frontend Zod)
- `name`: string, min 1, required
- `category`: enum(packaging, handling, transaction_fee), required
- `unitCost`: coerce number, min 0, required
- `applicationRule`: enum(per_order, per_item, manual), required

### API Validation (Backend Zod)
- Same as frontend with:
  - `unitCost` accepts string | number, transforms to string
  - `isActive` boolean, default true

## State Transitions

### Active/Inactive Toggle
```
active ↔ inactive (simple boolean toggle, no workflow)
```

No complex state machine — profiles can be toggled freely in either direction.

## Migration Required

```sql
CREATE TYPE cost_category AS ENUM ('packaging', 'handling', 'transaction_fee');
CREATE TYPE application_rule AS ENUM ('per_order', 'per_item', 'manual');

CREATE TABLE cost_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category cost_category NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT '0',
  application_rule application_rule NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```
