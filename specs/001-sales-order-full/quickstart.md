# Quickstart: Sales Order Full-Page Migration

**Branch**: `001-sales-order-full` | **Date**: 2026-04-11

## What This Feature Does

Migrates the sales order creation/editing from a constrained modal dialog to a full-page workspace with a 2/3 main + 1/3 sticky sidebar layout. Adds campaign linkage and quick product search.

## Implementation Steps

### Step 1: Database Migration
Add `campaignId` column to the `orders` table:
```sql
ALTER TABLE orders ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
```
Update `src/lib/db/schema.ts` to include the new column in the `orders` table definition.

### Step 2: Update API Routes
- `src/app/api/orders/route.ts`: Add `campaignId` to `createSchema`, include in `GET` select, join campaigns for `campaignName`
- `src/app/api/orders/[id]/route.ts`: Add `campaignId` to `updateSchema`, include in `GET` response

### Step 3: Create Full-Page Routes
- `src/app/(dashboard)/orders/new/page.tsx` - New order form page
- `src/app/(dashboard)/orders/[id]/page.tsx` - Edit existing order (reuses form component)

### Step 4: Create OrderForm Component
- Extract form logic from the existing `OrderFormDialog` in `orders/page.tsx`
- Build the 2/3 + 1/3 layout with sticky sidebar
- Add campaign dropdown (fetched via `useCampaigns()`)
- Add quick product search using Command/Combobox
- Add real-time financial summary in sidebar

### Step 5: Update Orders List Page
- Replace "New Order" dialog trigger with `router.push('/orders/new')`
- Replace edit action with navigation to `/orders/[id]`
- Keep the delete confirmation dialog

### Step 6: Update Hooks
- No new hooks needed - `useCampaigns()` and `useProducts({ search })` already exist
- Ensure `useCreateOrder` and `useUpdateOrder` include `campaignId` in payloads

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/db/schema.ts` | Modify | Add `campaignId` to orders table |
| `src/app/api/orders/route.ts` | Modify | Add campaignId to schemas, join campaign name |
| `src/app/api/orders/[id]/route.ts` | Modify | Add campaignId to schemas, include in response |
| `src/app/(dashboard)/orders/new/page.tsx` | Create | New order full-page form |
| `src/app/(dashboard)/orders/[id]/page.tsx` | Create | Edit order full-page form |
| `src/app/(dashboard)/orders/page.tsx` | Modify | Navigate to new routes instead of dialog |
| `src/hooks/use-api.ts` | Modify | Minor: ensure campaignId in mutation payloads |

## Testing Checklist

- [ ] Create new order with campaign linked
- [ ] Create new order without campaign
- [ ] Quick search finds products by name
- [ ] Financial summary updates in real-time
- [ ] Sticky sidebar stays visible while scrolling items
- [ ] Edit existing order preserves all data
- [ ] Status picker updates correctly
- [ ] Free items excluded from totals
- [ ] Campaign COGS used when campaign is selected
- [ ] Product averageCost used when no campaign
- [ ] Mobile responsive (sidebar stacks below main)
