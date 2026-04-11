# Research: Operational Cost Profiles

**Branch**: `002-operational-cost-profiles` | **Date**: 2026-04-11

## Current State Analysis

### Settings Structure
- Settings section exists at `src/app/(dashboard)/settings/` with `layout.tsx` requiring admin role
- Existing pages: `users/page.tsx`, `profile/page.tsx`
- Navigation defined in `src/components/layout/sidebar.tsx` under Settings section (admin-only)

### CRUD Pattern Reference (Categories)
- API: `src/app/api/categories/route.ts` — simple GET/POST with Zod validation
- Hooks: `useCategories()`, `useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()` in `src/hooks/use-api.ts`
- All use TanStack Query with toast notifications and query invalidation

### Database Patterns
- Tables use `uuid` PK with `.defaultRandom()`
- Currency fields use `numeric("field", { precision: 12, scale: 2 })`
- Enums use `pgEnum()` for type-safe status/category fields
- Relations defined separately via `relations()`
- Type exports at bottom: `export type Entity = typeof table.$inferSelect`

---

## Research Decisions

### Decision 1: New `costProfiles` table with pgEnum for category and rule
**Chosen**: Single table with `pgEnum` for `costCategoryEnum` and `applicationRuleEnum`

**Rationale**:
- Simple entity with no complex relationships
- `pgEnum` provides type safety at both DB and TypeScript level
- Follows existing pattern (`orderStatusEnum`, `billStatusEnum`)
- No need for separate tables for categories/rules — they're fixed enums

**Alternatives considered**:
- Separate lookup tables for categories: Over-engineered for 3 fixed values
- String columns with validation: Less type-safe, no DB-level constraint

### Decision 2: Inline editing vs modal form
**Chosen**: Dialog/modal form (same pattern as Categories and Campaigns)

**Rationale**:
- Consistent with existing UI patterns in the project
- Form has 4+ fields — inline editing would be cramped in a table
- Modal allows proper validation feedback

**Alternatives considered**:
- Inline editing: Cramped for 4 fields with dropdowns
- Separate full page: Overkill for a simple settings entity

### Decision 3: Active/inactive toggle implementation
**Chosen**: Switch component in the table row, calls PUT to toggle `isActive`

**Rationale**:
- Instant toggle without opening a form
- shadcn/ui Switch component available
- Single API call to toggle

**Alternatives considered**:
- Edit form toggle: Extra clicks, less intuitive
- Delete instead of deactivate: Loses data, not what user asked for

### Decision 4: Navigation placement
**Chosen**: Add "Cost Profiles" to existing Settings sidebar section

**Rationale**:
- Settings section already exists and is admin-only
- Fits naturally alongside "Team Members" and "My Profile"
- Uses existing layout protection

**Alternatives considered**:
- Separate top-level nav item: Clutters navigation
- Under campaigns: Not intuitive for a settings entity

---

## Technical Dependencies

| Dependency | Purpose | Status |
|-----------|---------|--------|
| pgEnum (drizzle-orm) | Type-safe category/rule enums | Already in project |
| shadcn/ui Switch | Active/inactive toggle | Already available |
| react-hook-form + zod | Form validation | Already in project |
| TanStack Query | Data fetching | Already in project |

No new dependencies required.
