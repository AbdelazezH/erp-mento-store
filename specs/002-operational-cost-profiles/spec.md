# Feature Specification: Operational Cost Profiles

**Feature Branch**: `002-operational-cost-profiles`
**Created**: 2026-04-11
**Status**: Draft
**Input**: Settings > Cost Profiles - dynamic table for defining hidden cost categories

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Cost Profiles CRUD (Priority: P1)

As an admin, I want to create, edit, and delete cost profiles (e.g., "Standard Eco-Box", "Bubble Wrap Large") so that I can define all hidden operational costs in one place.

**Why this priority**: Core CRUD — without cost profiles, nothing else works.

**Independent Test**: Navigate to Settings > Cost Profiles, create a profile with name/category/unit cost/rule, verify it appears in the table.

**Acceptance Scenarios**:

1. **Given** I am on Settings > Cost Profiles, **When** I click "Add Cost", fill in fields, and save, **Then** the new cost profile appears in the table
2. **Given** a cost profile exists, **When** I edit its name or unit cost, **Then** the changes are saved and reflected in the table
3. **Given** a cost profile exists, **When** I delete it, **Then** it is removed after confirmation

---

### User Story 2 - Cost Categories and Application Rules (Priority: P1)

As an admin, I want to categorize costs (Packaging, Handling, Transaction Fee) and define how they apply (Per Order, Per Item, Manual) so that the system knows how to automatically calculate them.

**Why this priority**: Category and application rule are what make cost profiles useful for profit calculations.

**Independent Test**: Create a cost profile with category "Packaging" and rule "Per Item", verify badge and rule label display correctly.

**Acceptance Scenarios**:

1. **Given** I am creating a cost profile, **When** I select a category, **Then** it is saved and displayed as a colored badge
2. **Given** I am creating a cost profile, **When** I select "Per Item" application rule, **Then** the table shows the rule label correctly

---

### User Story 3 - Toggle Active/Inactive (Priority: P2)

As an admin, I want to toggle cost profiles as active or inactive so that I can disable seasonal costs without deleting them.

**Why this priority**: Convenience — profiles can be deleted instead, but toggling is more practical.

**Independent Test**: Toggle a cost profile inactive, verify it shows as inactive and can be toggled back.

**Acceptance Scenarios**:

1. **Given** an active cost profile, **When** I toggle it inactive, **Then** it is visually distinguished
2. **Given** an inactive cost profile, **When** I toggle it active, **Then** it becomes active again

---

### Edge Cases

- What happens when deleting a cost profile used in a campaign? → Profile deleted; campaign keeps snapshot of cost at time of use
- What happens with duplicate names? → Allowed (same name can exist with different categories)
- What happens with zero unit cost? → Allowed (for "Manual" rule where cost is entered per-use)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display cost profiles in a dynamic table at Settings > Cost Profiles
- **FR-002**: System MUST support creating cost profiles with: Name, Category, Unit Cost (EGP), Application Rule
- **FR-003**: Categories MUST include: Packaging, Handling, Transaction Fee
- **FR-004**: Application Rules MUST include: Per Order, Per Item, Manual
- **FR-005**: System MUST support editing existing cost profiles inline or via modal
- **FR-006**: System MUST support deleting cost profiles with confirmation dialog
- **FR-007**: System MUST support toggling profiles as active/inactive
- **FR-008**: Page MUST be admin-only (under existing Settings layout protection)

### Key Entities

- **CostProfile**: Represents a single operational cost with name, category, unit cost, application rule, and active status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can create a cost profile in under 30 seconds
- **SC-002**: Table displays all profiles with category badges and rule labels
- **SC-003**: Active/inactive toggle updates instantly without page reload

## Assumptions

- Settings section already exists with admin-only protection
- Cost profiles are managed by admins only
- Integration with campaigns/orders will be a separate feature
