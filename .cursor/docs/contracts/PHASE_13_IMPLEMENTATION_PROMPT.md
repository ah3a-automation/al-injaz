# Contract Module — Phase 13
## Final Implementation Prompt
## Phase 13: Contract Invoices / Payment Register Baseline

---

## TASK

Implement **only Phase 13** of the Contract Module.

This phase introduces the first controlled **invoice / payment register baseline** for administered contracts.

This phase must allow internal users to:

- create a contract invoice/payment application record
- classify invoice type
- track invoice number, amount, currency, period, and notes
- move invoices through a simple internal workflow
- approve or reject invoices
- track paid vs unpaid summary at contract header level
- preserve append-only history and full auditability

This phase is a **baseline invoice register**, not a full payment certification or ERP integration engine.

---

## STRICT SCOPE

### IN SCOPE
- invoice register
- invoice numbering/reference
- invoice type classification
- simple invoice statuses
- amount/currency fields
- optional period coverage fields
- approval / rejection flow
- contract-level rolled-up invoice summary fields
- compact UI on contract show page
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- payment certificate workflow
- retention calculation engine
- VAT/tax engine
- ERP/accounting integration
- bank reconciliation
- workflow for partial allocations across multiple contracts
- claims/variation-driven payment automation
- AI assistance
- external integrations

Stay strictly inside Phase 13.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Invoices are supplementary to the contract header
The `contracts` table remains the canonical contract header.

Invoices are child records of a contract.

### Rule 2 — Invoice history must be append-only
Invoice rows are not deleted.
Approval/rejection and payment-state changes are tracked by status/timestamps/activity logs.

### Rule 3 — This phase is header-level only
Do not build BOQ progress measurement or certification logic in this phase.

### Rule 4 — Contract must already be live/administered
Locked minimum precondition:
- contract status must be `executed`
- administration baseline should already be initialized

### Rule 5 — Paid summary is a roll-up
Contract header keeps only rolled-up summary fields.
Do not replace invoice rows with header-only accounting.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Invoice types
Use exactly:

- `advance`
- `interim`
- `final`
- `administrative`

### Meaning
- `advance` = advance-payment related invoice
- `interim` = regular progress/interim invoice
- `final` = final invoice
- `administrative` = non-standard administrative invoice record

Do not add more types in this phase.

---

## Invoice statuses
Use exactly:

- `draft`
- `submitted`
- `approved`
- `rejected`
- `paid`

### Meaning
- `draft` = internal draft only
- `submitted` = formally submitted internally
- `approved` = approved for payment
- `rejected` = rejected internally
- `paid` = recorded as paid

Do not add:
- certified
- partially_paid
- overdue
- cancelled
- reversed

Those belong to later phases if needed.

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
9. `.cursor/docs/contracts/PHASE_11_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_12_IMPLEMENTATION_PROMPT.md`

Also inspect current implementation of:
- `Contract`
- `ContractVariation`
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

- `invoice_total_submitted` decimal(18,2) nullable default 0
- `invoice_total_approved` decimal(18,2) nullable default 0
- `invoice_total_paid` decimal(18,2) nullable default 0
- `invoice_count_total` integer nullable default 0
- `invoice_count_approved` integer nullable default 0
- `invoice_count_paid` integer nullable default 0

These are rolled-up summary fields only.

---

## Create `contract_invoices`
Create a new table:

- `contract_invoices`

### Required columns
- `id` UUID PK
- `contract_id` FK → contracts
- `invoice_no` string(100)
- `invoice_type` string(30)
- `status` string(30)
- `title` string(255)
- `description` text nullable
- `amount` decimal(18,2)
- `currency` string(10)
- `period_from` nullable timestampTz
- `period_to` nullable timestampTz
- `submitted_at` nullable timestampTz
- `submitted_by_user_id` nullable FK → users
- `approved_at` nullable timestampTz
- `approved_by_user_id` nullable FK → users
- `rejected_at` nullable timestampTz
- `rejected_by_user_id` nullable FK → users
- `paid_at` nullable timestampTz
- `paid_by_user_id` nullable FK → users
- `decision_notes` text nullable
- `created_by_user_id` nullable FK → users
- `updated_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

### Constraints
- check `invoice_type in ('advance','interim','final','administrative')`
- check `status in ('draft','submitted','approved','rejected','paid')`
- unique `(contract_id, invoice_no)`
- index on `contract_id`

### Numbering
Invoice numbering can be simple and scoped per contract in this phase.

Locked expectation:
- service generates next invoice number deterministically
- for example: `INV-001`, `INV-002`, etc.

---

## MODEL LAYER

### Update `Contract`
Add fillable/casts for:
- `invoice_total_submitted`
- `invoice_total_approved`
- `invoice_total_paid`
- `invoice_count_total`
- `invoice_count_approved`
- `invoice_count_paid`

Add relation:
- `invoices()`

Add helper:
- `canManageInvoices()`
  - locked logic:
    - true only when contract is executed
    - and administration is initialized

### Create `ContractInvoice`
Add constants:
- invoice type constants
- invoice status constants

Add fillable fields matching schema.

Add casts for:
- money
- timestamps

Add relations:
- `contract()`
- `submittedBy()`
- `approvedBy()`
- `rejectedBy()`
- `paidBy()`
- `createdBy()`
- `updatedBy()`

Add helpers:
- `isDraft()`
- `isSubmitted()`
- `isApproved()`
- `isRejected()`
- `isPaid()`

---

## SERVICE LAYER

Do not put invoice workflow logic in controllers.

Create a dedicated service such as:

- `ContractInvoiceService`

It must handle at minimum:

### 1) `checkInvoiceEligibility(Contract $contract): array`
Return:
- `is_ready` boolean
- `issues` array

Minimum checks:
- contract status is `executed`
- administration baseline is initialized

### 2) `createInvoice(Contract $contract, array $payload, User $actor): ContractInvoice`
Behavior:
- verify eligibility
- generate next invoice number
- create invoice in `draft`
- set creator/updater
- refresh contract invoice summary

### 3) `updateInvoice(ContractInvoice $invoice, array $payload, User $actor): ContractInvoice`
Behavior:
- only allowed from `draft`
- update title/description/type/amount/currency/period
- refresh summary if needed

### 4) `submitInvoice(ContractInvoice $invoice, User $actor): ContractInvoice`
Behavior:
- only allowed from `draft`
- set status `submitted`
- set `submitted_at`, `submitted_by_user_id`
- refresh summary

### 5) `approveInvoice(ContractInvoice $invoice, User $actor, ?string $notes = null): ContractInvoice`
Behavior:
- only allowed from `submitted`
- set status `approved`
- set `approved_at`, `approved_by_user_id`
- set `decision_notes`
- clear rejected fields if needed
- refresh summary

### 6) `rejectInvoice(ContractInvoice $invoice, User $actor, ?string $notes = null): ContractInvoice`
Behavior:
- only allowed from `submitted`
- set status `rejected`
- set `rejected_at`, `rejected_by_user_id`
- set `decision_notes`
- clear approval fields if needed
- refresh summary

### 7) `markPaid(ContractInvoice $invoice, User $actor, ?string $notes = null): ContractInvoice`
Behavior:
- only allowed from `approved`
- set status `paid`
- set `paid_at`, `paid_by_user_id`
- optionally append/replace `decision_notes`
- refresh summary

### 8) `refreshContractInvoiceSummary(Contract $contract): Contract`
Recalculate from DB:
- total invoice count
- approved invoice count
- paid invoice count
- submitted total sum
- approved total sum
- paid total sum

### 9) `nextInvoiceNumber(Contract $contract): string`
Generate next per-contract number like:
- `INV-001`
- `INV-002`

Keep it simple and deterministic.

---

## CONTROLLER LAYER

Extend `ContractController` or add a focused controller such as:

- `ContractInvoiceController`

Locked preference:
- keep routes under `contracts.*`
- focused controller is acceptable if cleaner

Must provide at minimum:

### New actions
- `storeInvoice`
- `updateInvoice`
- `submitInvoice`
- `approveInvoice`
- `rejectInvoice`
- `markPaid`

Each action must:
- authorize appropriately
- validate payload
- call service
- log activity
- redirect back with success / error

---

## ROUTES

Add routes under `contracts.*`, recommended:

- `contracts.invoices.store`
- `contracts.invoices.update`
- `contracts.invoices.submit`
- `contracts.invoices.approve`
- `contracts.invoices.reject`
- `contracts.invoices.mark-paid`

Example:
- `POST /contracts/{contract}/invoices`
- `PUT /contracts/{contract}/invoices/{invoice}`
- `POST /contracts/{contract}/invoices/{invoice}/submit`
- `POST /contracts/{contract}/invoices/{invoice}/approve`
- `POST /contracts/{contract}/invoices/{invoice}/reject`
- `POST /contracts/{contract}/invoices/{invoice}/mark-paid`

Keep route naming consistent.

---

## UI / PAGES TO BUILD

## Main implementation target
Enhance the existing **contract show page** with a compact Invoice Register section.

### 1) Invoice summary card
Show:
- total invoices
- approved invoices
- paid invoices
- total submitted amount
- total approved amount
- total paid amount

### 2) Eligibility / readiness message
When contract cannot yet manage invoices:
- show compact issues list:
  - contract not executed
  - administration baseline not initialized

### 3) Create invoice form
Allow creation of a draft invoice with:
- title
- invoice type
- description
- amount
- currency
- period_from
- period_to

Only show when user has permission and contract is eligible.

### 4) Invoice register
Compact table/list showing:
- invoice_no
- title
- type
- status
- amount
- currency
- period
- submitted/approved/rejected/paid timestamps
- decision notes

### 5) Per-invoice actions
At minimum:
- update (when draft)
- submit (when draft)
- approve (when submitted)
- reject (when submitted)
- mark paid (when approved)

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Minimum expectations:
- view invoice list uses existing contract view permission
- create/update/submit/approve/reject/mark paid requires strong contract-management permission

### Locked rule
Do not invent a new auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.invoice_created`
- `contracts.contract.invoice_updated`
- `contracts.contract.invoice_submitted`
- `contracts.contract.invoice_approved`
- `contracts.contract.invoice_rejected`
- `contracts.contract.invoice_paid`

Suggested payloads:
- invoice id
- invoice_no
- invoice type
- old/new status
- amount
- currency

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Invoices
- invoices
- invoice register
- invoice number
- create invoice
- update invoice
- submit invoice
- approve invoice
- reject invoice
- mark paid
- invoice type
- advance
- interim
- final
- administrative
- draft
- submitted
- approved
- rejected
- paid
- amount
- currency
- period from
- period to
- decision notes
- invoice summary
- submitted total
- approved total
- paid total
- not eligible for invoices
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
- payment certificates
- retention engine
- VAT/tax engine
- ERP integration
- bank reconciliation
- AI
- claims/payment linkage

Stay inside Phase 13.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- keep services modular
- do not bury invoice workflow logic in controllers
- preserve Phase 9 lock behavior
- preserve Phase 10 signature/execution behavior
- preserve Phase 11 administration behavior
- preserve Phase 12 variation behavior
- do not break previous phases

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contracts`
4. Exact schema for `contract_invoices`
5. Models created/updated
6. Service(s) added for contract invoices
7. How invoice eligibility check works
8. How invoice creation/update/submission/approval/rejection/payment works
9. How contract invoice summary rollups work
10. What routes/pages were added or enhanced
11. What policy/permission approach was used
12. What activity logging events were wired
13. What translation keys were added
14. Confirm `npm run build` passes
15. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- executed/admin-initialized contracts can register invoices
- invoice workflow supports draft/submitted/approved/rejected/paid
- contract-level invoice summary rollups update correctly
- show page surfaces invoice register and summary
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about UI placement, enhance the existing contract show page with compact invoice summary/create/register panels rather than creating a large new subsystem.
