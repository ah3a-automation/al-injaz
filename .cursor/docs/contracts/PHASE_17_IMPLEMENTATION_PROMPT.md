# Contract Module — Phase 17
## Final Implementation Prompt
## Phase 17: Claims / Notices Baseline

---

## TASK

Implement **only Phase 17** of the Contract Module.

This phase introduces the first structured **claims and notices register** for contracts.

This phase must allow internal users to:
- create contract claims
- create contract notices
- track their status and dates
- preserve append-only history through activity and record timestamps
- surface compact claims/notices summary and registers on the contract show page

This phase is a baseline legal/commercial register, not a litigation or entitlement engine.

---

## STRICT SCOPE

### IN SCOPE
- claims register
- notices register
- type/status/date fields
- compact UI on contract show page
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- arbitration/litigation workflows
- legal document generation
- advanced entitlement analysis
- AI assistance
- integrations

Stay strictly inside Phase 17.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Claims and notices are child records of a contract
Contract header remains source of truth.

### Rule 2 — Registers are append-only in practice
Do not delete rows.
Track lifecycle through statuses and timestamps.

### Rule 3 — This is baseline tracking only
No legal case management engine.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Claim statuses
- `draft`
- `submitted`
- `under_review`
- `resolved`
- `rejected`

## Notice statuses
- `draft`
- `issued`
- `responded`
- `closed`

Do not add extra statuses in this phase.

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
9. `.cursor/docs/contracts/PHASE_15_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_16_IMPLEMENTATION_PROMPT.md`
11. `.cursor/docs/contracts/PHASE_17_IMPLEMENTATION_PROMPT.md`

Also inspect current contract show page and activity patterns.

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

---

## DATA MODEL / SCHEMA TO ADD

## Create `contract_claims`
Required columns:
- `id` UUID PK
- `contract_id`
- `claim_no` string(100)
- `title` string(255)
- `description` text nullable
- `status` string(30)
- `submitted_at` nullable timestampTz
- `resolved_at` nullable timestampTz
- `rejected_at` nullable timestampTz
- `notes` text nullable
- `created_by_user_id`
- `updated_by_user_id`
- timestamps

Constraint:
- status in locked values
- unique `(contract_id, claim_no)`

## Create `contract_notices`
Required columns:
- `id` UUID PK
- `contract_id`
- `notice_no` string(100)
- `title` string(255)
- `description` text nullable
- `status` string(30)
- `issued_at` nullable timestampTz
- `responded_at` nullable timestampTz
- `closed_at` nullable timestampTz
- `notes` text nullable
- `created_by_user_id`
- `updated_by_user_id`
- timestamps

Constraint:
- status in locked values
- unique `(contract_id, notice_no)`

---

## MODEL LAYER

Create:
- `ContractClaim`
- `ContractNotice`

Update `Contract` with:
- `claims()`
- `notices()`
- helper for basic eligibility if needed

---

## SERVICE LAYER

Create:
- `ContractClaimService`
- `ContractNoticeService`

Claims:
- create
- update draft
- submit
- move to under_review
- resolve
- reject
- next numbering

Notices:
- create
- update draft
- issue
- respond
- close
- next numbering

---

## CONTROLLER LAYER

Add:
- `ContractClaimController`
- `ContractNoticeController`

---

## ROUTES

Under `contracts.*`:
- claims store/update/submit/review/resolve/reject
- notices store/update/issue/respond/close

Keep naming consistent.

---

## UI / PAGES TO BUILD

Enhance contract show page with:

### Claims section
- summary counts
- create form
- register table
- actions by status

### Notices section
- summary counts
- create form
- register table
- actions by status

---

## POLICY / PERMISSION RULES

Use existing contract authorization architecture.

---

## ACTIVITY LOGGING

Claims:
- `contracts.contract.claim_created`
- `contracts.contract.claim_submitted`
- `contracts.contract.claim_under_review`
- `contracts.contract.claim_resolved`
- `contracts.contract.claim_rejected`

Notices:
- `contracts.contract.notice_created`
- `contracts.contract.notice_issued`
- `contracts.contract.notice_responded`
- `contracts.contract.notice_closed`

---

## TRANSLATIONS

Add EN + AR keys for:
- claims
- notices
- claim number
- notice number
- all locked statuses
- create/submit/issue/respond/close/resolve/reject
- summary/register labels

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
3. Exact schema for `contract_claims`
4. Exact schema for `contract_notices`
5. Models created/updated
6. Service(s) added
7. How claim workflow works
8. How notice workflow works
9. What routes/pages were added or enhanced
10. What policy/permission approach was used
11. What activity logging events were wired
12. What translation keys were added
13. Confirm `npm run build` passes
14. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

Complete only if:
- claims register works
- notices register works
- locked statuses are respected
- show page surfaces both sections
- build passes
