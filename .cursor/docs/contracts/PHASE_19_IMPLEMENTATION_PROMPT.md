# Contract Module — Phase 19
## Final Implementation Prompt
## Phase 19: Obligations / Deliverables Baseline

---

## TASK

Implement **only Phase 19** of the Contract Module.

This phase introduces a baseline **obligations / deliverables register** for contracts.

This phase must allow internal users to:
- record obligations/deliverables from the contract
- assign responsible party type
- track due date and status
- capture notes/evidence links textually
- surface a compact obligations register on the contract show page

This is a contract-governed obligations register, not a general project task engine.

---

## STRICT SCOPE

### IN SCOPE
- obligations/deliverables register
- responsible party type
- due date
- status tracking
- notes/evidence text
- compact UI on contract show page
- activity logging
- translations

### OUT OF SCOPE
- reminders/escalations
- PM task engine replacement
- SLA engine
- integrations
- AI extraction

Stay strictly inside Phase 19.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Obligation statuses
- `not_started`
- `in_progress`
- `submitted`
- `fulfilled`
- `overdue`

## Party types
- `internal`
- `supplier`
- `client`
- `consultant`

Do not add more in this phase.

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
9. `.cursor/docs/contracts/PHASE_17_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_18_IMPLEMENTATION_PROMPT.md`
11. `.cursor/docs/contracts/PHASE_19_IMPLEMENTATION_PROMPT.md`

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

---

## DATA MODEL / SCHEMA TO ADD

## Create `contract_obligations`
Required columns:
- `id` UUID PK
- `contract_id`
- `reference_no` string(100)
- `title` string(255)
- `description` text nullable
- `party_type` string(30)
- `status` string(30)
- `due_at` nullable timestampTz
- `submitted_at` nullable timestampTz
- `fulfilled_at` nullable timestampTz
- `notes` text nullable
- `created_by_user_id`
- `updated_by_user_id`
- timestamps

Constraints:
- check status in locked values
- check party_type in locked values
- unique `(contract_id, reference_no)`
- index on contract_id

---

## MODEL LAYER

Create:
- `ContractObligation`

Update `Contract`:
- `obligations()`

Add helpers if useful.

---

## SERVICE LAYER

Create:
- `ContractObligationService`

Must handle:
- create obligation
- update obligation
- update status
- next reference numbering

Suggested numbering:
- `OBL-001`
- `OBL-002`

### Overdue rule
A simple display/runtime helper may mark records as overdue when:
- due date passed
- status not fulfilled

Do not create a complex scheduler.

---

## CONTROLLER LAYER

Add:
- `ContractObligationController`

Actions:
- store
- update
- updateStatus

---

## ROUTES

Under `contracts.*`:
- `contracts.obligations.store`
- `contracts.obligations.update`
- `contracts.obligations.update-status`

---

## UI / PAGES TO BUILD

Enhance contract show page with:

### 1) Obligations summary
- total count
- count by status

### 2) Create form
- title
- description
- party type
- due date
- notes

### 3) Register table
- reference
- title
- party type
- status
- due date
- submitted_at
- fulfilled_at
- notes

### 4) Status actions
At minimum:
- mark in progress
- mark submitted
- mark fulfilled

Overdue can be displayed automatically when applicable.

---

## POLICY / PERMISSION RULES

Use existing contract authorization architecture.

---

## ACTIVITY LOGGING

At minimum:
- `contracts.contract.obligation_created`
- `contracts.contract.obligation_updated`
- `contracts.contract.obligation_status_changed`

---

## TRANSLATIONS

Add EN + AR keys for:
- obligations
- deliverables
- reference number
- party type
- internal / supplier / client / consultant
- not started / in progress / submitted / fulfilled / overdue
- due date
- submitted at
- fulfilled at
- create/update actions
- summary labels

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
3. Exact schema for `contract_obligations`
4. Models created/updated
5. Service(s) added
6. How obligation create/update/status workflow works
7. What routes/pages were added or enhanced
8. What policy/permission approach was used
9. What activity logging events were wired
10. What translation keys were added
11. Confirm `npm run build` passes
12. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

Complete only if:
- obligations register works
- locked statuses and party types are respected
- show page surfaces the register
- build passes
