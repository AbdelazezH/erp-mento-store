# Research: Sales Order Full-Page Migration

**Branch**: `001-sales-order-full` | **Date**: 2026-04-11

## Current State Analysis

### Existing Orders Page (`src/app/(dashboard)/orders/page.tsx`, 798 lines)
- All order creation/editing happens in a `Dialog` modal (~300 lines of form logic)
- Uses `react-hook-form` + `zodResolver` + `useFieldArray` for line items
- Form fields: Customer, Order Date, Status, Shipping Fee, Discount, Notes, Feedback, Line Items
- No campaign linkage exists
- No quick-search for products (uses Select dropdown)

### Database Schema
- `orders` table: id, orderNumber, customerId, orderDate, status, totalAmount, totalCost, profit, shippingFee, shippingDiscount, shippingDiscountReason, notes, customerFeedback
- `orderLineItems` table: id, orderId, productId, variantId, productName, variantName, quantity, unitPrice, unitCost, total, profit, isFree, originalUnitPrice
- `campaigns` table: id, name, startDate, endDate, advertisingBudget, shippingCost, otherCosts
- **No `campaignId` column on `orders` table** - needs migration

### Architecture Patterns
- Next.js App Router with `(dashboard)` layout group
- API routes in `src/app/api/orders/` (GET list, POST create, GET/PUT/DELETE by id)
- TanStack Query hooks in `src/hooks/use-api.ts`
- shadcn/ui components in `src/components/ui/`
- All current forms use modal/dialog pattern

---

## Research Decisions

### Decision 1: Full-page route vs dialog replacement
**Chosen**: Dedicated route at `/orders/new` and `/orders/[id]/edit`

**Rationale**:
- The modal is already 300+ lines and growing with campaign integration and quick-search
- A full page provides more screen real estate for the 2/3 + 1/3 layout
- Follows the pattern of `/bills/new` which already uses a full-page approach
- Better URL-based navigation (can share direct links to orders)
- Browser back button works naturally

**Alternatives considered**:
- Expanding the existing dialog: Would still be constrained by viewport height, awkward for complex forms
- Slide-over panel: Less conventional, harder to implement responsive layout

### Decision 2: Campaign linkage via database migration
**Chosen**: Add `campaignId` (nullable UUID) to `orders` table

**Rationale**:
- Required by spec ("Campaign dropdown marked as required connection")
- Simple foreign key to `campaigns` table
- Nullable to support orders not tied to a campaign
- No need for a junction table since each order belongs to at most one campaign

**Alternatives considered**:
- Junction table: Over-engineered for a simple one-to-many relationship
- Metadata field: Loses referential integrity and query capability

### Decision 3: Quick Search for products
**Chosen**: Command/Combobox pattern with text search

**Rationale**:
- Product list can be large (50+ items), making a Select dropdown unwieldy
- Combobox allows typing to filter, matching the "Quick Search" requirement
- shadcn/ui has a Command component available (`src/components/ui/command.tsx`)
- API already supports `?search=` parameter on `/api/products`

**Alternatives considered**:
- Standard Select with pagination: Awkward UX for finding products quickly
- External product picker modal: Adds extra click, defeats "quick" search goal

### Decision 4: Sticky sidebar implementation
**Chosen**: CSS `sticky` positioning with `top` offset

**Rationale**:
- Native CSS, no JS scroll handling needed
- Works within the existing dashboard layout
- Tailwind's `sticky top-4` is straightforward
- The financial summary (subtotal, shipping, discount, grand total, est. profit) stays visible

**Alternatives considered**:
- Fixed positioning: Overlaps with dashboard header, requires manual offset
- Scroll event listener: Unnecessary complexity for a simple sticky behavior

### Decision 5: Notes & Feedback placement
**Chosen**: Below the items table in the main content area

**Rationale**:
- Spec suggests "bottom or separate tab"
- A tab would hide important fields; bottom placement keeps everything visible
- Two side-by-side textareas (Notes + Feedback) fit naturally at the bottom of the 2/3 main area
- Keeps the sidebar focused on status and financials only

**Alternatives considered**:
- Separate tab: Hides fields, requires extra click, adds complexity
- In sidebar: Would crowd the financial summary

### Decision 6: Profit calculation with campaign data
**Chosen**: Use campaign product COGS when a campaign is selected

**Rationale**:
- Campaign products have specific `cogs` values that may differ from general product costs
- When a campaign is linked, use the campaign's COGS for profit estimation
- Fall back to product's `averageCost` when no campaign is linked

**Alternatives considered**:
- Always use product average cost: Ignores campaign-specific pricing
- Duplicate campaign cost data: Violates DRY, leads to stale data

---

## Technical Dependencies

| Dependency | Purpose | Status |
|-----------|---------|--------|
| react-hook-form | Form management | Already in project |
| zod | Schema validation | Already in project |
| TanStack Query | Data fetching | Already in project |
| shadcn/ui Command | Quick search combobox | Already available |
| drizzle-orm | Database migration | Already in project |
| Tailwind CSS | Sticky layout | Already in project |

No new dependencies required.
