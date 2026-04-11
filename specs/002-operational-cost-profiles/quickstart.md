# Quickstart: Operational Cost Profiles

**Branch**: `002-operational-cost-profiles` | **Date**: 2026-04-11

## Implementation Steps

### Step 1: Database Schema
Add to `src/lib/db/schema.ts`:
- `costCategoryEnum` and `applicationRuleEnum` pgEnums
- `costProfiles` table with name, category, unitCost, applicationRule, isActive, createdAt
- Push migration with `npx drizzle-kit push`

### Step 2: API Routes
- Create `src/app/api/cost-profiles/route.ts` — GET (list all), POST (create)
- Create `src/app/api/cost-profiles/[id]/route.ts` — PUT (update), DELETE

### Step 3: Hooks
Add to `src/hooks/use-api.ts`:
- `useCostProfiles()` — fetch all
- `useCreateCostProfile()` — create mutation
- `useUpdateCostProfile()` — update mutation
- `useDeleteCostProfile()` — delete mutation

### Step 4: Page
Create `src/app/(dashboard)/settings/cost-profiles/page.tsx`:
- Table with category badges and active toggle switches
- Create/Edit dialog modal
- Delete confirmation dialog

### Step 5: Navigation
Update `src/components/layout/sidebar.tsx`:
- Add "Cost Profiles" link under Settings section

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/db/schema.ts` | Modify | Add enums + costProfiles table |
| `src/app/api/cost-profiles/route.ts` | Create | GET/POST handler |
| `src/app/api/cost-profiles/[id]/route.ts` | Create | PUT/DELETE handler |
| `src/hooks/use-api.ts` | Modify | Add cost profile hooks |
| `src/app/(dashboard)/settings/cost-profiles/page.tsx` | Create | Cost profiles page |
| `src/components/layout/sidebar.tsx` | Modify | Add nav link |

## Testing Checklist

- [ ] Create cost profile with all fields
- [ ] Edit cost profile name and unit cost
- [ ] Delete cost profile with confirmation
- [ ] Toggle active/inactive switch
- [ ] Category badges display correctly (3 types)
- [ ] Application rule labels display correctly (3 types)
- [ ] Page is admin-only (non-admin redirected)
