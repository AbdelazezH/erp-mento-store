# UI Contract: Sales Order Full-Page Layout

**Branch**: `001-sales-order-full` | **Date**: 2026-04-11

## Route Structure

| Route | Component | Purpose |
|-------|-----------|---------|
| `/orders` | OrdersPage (existing) | List view with tab filters |
| `/orders/new` | OrderFormPage (new) | Create new order |
| `/orders/[id]` | OrderDetailPage (new) | View/edit existing order |

The "New Order" button on `/orders` navigates to `/orders/new` instead of opening a dialog.

## Layout Specification

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Orders > New Order                               │
├────────────────────────────────┬─────────────────────────────┤
│                                │                             │
│  GENERAL INFORMATION           │  SIDEBAR (sticky)           │
│  ┌──────────┐ ┌──────────┐    │                             │
│  │Customer *│ │Order Date│    │  Order Status               │
│  └──────────┘ └──────────┘    │  [Pending ▼]               │
│  ┌──────────┐                 │                             │
│  │Campaign *│                 │  ─────────────────          │
│  └──────────┘                 │                             │
│                                │  FINANCIAL SUMMARY          │
│  ORDER ITEMS                   │  Subtotal:      EGP 0.00   │
│  ┌─ Quick Search products ──┐ │  Shipping:      EGP 0.00   │
│  │ 🔍 Type to search...     │ │  Discount:     -EGP 0.00   │
│  └──────────────────────────┘ │  ────────────────          │
│  ┌──────────────────────────┐ │  Grand Total:   EGP 0.00   │
│  │ Product | Qty | Price |… │ │  Est. Profit:   EGP 0.00   │
│  │ ...items table...        │ │                             │
│  └──────────────────────────┘ │  [Save Order]               │
│                                │  [Cancel]                   │
│  NOTES & FEEDBACK              │                             │
│  ┌──────────┐ ┌──────────┐    │                             │
│  │ Notes    │ │ Feedback │    │                             │
│  └──────────┘ └──────────┘    │                             │
│                                │                             │
├────────────────────────────────┴─────────────────────────────┤
│                    (Dashboard layout continues)               │
└──────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### OrderFormPage (`/orders/new`)
- Top-level page component
- Uses 2/3 + 1/3 grid: `grid grid-cols-1 lg:grid-cols-3 gap-6`
- Main content: `lg:col-span-2`
- Sidebar: `lg:col-span-1 sticky top-4 self-start`

### GeneralInfoSection
- Customer Select (required)
- Order Date input
- Campaign Select (required) - fetched via `useCampaigns()`

### OrderItemsSection
- Quick Search: Command/Combobox component with product search
- Items Table: Full-width table with columns: Product, Variant, Qty, Unit Price, Total, Free?, Remove
- Add row on product selection from quick search

### NotesSection
- Two textareas side by side: Notes + Customer Feedback

### OrderSidebar
- Status Picker: Select component with 4 statuses
- Financial Summary Card:
  - Subtotal (sum of item totals, excluding free items)
  - Shipping Fee
  - Shipping Discount
  - Grand Total (subtotal + shipping - discount)
  - Estimated Profit (subtotal - total cost - shipping + discount)
- Save / Cancel buttons

## Interactions

### Quick Search Product Selection
1. User types in search field
2. Combobox filters products via `useProducts({ search })`
3. On product select:
   - New row added to items table
   - `unitPrice` populated from product's `sellingPrice`
   - `unitCost` populated from campaign COGS (if campaign linked) or product's `averageCost`
   - `originalUnitPrice` set to product's `sellingPrice`

### Campaign Change
1. User selects a campaign from dropdown
2. All existing items recalculate `unitCost` from `campaignProducts.cogs` if available
3. Financial summary updates in real-time

### Real-time Financial Updates
- All values recalculate on every keystroke/selection change
- Uses `useWatch` from react-hook-form for reactive updates
- Profit color: green when positive, red when negative
