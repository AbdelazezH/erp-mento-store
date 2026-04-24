# Tasks: Sales Order Full-Page Migration

**Branch**: `001-sales-order-full` | **Date**: 2026-04-11

## Phase 1: Database & Schema

- [X] **T1**: Add `campaignId` column to orders table in `src/lib/db/schema.ts`
- [X] **T2**: Run database migration to add the new column

## Phase 2: API Updates

- [X] **T3**: Update `POST /api/orders` schema to accept `campaignId`, include campaign join in `GET`
- [X] **T4**: Update `GET/PUT /api/orders/[id]` to include `campaignId` and `campaignName`

## Phase 3: Full-Page Order Form

- [X] **T5**: Create `/orders/new/page.tsx` with 2/3 + 1/3 layout, GeneralInfo section, OrderItems table, Notes section
- [X] **T6**: Add sticky sidebar with Status Picker, Financial Summary, and Save/Cancel buttons
- [X] **T7**: Add Campaign dropdown to GeneralInfo section using `useCampaigns()` hook
- [X] **T8**: Add Quick Product Search using Command/Combobox component

## Phase 4: Edit Page & List Integration

- [X] **T9**: Create `/orders/[id]/page.tsx` that reuses the form component with pre-filled data
- [X] **T10**: Update orders list page to navigate to `/orders/new` and `/orders/[id]` instead of using dialog

## Phase 5: Polish & Validation

- [ ] **T11**: Verify all CRUD operations work, real-time calculations update correctly
- [ ] **T12**: Test responsive layout and edge cases
