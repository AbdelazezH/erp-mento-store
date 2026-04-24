# Feature Specification: Sales Order Full-Page Migration

**Feature Branch**: `001-sales-order-full`
**Created**: 2026-04-11
**Status**: Draft
**Input**: User description: "Sales Order: Full-Page Migration - transform modal into high-converting workspace with Main/Sidebar layout"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Order with Full-Page Workspace (Priority: P1)

As a store operator, I want to create a new sales order on a full page (instead of a cramped modal) so that I can see all order details, financials, and product search at once without scrolling.

**Why this priority**: This is the core value proposition - the full-page layout itself.

**Independent Test**: Navigate to /orders/new, fill in customer, add items via quick search, see live financial summary in sidebar, save successfully.

**Acceptance Scenarios**:

1. **Given** I am on the orders list, **When** I click "New Order", **Then** I navigate to /orders/new with a 2/3 main + 1/3 sidebar layout
2. **Given** I am on the new order page, **When** I fill in customer and add items, **Then** the sticky sidebar shows updated Subtotal, Shipping, Discount, Grand Total, and Est. Profit
3. **Given** I am on the new order page, **When** I click Save, **Then** the order is created and I am redirected to the orders list with a success toast

---

### User Story 2 - Quick Product Search (Priority: P1)

As a store operator, I want to quickly search and add products to an order by typing a few characters, so I can build orders faster than scrolling through a dropdown.

**Why this priority**: Quick search is a core UX improvement directly tied to the full-page migration's value.

**Independent Test**: On /orders/new, type in the quick search field, select a product, verify it appears in the items table with correct pricing.

**Acceptance Scenarios**:

1. **Given** I am on the new order page, **When** I type in the quick search field, **Then** products matching the search appear in a dropdown
2. **Given** search results are shown, **When** I click a product, **Then** it is added to the items table with price and cost auto-populated

---

### User Story 3 - Campaign Linkage (Priority: P2)

As a store operator, I want to link an order to a campaign, so that the system uses campaign-specific pricing and COGS for profit calculation.

**Why this priority**: Adds business value (campaign tracking) but the order form works without it.

**Independent Test**: On /orders/new, select a campaign, add a product that exists in the campaign, verify the COGS comes from campaign data.

**Acceptance Scenarios**:

1. **Given** I am on the new order page, **When** I select a campaign from the dropdown, **Then** it is saved with the order
2. **Given** a campaign is selected and I add a product that has campaign-specific COGS, **Then** the unit cost uses the campaign COGS instead of the product's average cost
3. **Given** I change the campaign after adding items, **Then** the costs recalculate based on the new campaign's data

---

### User Story 4 - Edit Existing Order (Priority: P2)

As a store operator, I want to edit an existing order using the same full-page workspace, so I have a consistent experience for create and edit.

**Why this priority**: Completes the CRUD workflow but creation is more critical.

**Independent Test**: Navigate to /orders/[id], modify items, change status, save changes, verify updates persisted.

**Acceptance Scenarios**:

1. **Given** I am on the orders list, **When** I click edit on an order, **Then** I navigate to /orders/[id] with the form pre-filled
2. **Given** I am editing an order, **When** I change the status and save, **Then** the status is updated and I return to the list

---

### Edge Cases

- What happens when a product in the order is deleted? → productId set to null, productName preserved
- What happens when a linked campaign is deleted? → campaignId set to null (ON DELETE SET NULL)
- What happens when no products match the search? → Show "No products found" message
- What happens when the user navigates away with unsaved changes? → Browser handles via Next.js routing (no custom guard in v1)
- What happens with 50+ items in the order? → Table scrolls within the main content area

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display order creation on a full page with 2/3 main + 1/3 sidebar layout
- **FR-002**: System MUST provide a sticky sidebar showing Order Status and Financial Summary (Subtotal, Shipping, Discount, Grand Total, Est. Profit)
- **FR-003**: System MUST include a Campaign dropdown in the General Information section
- **FR-004**: System MUST save the selected campaignId with the order
- **FR-005**: System MUST use campaign-specific COGS when a campaign is linked
- **FR-006**: System MUST provide a quick product search (combobox) to add items faster
- **FR-007**: System MUST recalculate financial summary in real-time as items are added/modified
- **FR-008**: System MUST support editing existing orders on the same full-page layout
- **FR-009**: System MUST display Notes and Customer Feedback below the items table
- **FR-010**: System MUST support the existing status workflow (draft → pending → delivered / cancelled)

### Key Entities

- **Order**: Core entity with customer, campaign, dates, financials, status
- **OrderLineItem**: Products in an order with quantity, price, cost, profit
- **Campaign**: Optional parent entity linked via campaignId, provides COGS data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Order creation form displays all fields without scrolling in a 1280px+ viewport
- **SC-002**: Product search returns results within 300ms of typing
- **SC-003**: Financial summary updates instantly (< 100ms) on any field change
- **SC-004**: All existing order CRUD functionality preserved with zero regressions

## Assumptions

- Desktop-first design; sidebar stacks below on mobile (responsive)
- Existing authentication and session system is reused
- The orders list page continues to use the infinite scroll pattern
- No offline support required
- drizzle-kit will be used for the database migration
