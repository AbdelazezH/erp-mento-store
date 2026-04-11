# Implementation Plan: Operational Cost Profiles

**Branch**: `002-operational-cost-profiles` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-operational-cost-profiles/spec.md`

## Summary

Add a Settings > Cost Profiles page for managing operational "hidden costs" (Packaging, Handling, Transaction Fee) with application rules (Per Order, Per Item, Manual). Simple CRUD entity with active/inactive toggle. Uses the same patterns as existing settings pages (admin-only, dialog forms, TanStack Query hooks). No new dependencies required.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js
**Primary Dependencies**: Next.js 15 (App Router), React 19, react-hook-form, zod, TanStack Query, drizzle-orm, shadcn/ui, Tailwind CSS
**Storage**: PostgreSQL via drizzle-orm
**Testing**: Manual browser testing
**Target Platform**: Web browser (desktop-first)
**Project Type**: Web application (ERP system)
**Performance Goals**: Instant table updates via query invalidation
**Constraints**: Admin-only page under existing Settings layout
**Scale/Scope**: 6 files created/modified, simple CRUD entity

## Constitution Check

Constitution is in template state (no specific principles defined). No gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-operational-cost-profiles/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api.md           # API contract
│   └── ui-layout.md     # UI layout specification
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/db/schema.ts                              # MODIFY: add enums + costProfiles table
├── app/
│   ├── api/cost-profiles/
│   │   ├── route.ts                              # CREATE: GET/POST
│   │   └── [id]/route.ts                         # CREATE: PUT/DELETE
│   └── (dashboard)/settings/cost-profiles/
│       └── page.tsx                              # CREATE: cost profiles page
├── hooks/use-api.ts                              # MODIFY: add cost profile hooks
└── components/layout/sidebar.tsx                 # MODIFY: add nav link
```

**Structure Decision**: Single web application. All changes within existing `src/` structure following established CRUD patterns.

## Complexity Tracking

No violations to justify.
