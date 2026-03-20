# Contract Module — Phase 16
## Final Implementation Prompt
## Phase 16: Retention / Release Baseline

---

## TASK

Implement **only Phase 16** of the Contract Module.

This phase introduces the first baseline **retention / release register** for administered contracts.

This phase must allow internal users to:
- track retention held at contract level
- create retention release requests
- move release requests through a simple internal workflow
- record released amounts
- preserve append-only release history
- surface compact retention summary and release register on the contract show page

This phase is a baseline retention register, not a finance or payment certification engine.

---

## STRICT SCOPE

### IN SCOPE
- contract-level retention summary
- retention release request register
- release status workflow
- compact UI on contract show page
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- payment certificate engine
- reconciliation
- bank integration
- accounting sync
- retention calculation from invoices automatically
- AI assistance
- external integrations

Stay strictly inside Phase 16.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Retention is supplementary to the contract header
Contract remains source of truth.
Retention release requests are child records.

### Rule 2 — Release history must be append-only
Do not delete release rows.
Status changes must be auditable.

### Rule 3 — This is a baseline register only
No finance engine.

### Rule 4 — Retention release follows execution/admin maturity
Locked minimum precondition:
- contract is executed
- administration initialized

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Release statuses
Use exactly:
- `pending`
- `submitted`
- `approved`
- `rejected`
- `released`

Do not add:
- cancelled
- reversed
- partially_released
- superseded

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
11. `.cursor/docs/contracts/PHASE_16_IMPLEMENTATION_PROMPT.md`

Also inspect:
- `Contract`
- `ContractInvoice`
- `ContractController`
- contract show page
- existing activity logging style

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Add:
- `retention_total_held` decimal(18,2) nullable default 0
- `retention_total_released` decimal(18,2) nullable default 0
- `retention_total_pending` decimal(18,2) nullable default 0

---

## Create `contract_retention_releases`
Required columns:
- `id` UUID PK
- `contract_id` FK → contracts
- `release_no` string(100)
- `status` string(30)
- `amount` decimal(18,2)
- `currency` string(10)
- `reason` text nullable
- `submitted_at` nullable timestampTz
- `submitted_by_user_id` nullable FK → users
- `approved_at` nullable timestampTz
- `approved_by_user_id` nullable FK → users
- `rejected_at` nullable timestampTz
- `rejected_by_user_id` nullable FK → users
- `released_at` nullable timestampTz
- `released_by_user_id` nullable FK → users
- `decision_notes` text nullable
- `created_by_user_id` nullable FK → users
- `updated_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

### Constraints
- unique `(contract_id, release_no)`
- check `status in ('pending','submitted','approved','rejected','released')`
- index on `contract_id`

---

## MODEL LAYER

### Update `Contract`
Add fillable/casts for retention summary fields.
Add relation:
- `retentionReleases()`
Add helper:
- `canManageRetentionReleases()`

### Create `ContractRetentionRelease`
Add constants, fillable, casts, relations:
- `contract()`
- `submittedBy()`
- `approvedBy()`
- `rejectedBy()`
- `releasedBy()`
- `createdBy()`
- `updatedBy()`

Add helpers:
- `isPending()`
- `isSubmitted()`
- `isApproved()`
- `isRejected()`
- `isReleased()`

---

## SERVICE LAYER

Create:
- `ContractRetentionReleaseService`

Must handle:

### 1) `checkRetentionEligibility(Contract $contract): array`

### 2) `createReleaseRequest(Contract $contract, array $payload, User $actor): ContractRetentionRelease`
Create in `pending`.

### 3) `submitRelease(ContractRetentionRelease $release, User $actor): ContractRetentionRelease`
pending → submitted

### 4) `approveRelease(ContractRetentionRelease $release, User $actor, ?string $notes = null): ContractRetentionRelease`
submitted → approved

### 5) `rejectRelease(ContractRetentionRelease $release, User $actor, ?string $notes = null): ContractRetentionRelease`
submitted → rejected

### 6) `markReleased(ContractRetentionRelease $release, User $actor, ?string $notes = null): ContractRetentionRelease`
approved → released

### 7) `refreshRetentionSummary(Contract $contract): Contract`
Recalculate:
- released total
- pending total
- held total if appropriate for this phase baseline

### 8) `nextReleaseNumber(Contract $contract): string`
Generate:
- `REL-001`
- `REL-002`

---

## CONTROLLER LAYER

Add:
- `ContractRetentionReleaseController`

Actions:
- `store`
- `submit`
- `approve`
- `reject`
- `markReleased`

---

## ROUTES

Under `contracts.*`:
- `contracts.retention.store`
- `contracts.retention.submit`
- `contracts.retention.approve`
- `contracts.retention.reject`
- `contracts.retention.mark-released`

---

## UI / PAGES TO BUILD

Enhance contract show page with:

### 1) Retention summary card
- held total
- pending total
- released total

### 2) Eligibility message
Show issues clearly.

### 3) Create release request form
- amount
- currency
- reason

### 4) Release register
- release_no
- status
- amount
- currency
- submitted/approved/released timestamps
- decision notes

### 5) Actions
- submit
- approve
- reject
- mark released

---

## POLICY / PERMISSION RULES

Use existing contract authorization architecture.
No new auth framework.

---

## ACTIVITY LOGGING

At minimum:
- `contracts.contract.retention_release_created`
- `contracts.contract.retention_release_submitted`
- `contracts.contract.retention_release_approved`
- `contracts.contract.retention_release_rejected`
- `contracts.contract.retention_release_marked_released`

---

## TRANSLATIONS

Add EN + AR keys for:
- retention
- retention release
- release number
- amount
- pending / submitted / approved / rejected / released
- create release
- mark released
- retention summary
- held total / pending total / released total

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
4. Exact schema for `contract_retention_releases`
5. Models created/updated
6. Service(s) added for retention release handling
7. How eligibility works
8. How create/submit/approve/reject/release work
9. How retention summary rollups work
10. What routes/pages were added or enhanced
11. What policy/permission approach was used
12. What activity logging events were wired
13. What translation keys were added
14. Confirm `npm run build` passes
15. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

Complete only if:
- eligible contracts can create retention release requests
- release workflow works
- summary rollups update
- show page surfaces retention summary/register
- build passes
