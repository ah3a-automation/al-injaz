# Contract Module — Phase 12
## Final Implementation Prompt
## Phase 12: Contract Variations / Amendments Baseline

---

## TASK

Implement **only Phase 12** of the Contract Module.

This phase introduces the first controlled workflow for **contract variations / amendments** after a contract has already moved into post-execution administration.

This phase must allow internal users to:

- create a structured variation / amendment record
- classify its type and reason
- track its commercial and time effect at header level
- move the variation through a simple internal review/approval flow
- approve or reject the variation
- apply approved variation totals to the contract header summary
- preserve append-only history and full auditability

This phase is the **baseline variation register**, not the full claims/EOT/VO engine.

---

## STRICT SCOPE

### IN SCOPE
- variation / amendment register
- variation numbering
- variation type + reason classification
- simple internal variation statuses
- commercial delta and optional time delta
- approval / rejection flow
- contract-level rolled-up variation summary fields
- compact UI on contract show page
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- BOQ-level measured variations
- clause/article-level redlining for amendments
- full amendment document generation
- claims engine
- EOT workflow
- notice workflow
- change request workflow outside contract variations
- invoice/payment integration
- AI assistance
- external approvals/integrations

Stay strictly inside Phase 12.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Variations are supplementary to the contract header
The `contracts` table remains the canonical contract header.

Variations are child records of a contract.

### Rule 2 — Variation history must be append-only
Variation records are not deleted.
Approval/rejection and status changes are tracked via timestamps/status + activity logs.

### Rule 3 — Approved variations affect contract summary, not raw contract drafting
Approved variations update contract-level summary fields.
They do not reopen draft article editing or earlier drafting phases.

### Rule 4 — This phase is header-level only
Do not build line-item/BOQ measurement details in this phase.

### Rule 5 — Variations require an executed/administered contract
This phase is for contracts that are already operationally live enough to administer.

Locked minimum precondition:
- contract status must be `executed`
- administration baseline should already exist or be initialized

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Variation types
Use exactly:

- `commercial`
- `time`
- `commercial_time`
- `administrative`

### Meaning
- `commercial` = value-only impact
- `time` = duration-only impact
- `commercial_time` = both value and time
- `administrative` = no direct commercial/time impact but still recorded

Do not add more types in this phase.

---

## Variation statuses
Use exactly:

- `draft`
- `submitted`
- `approved`
- `rejected`

Do not add:
- cancelled
- superseded
- implemented
- withdrawn

Those belong to later phases if needed.

---

## Read-first requirement

Before writing any code, read these completely:

1. `.cursorrules`
2. `.cursor/CURSOR_START_HERE.md`
3. `.cursor/docs/ARCHITECTURE.md`
4. `.cursor/docs/CODE_STYLE.md`
5. `.cursor/docs/FOLDER_STRUCTURE.md`
6. `.cursor/docs/AUDIT_LOG_STANDARD.md`
7. `.cursor/docs/RUN_ORDER.md`
8. `.cursor/docs/SECURITY_POLICY.md`
9. `.cursor/docs/contracts/PHASE_10_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_11_IMPLEMENTATION_PROMPT.md`

Also inspect current implementation of:
- `Contract`
- `ContractAdministrationBaseline`
- `ContractController`
- contract show page
- current contract summary fields
- existing activity logging style

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Add summary fields to `contracts`:

- `variation_total_approved` decimal(18,2) nullable default 0
- `variation_days_total_approved` integer nullable default 0
- `variation_count_total` integer nullable default 0
- `variation_count_approved` integer nullable default 0

These are rolled-up summary fields for quick display/reporting.

### Locked note
Do not replace existing contract value fields.
These are supplementary roll-up fields only.

---

## Create `contract_variations`
Create a new table:

- `contract_variations`

### Required columns
- `id` UUID PK
- `contract_id` FK → contracts
- `variation_no` string(100)
- `title` string(255)
- `variation_type` string(30)
- `status` string(30)
- `reason` text nullable
- `description` text nullable
- `commercial_delta` decimal(18,2) nullable
- `currency` string(10) nullable
- `time_delta_days` integer nullable
- `submitted_at` nullable timestampTz
- `submitted_by_user_id` nullable FK → users
- `approved_at` nullable timestampTz
- `approved_by_user_id` nullable FK → users
- `rejected_at` nullable timestampTz
- `rejected_by_user_id` nullable FK → users
- `decision_notes` text nullable
- `created_by_user_id` nullable FK → users
- `updated_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

### Constraints
- check `variation_type in ('commercial','time','commercial_time','administrative')`
- check `status in ('draft','submitted','approved','rejected')`
- unique `(contract_id, variation_no)`
- index on `contract_id`

### Numbering
Variation numbering can be simple and scoped per contract in this phase.

Locked expectation:
- service generates next variation number in a deterministic pattern
- for example: `VO-001`, `VO-002`, etc.

---

## MODEL LAYER

### Update `Contract`
Add fillable/casts for:
- `variation_total_approved`
- `variation_days_total_approved`
- `variation_count_total`
- `variation_count_approved`

Add relation:
- `variations()`

Add helper:
- `canManageVariations()`
  - locked logic:
    - true only when contract is executed
    - and administration is initialized

### Create `ContractVariation`
Add constants:
- variation type constants
- variation status constants

Add fillable fields matching schema.

Add casts for:
- money
- integer days
- timestamps

Add relations:
- `contract()`
- `submittedBy()`
- `approvedBy()`
- `rejectedBy()`
- `createdBy()`
- `updatedBy()`

Add helpers:
- `isDraft()`
- `isSubmitted()`
- `isApproved()`
- `isRejected()`

---

## SERVICE LAYER

Do not put variation workflow logic in controllers.

Create a dedicated service such as:

- `ContractVariationService`

It must handle at minimum:

### 1) `checkVariationEligibility(Contract $contract): array`
Return:
- `is_ready` boolean
- `issues` array

Minimum checks:
- contract status is `executed`
- administration baseline is initialized
- contract exists and is not null
- optional: contract has currency/value context where needed

### 2) `createVariation(Contract $contract, array $payload, User $actor): ContractVariation`
Behavior:
- verify eligibility
- generate next variation number
- create variation in `draft`
- set creator/updater

### 3) `submitVariation(ContractVariation $variation, User $actor): ContractVariation`
Behavior:
- only allowed from `draft`
- set `status = submitted`
- set `submitted_at`, `submitted_by_user_id`

### 4) `approveVariation(ContractVariation $variation, User $actor, ?string $notes = null): ContractVariation`
Behavior:
- only allowed from `submitted`
- set `status = approved`
- set `approved_at`, `approved_by_user_id`
- store `decision_notes`
- update contract summary rollups:
  - `variation_total_approved`
  - `variation_days_total_approved`
  - `variation_count_total`
  - `variation_count_approved`

### 5) `rejectVariation(ContractVariation $variation, User $actor, ?string $notes = null): ContractVariation`
Behavior:
- only allowed from `submitted`
- set `status = rejected`
- set `rejected_at`, `rejected_by_user_id`
- store `decision_notes`
- update contract summary rollups where needed

### 6) `refreshContractVariationSummary(Contract $contract): Contract`
Recalculate from current variation rows:
- total variations
- approved variations
- approved commercial delta sum
- approved time delta sum

Do not rely only on incremental arithmetic; recalc from DB for consistency.

### 7) `nextVariationNumber(Contract $contract): string`
Generate next per-contract number like:
- `VO-001`
- `VO-002`

Keep it simple and deterministic.

---

## CONTROLLER LAYER

Extend `ContractController` or add a focused controller such as:

- `ContractVariationController`

Locked preference:
- keep routes under `contracts.*`
- focused controller is acceptable if cleaner

Must provide at minimum:

### New actions
- `storeVariation`
- `submitVariation`
- `approveVariation`
- `rejectVariation`

Optional:
- `updateVariation` for editing drafts only

### Requirements
Each action must:
- authorize appropriately
- validate payload
- call service
- log activity
- redirect back with success / error

---

## ROUTES

Add routes under `contracts.*`, recommended:

- `contracts.variations.store`
- `contracts.variations.update` (optional, if implemented)
- `contracts.variations.submit`
- `contracts.variations.approve`
- `contracts.variations.reject`

Example:
- `POST /contracts/{contract}/variations`
- `PUT /contracts/{contract}/variations/{variation}`
- `POST /contracts/{contract}/variations/{variation}/submit`
- `POST /contracts/{contract}/variations/{variation}/approve`
- `POST /contracts/{contract}/variations/{variation}/reject`

Keep route naming consistent.

---

## UI / PAGES TO BUILD

## Main implementation target
Enhance the existing **contract show page** with a compact Variation Register section.

### 1) Variation summary card
Show:
- total variations
- approved variations
- approved commercial delta total
- approved time delta total

### 2) Eligibility / readiness message
When contract cannot yet manage variations:
- show compact issues list:
  - contract not executed
  - administration not initialized
etc.

### 3) Create variation form
Allow creation of a draft variation with:
- title
- type
- reason
- description
- commercial_delta
- currency
- time_delta_days

Only show when user has permission and contract is eligible.

### 4) Variation list / register
Compact table/list showing:
- variation_no
- title
- type
- status
- commercial delta
- time delta days
- submitted/approved/rejected timestamps
- decision notes

### 5) Per-variation actions
At minimum:
- submit (when draft)
- approve (when submitted)
- reject (when submitted)

### 6) Draft editing (optional but recommended)
Allow basic editing for draft variations only:
- title
- type
- reason
- description
- commercial_delta
- currency
- time_delta_days

If implemented, keep it compact inline or modal-free if possible.

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Minimum expectations:
- view variation list uses existing contract view permission
- create/update/submit/approve/reject requires strong contract-management permission

### Locked rule
Do not invent a new auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.variation_created`
- `contracts.contract.variation_submitted`
- `contracts.contract.variation_approved`
- `contracts.contract.variation_rejected`
- optionally `contracts.contract.variation_updated`
- optionally `contracts.contract.variation_summary_refreshed`

Suggested payloads:
- variation id
- variation_no
- variation type
- old/new status
- commercial delta
- time delta days

Use `ActivityLogger` for feed consistency.

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Variations
- variations
- variation register
- variation number
- create variation
- submit variation
- approve variation
- reject variation
- variation type
- commercial
- time
- commercial + time
- administrative
- draft
- submitted
- approved
- rejected
- commercial delta
- time delta days
- decision notes
- variation summary
- approved variation value
- approved variation days
- not eligible for variations
- administration baseline required

Extend `contracts.php`.

---

## NAVIGATION

No new top-level nav item is required.

This remains inside the Contracts module.

---

## SEEDING

No new seeders are required for this phase.

---

## NON-GOALS (STRICT)

Do not add:
- BOQ/line-level variation details
- amendments document engine
- claims/EOT
- invoices/payments
- obligations engine
- integrations
- AI

Stay inside Phase 12.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- keep services modular
- do not bury variation workflow logic in controllers
- preserve Phase 9 lock behavior
- preserve Phase 10 signature/execution behavior
- preserve Phase 11 administration behavior
- do not break previous phases

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contracts`
4. Exact schema for `contract_variations`
5. Models created/updated
6. Service(s) added for contract variations
7. How variation eligibility check works
8. How variation creation/submission/approval/rejection works
9. How contract variation summary rollups work
10. What routes/pages were added or enhanced
11. What policy/permission approach was used
12. What activity logging events were wired
13. What translation keys were added
14. Confirm `npm run build` passes
15. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- executed/admin-initialized contracts can register variations
- variation workflow supports draft/submitted/approved/rejected
- approved variations update contract-level summary rollups
- show page surfaces variation register and summary
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about UI placement, enhance the existing contract show page with compact variation summary/create/register panels rather than creating a large new subsystem.
