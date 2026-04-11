# UI Contract: Cost Profiles Page

**Branch**: `002-operational-cost-profiles` | **Date**: 2026-04-11

## Route

| Route | Component | Purpose |
|-------|-----------|---------|
| `/settings/cost-profiles` | CostProfilesPage | List + CRUD for cost profiles |

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Settings > Cost Profiles                        [+ Add Cost] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Name        │ Category    │ Unit Cost │ Rule     │Active│  │
│  ├─────────────┼─────────────┼───────────┼──────────┼──────┤  │
│  │ Eco-Box     │ [Packaging] │ 15.00 EGP │ Per Item │  ●   │  │
│  │ Bubble Wrap │ [Packaging] │  8.00 EGP │ Per Item │  ●   │  │
│  │ Pick & Pack │ [Handling]  │  5.00 EGP │ Per Order│  ○   │  │
│  │ Paymob Fee  │ [Txn Fee]  │  2.5%     │ Per Order│  ●   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### CostProfilesPage
- Header with "Cost Profiles" title and "Add Cost" button
- Table with columns: Name, Category (badge), Unit Cost, Application Rule, Active (switch), Actions (edit/delete)
- Empty state when no profiles exist

### CostProfileDialog (Create/Edit)
- Form fields: Name (input), Category (select), Unit Cost (number input), Application Rule (select)
- Validation via Zod + react-hook-form
- Submit creates or updates profile

### Category Badges
- Packaging → default/secondary variant
- Handling → warning variant
- Transaction Fee → info/blue variant

### Application Rule Labels
- Per Order → "Per Order"
- Per Item → "Per Item"
- Manual → "Manual"
