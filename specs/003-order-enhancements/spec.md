# Spec: Order Enhancements

**Branch**: `003-order-enhancements` | **Date**: 2026-04-11

## 1. Dynamic Order Discount System

Replace the shipping discount with a proper order-level discount that supports both percentage and fixed amount modes.

**UI**: Segmented control toggle `[%] | [EGP]` with an input field. Placed in the Financial Summary section above Grand Total.

**Logic**:
- **Percentage mode**: Input accepts 0–100. Discount = (Subtotal + Shipping) * (Value / 100)
- **Fixed mode**: Input accepts any EGP value. Discount = Value
- Placeholder changes: "Enter %" vs "Enter EGP"
- Grand Total = Subtotal + Shipping - Discount

**API**: Add `discountType` (percent/fixed) and `discountValue` fields to orders table. Server recalculates discount and updates profit.

## 2. Product Variant Modal

Replace the inline "Variant" text field with an automated variant selection modal.

**Trigger**: Automatically opens when a product is selected from the ProductCombobox (only if the product has variants).

**Modal Content**:
- Header: Product name
- Body: Grid/list of available variants with stock remaining
- Action: Selecting a variant closes the modal and populates the row

**If no variants**: Skip modal, populate row directly.

**Data**: Fetch variants from existing `/api/products/[id]` endpoint which already returns variants with stockQuantity.

## 3. Track Inventory Toggle

Global toggle in the Order Items section header to control whether this order decrements inventory.

**Placement**: Next to "Add Item" button in Order Items card header.

**UI**: Switch labeled "Track Inventory", default ON.

**API**: Add `trackInventory` boolean to orders table. When OFF, backend skips stock decrement on create/update.

## 4. Enhanced Item Table

- **Quantity field**: Increase width from ~50px to ~90px for larger quantities.
- **Variant column**: Becomes read-only badge/label after variant is selected via modal (no manual text input).

## 5. Customer Context Snippet

Show customer details immediately after selecting a customer.

**UI**: Gray-background container below customer dropdown showing phone, email, address, and order history stats (LTV + Total Orders).

**Data**: Customer API already returns orderCount and totalSpend. Use `useOrder` or extend `useCustomer(id)` hook.

**Conditional**: Only renders when a customer is selected.
