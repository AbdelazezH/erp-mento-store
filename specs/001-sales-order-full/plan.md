# Implementation Plan: Sales Order Full-Page Migration

**Branch**: `001-sales-order-full` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-sales-order-full/spec.md`

## Summary

Migrate the sales order creation/editing from a constrained modal dialog to a full-page workspace. The new layout uses a 2/3 main content + 1/3 sticky sidebar grid. Adds campaign linkage (new `campaignId` FK on orders), quick product search via combobox, and a live financial summary sidebar. No new dependencies required.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js
**Primary Dependencies**: Next.js 15 (App Router), React 19, react-hook-form, zod, TanStack Query, drizzle-orm, shadcn/ui, Tailwind CSS
**Storage**: PostgreSQL via drizzle-orm (Neon/Supabase)
**Testing**: Manual testing in browser (no automated test framework detected)
**Target Platform**: Web browser (desktop-first, responsive)
**Project Type**: Web application (ERP system)
**Performance Goals**: Form interactions < 100ms response time
**Constraints**: Must work within existing `(dashboard)` layout group
**Scale/Scope**: Single form page, ~7 files modified/created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is in template state (no specific principles defined). No gate violations.

**Post-design re-check**: No violations. Changes follow existing project patterns (react-hook-form + zod, TanStack Query hooks, shadcn/ui components, drizzle-orm schema).

## Project Structure

### Documentation (this feature)

```text
specs/001-sales-order-full/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api.md           # API contract changes
│   └── ui-layout.md     # UI layout specification
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/db/schema.ts                           # MODIFY: add campaignId to orders
├── app/
│   ├── api/
│   │   └── orders/
│   │       ├── route.ts                       # MODIFY: add campaignId to create/GET
│   │       └── [id]/route.ts                  # MODIFY: add campaignId to update/GET
│   └── (dashboard)/
│       └── orders/
│           ├── page.tsx                       # MODIFY: navigate to /new instead of dialog
│           ├── new/page.tsx                   # CREATE: new order full-page form
│           └── [id]/page.tsx                  # CREATE: edit order full-page form
└── hooks/use-api.ts                           # MODIFY: minor campaignId in payloads
```

**Structure Decision**: Single web application. All changes within existing `src/` structure. New pages added as Next.js App Router nested routes under `(dashboard)/orders/`.

## Complexity Tracking

No violations to justify.
