# Implementation Plan: Order Enhancements

**Branch**: `003-order-enhancements` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-order-enhancements/spec.md`

## Summary

Five enhancements to the order creation/editing form: (1) dynamic discount with percent/fixed toggle, (2) variant selection modal, (3) inventory tracking toggle, (4) wider quantity fields and read-only variant badges, (5) customer context snippet with CRM stats. All changes are within the existing OrderForm component and order API routes.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js
**Primary Dependencies**: Next.js 15 (App Router), React 19, react-hook-form, zod, TanStack Query, drizzle-orm, shadcn/ui, Tailwind CSS
**Storage**: PostgreSQL via drizzle-orm
**Testing**: Manual browser testing
**Target Platform**: Web browser (desktop-first)
**Project Type**: Web application (ERP system)
**Performance Goals**: Instant form recalculations via useMemo
**Constraints**: Must work with existing order form layout (2/3 + 1/3 grid)
**Scale/Scope**: 5 files modified, no new pages

## Constitution Check

Constitution is in template state (no specific principles defined). No gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-order-enhancements/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    ├── api.md           # API contract
    └── ui-layout.md     # UI layout specification
```

### Source Code (repository root)

```text
src/
├── lib/db/schema.ts                              # MODIFY: add discountTypeEnum + orders columns
├── app/
│   ├── api/orders/
│   │   ├── route.ts                              # MODIFY: discount + inventory + new fields
│   │   └── [id]/route.ts                         # MODIFY: discount + inventory + new fields
│   └── (dashboard)/orders/
│       ├── _components/OrderForm.tsx             # MODIFY: all 5 enhancements
│       └── [id]/page.tsx                         # MODIFY: map new defaultValues
└── hooks/use-api.ts                              # MODIFY: add useCustomer(id) if missing
```

**Structure Decision**: Single web application. All changes within existing OrderForm and order API.

## Complexity Tracking

No violations to justify.
