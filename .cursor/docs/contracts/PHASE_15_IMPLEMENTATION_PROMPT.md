# Contract Module — Phase 15
## Final Implementation Prompt
## Phase 15: Defects Liability / Warranty Baseline

---

## TASK

Implement **only Phase 15** of the Contract Module.

This phase introduces the first structured **defects liability / warranty baseline** for contracts that have reached closeout maturity.

This phase must allow internal users to:
- track defects liability or warranty dates on the contract
- create defect items linked to the contract
- track defect item lifecycle
- preserve append-only defect event history
- surface compact DLP/warranty summary and defect register on the contract show page

This phase is a baseline defect register, not a full ticketing or maintenance system.

---

## STRICT SCOPE

### IN SCOPE
- contract-level DLP/warranty summary
- DLP/warranty start and end dates
- defect item register
- defect status tracking
- append-only defect event history
- compact UI on contract show page
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- maintenance ticketing system
- SLA workflows
- supplier portal workflows
- service desk integrations
- financial recovery engine
- AI assistance
- external integrations

Stay strictly inside Phase 15.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Defect tracking is contract-linked
The contract remains the primary subject.
Defects are child records of a contract.

### Rule 2 — Defect history must be append-only
Each meaningful defect status change must create an append-only event/history row.

### Rule 3 — This is not a generic issue tracker
Do not build a general-purpose ticketing platform.

### Rule 4 — DLP/warranty is a baseline summary plus defect register
Keep this phase simple and contract-centric.

### Rule 5 — Defect management follows closeout maturity
Locked minimum precondition:
- contract must be `closed_out` or at least have closeout initialized if existing architecture requires it
- if current system has no separate closeout hard dependency in code, use executed + closeout initialized as the minimum

Use the cleanest compatible rule after inspecting implementation.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Defect statuses
Use exactly:
- `open`
- `in_progress`
- `resolved`
- `closed`

Do not add:
- reopened
- cancelled
- superseded
- pending_vendor

---

## READ FIRST

Before writing any code, read these completely:

1. `.cursorrules`
2. `.cursor/CURSOR_START_HERE.md`
3. `.cursor/docs/ARCHITECTURE.md`
4. `.cursor/docs/CODE_STYLE.md`
5. `.cursor/docs/FOLDER_STRUCTURE.md`
6. `.cursor/docs/AUDIT_LOG_STANDARD.md`
7. `.cursor/docs/RUN_ORDER.md`
8. `.cursor/docs/SECURITY_POLICY.md`
9. `.cursor/docs/contracts/PHASE_14_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_15_IMPLEMENTATION_PROMPT.md`

Also inspect:
- `Contract`
- `ContractCloseoutRecord`
- `ContractController`
- contract show page
- existing activity logging style

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Add:
- `defects_liability_start_at` nullable timestampTz
- `defects_liability_end_at` nullable timestampTz
- `warranty_status` string(30) nullable default `'open'`

### Constraint
Use a simple constraint for `warranty_status`:
- `open`
- `closed`

Do not overcomplicate this phase.

---

## Create `contract_defect_items`
Required columns:
- `id` UUID PK
- `contract_id` FK → contracts
- `reference_no` string(100)
- `title` string(255)
- `description` text nullable
- `status` string(30)
- `reported_at` nullable timestampTz
- `resolved_at` nullable timestampTz
- `closed_at` nullable timestampTz
- `notes` text nullable
- `created_by_user_id` nullable FK → users
- `updated_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

### Constraints
- unique `(contract_id, reference_no)`
- check `status in ('open','in_progress','resolved','closed')`
- index on `contract_id`

---

## Create `contract_defect_events`
Required columns:
- `id` UUID PK
- `contract_defect_item_id` FK → contract_defect_items
- `old_status` nullable string
- `new_status` nullable string
- `event_notes` text nullable
- `changed_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

Append-only.

---

## MODEL LAYER

### Update `Contract`
Add fillable/casts for DLP fields.
Add relation:
- `defectItems()`
Add helper:
- `canManageDefects()`

### Create `ContractDefectItem`
Add fillable fields, casts, status constants, helpers:
- `isOpen()`
- `isInProgress()`
- `isResolved()`
- `isClosed()`

Add relations:
- `contract()`
- `events()`
- `createdBy()`
- `updatedBy()`

### Create `ContractDefectEvent`
Add relations:
- `defectItem()`
- `changedBy()`

---

## SERVICE LAYER

Create:
- `ContractDefectService`

It must handle at minimum:

### 1) `checkDefectEligibility(Contract $contract): array`
Return `is_ready`, `issues`.

### 2) `initializeWarrantyWindow(Contract $contract, array $payload, User $actor): Contract`
Set/start DLP fields on header.

### 3) `createDefectItem(Contract $contract, array $payload, User $actor): ContractDefectItem`
Create defect item with generated `reference_no` like:
- `DEF-001`

### 4) `updateDefectStatus(ContractDefectItem $item, string $status, User $actor, ?string $notes = null): ContractDefectItem`
Allowed transitions:
- open → in_progress / resolved
- in_progress → resolved
- resolved → closed

Append event row on every status change.

### 5) `nextDefectReference(Contract $contract): string`

---

## CONTROLLER LAYER

Add focused controller:
- `ContractDefectController`

Actions:
- `initializeWarrantyWindow`
- `storeDefect`
- `updateDefectStatus`

---

## ROUTES

Add under `contracts.*`:

- `contracts.defects.initialize-warranty`
- `contracts.defects.store`
- `contracts.defects.update-status`

Example:
- `POST /contracts/{contract}/defects/initialize-warranty`
- `POST /contracts/{contract}/defects`
- `POST /contracts/{contract}/defects/{defect}/status`

---

## UI / PAGES TO BUILD

Enhance contract show page with:

### 1) Warranty summary card
- DLP start
- DLP end
- warranty status

### 2) Warranty initialization form
When eligible and not initialized.

### 3) Defect register
Compact table:
- reference
- title
- status
- reported/resolved/closed dates
- notes

### 4) Defect create form
- title
- description
- notes

### 5) Defect action buttons
- move to in progress
- mark resolved
- mark closed

### 6) Optional defect history list
Compact per-row or aggregated display

---

## POLICY / PERMISSION RULES

Use existing contract authorization architecture.
No new auth framework.

---

## ACTIVITY LOGGING

At minimum:
- `contracts.contract.warranty_initialized`
- `contracts.contract.defect_created`
- `contracts.contract.defect_status_changed`

---

## TRANSLATIONS

Add EN + AR keys for:
- warranty
- defects liability
- defect register
- defect reference
- open / in progress / resolved / closed
- initialize warranty
- reported at / resolved at / closed at
- create defect
- update defect status

---

## NAVIGATION

No new top-level nav item.

---

## SEEDING

No new seeders required.

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contracts`
4. Exact schema for `contract_defect_items`
5. Exact schema for `contract_defect_events`
6. Models created/updated
7. Service(s) added for defect/warranty handling
8. How eligibility and warranty initialization work
9. How defect creation and status changes work
10. What routes/pages were added or enhanced
11. What policy/permission approach was used
12. What activity logging events were wired
13. What translation keys were added
14. Confirm `npm run build` passes
15. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

Complete only if:
- warranty baseline can be initialized
- defect items can be created
- defect statuses transition correctly
- defect history is append-only
- show page surfaces warranty + defect register
- build passes
