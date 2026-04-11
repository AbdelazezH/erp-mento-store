# UI Contract: Order Enhancements

**Branch**: `003-order-enhancements` | **Date**: 2026-04-11

## Modified Route

| Route | Component | Changes |
|-------|-----------|---------|
| `/orders/new` | OrderForm | All 5 enhancements |
| `/orders/[id]` | OrderForm (edit mode) | Same enhancements, pre-filled |

## Layout Changes

### 1. Customer Context Snippet (General Information Card)

```
┌──────────────────────────────────────────────────┐
│ Customer * │ Order Date │ Campaign               │
├────────────┴────────────┴────────────────────────┤
│ [Customer Context - only when customer selected]  │
│ ┌──────────────────────────────────────────────┐  │
│ │ 📞 01012345678  📧 ahmed@example.com         │  │
│ │ 📍 Cairo                                      │  │
│ │ LTV: 5,400 EGP | Total Orders: 12            │  │
│ └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 2. Order Items Card Header (Track Inventory Toggle)

```
┌──────────────────────────────────────────────────┐
│ Order Items          [Track Inventory ◉] [+ Add] │
├──────────────────────────────────────────────────┤
```

### 3. Variant Modal (Dialog)

```
┌──────────────────────────────────────┐
│ Select Variant - Kids Hoodie     [X] │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────┐  ┌──────────┐         │
│  │ Red / S   │  │ Red / M   │        │
│  │ Stock: 15 │  │ Stock: 8  │        │
│  └──────────┘  └──────────┘         │
│  ┌──────────┐  ┌──────────┐         │
│  │ Blue / S  │  │ Blue / M  │        │
│  │ Stock: 12 │  │ Stock: 3  │        │
│  └──────────┘  └──────────┘         │
│                                      │
└──────────────────────────────────────┘
```

### 4. Enhanced Item Table

```
│ Product        │ Variant     │ Qty    │ Price │ Free? │ Total  │
├────────────────┼─────────────┼────────┼───────┼───────┼────────┤
│ [Combobox]     │ [Red/Large] │ [   3] │ 150   │  ☐    │ 450.00 │
│                │ (badge)     │ (~90px)│       │       │        │
```

- Qty field width: ~90px (up from ~50px)
- Variant: read-only badge, not editable text input

### 5. Financial Summary (Discount Section)

```
┌──────────────────────────────────┐
│ Financial Summary                │
├──────────────────────────────────┤
│ Subtotal              1,500.00   │
│ Shipping                 50.00   │
│ COGS                  -1,000.00  │
│ Cost Profiles           -30.00   │
│                                  │
│ Discount  [%] [EGP]              │
│           [   10   ]             │
│           -150.00                │
│ ──────────────────────────────── │
│ Grand Total            1,370.00  │
│ Est. Profit              370.00  │
└──────────────────────────────────┘
```
