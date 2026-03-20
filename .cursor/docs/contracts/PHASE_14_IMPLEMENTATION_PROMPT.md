# Contract Module — Phase 14
## Final Implementation Prompt
## Phase 14: Contract Closeout Baseline

---

## TASK

Implement **only Phase 14** of the Contract Module.

This phase introduces the first controlled workflow for **contract closeout baseline** after the contract has already progressed through:
- execution
- administration baseline
- variation baseline
- invoice baseline

This phase must allow internal users to:
- assess whether a contract is ready for closeout
- record closeout baseline information on the contract header
- explicitly initialize closeout
- explicitly mark closeout complete
- preserve append-only closeout history
- surface closeout readiness, summary, and history on the contract show page

This is the **baseline closeout register**, not a full project handover, warranty, or archive engine.

---

## STRICT SCOPE

### IN SCOPE
- closeout readiness check
- closeout summary fields on contract
- append-only closeout history
- practical completion / final completion dates
- closeout notes
- explicit initialize-closeout action
- explicit mark-closeout-complete action
- compact UI on contract show page
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- defects liability / warranty engine
- retention release workflow
- final account workflow
- lessons learned workflow
- archive/document handover automation
- asset transfer workflow
- legal closure workflow
- AI assistance
- external integrations

Stay strictly inside Phase 14.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Closeout is supplementary to the contract header
The `contracts` table remains the canonical contract header.

Closeout records are supplementary append-only records.

### Rule 2 — Closeout history must be append-only
Closeout records are not deleted.
Each initialization or completion event must preserve history.

### Rule 3 — Closeout is explicit
Do not auto-close contracts.
Users must explicitly initialize closeout and explicitly complete closeout.

### Rule 4 — This phase is baseline only
Do not build DLP, warranty, retention release, or archive workflows here.

### Rule 5 — Closeout requires an operationally mature contract
Locked minimum precondition:
- contract status must be `executed`
- administration baseline should be initialized

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Closeout statuses
Use exactly:

- `not_ready`
- `ready_for_closeout`
- `closed_out`

### Meaning
- `not_ready` = closeout not yet initialized or blockers still exist
- `ready_for_closeout` = closeout baseline initialized and waiting for completion
- `closed_out` = contract closeout explicitly completed

Do not add:
- archived
- final_account_pending
- warranty_open
- suspended
- voided

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
11. `.cursor/docs/contracts/PHASE_13_IMPLEMENTATION_PROMPT.md`

Also inspect current implementation of:
- `Contract`
- `ContractAdministrationBaseline`
- `ContractVariation`
- `ContractInvoice`
- `ContractController`
- contract show page
- existing activity logging style

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Add the following columns:

- `closeout_status` string(30) NOT NULL default `'not_ready'`
- `closeout_initialized_at` nullable timestampTz
- `closeout_initialized_by_user_id` nullable FK → users
- `closeout_completed_at` nullable timestampTz
- `closeout_completed_by_user_id` nullable FK → users
- `practical_completion_at` nullable timestampTz
- `final_completion_at` nullable timestampTz
- `closeout_notes` nullable text

### Constraint
Add check constraint:

- `closeout_status in ('not_ready','ready_for_closeout','closed_out')`

Do not add a separate contract status tree for closeout.
Keep `contracts.status` unchanged.

---

## Create `contract_closeout_records`
Create a new append-only table:

- `contract_closeout_records`

### Required columns
- `id` UUID PK
- `contract_id` FK → contracts
- `closeout_status`
- `practical_completion_at` nullable timestampTz
- `final_completion_at` nullable timestampTz
- `closeout_notes` nullable text
- `prepared_by_user_id` nullable FK → users
- `prepared_at` timestampTz
- `created_at`
- `updated_at`

### Constraints
- check `closeout_status in ('not_ready','ready_for_closeout','closed_out')`
- index on `contract_id`

### Meaning
Each initialization/completion event writes a new append-only closeout snapshot.

---

## MODEL LAYER

### Update `Contract`
Add constants:
- `CLOSEOUT_STATUS_NOT_READY`
- `CLOSEOUT_STATUS_READY_FOR_CLOSEOUT`
- `CLOSEOUT_STATUS_CLOSED_OUT`

Add fillable fields:
- `closeout_status`
- `closeout_initialized_at`
- `closeout_initialized_by_user_id`
- `closeout_completed_at`
- `closeout_completed_by_user_id`
- `practical_completion_at`
- `final_completion_at`
- `closeout_notes`

Add casts:
- timestamp fields as datetime

Add relationships:
- `closeoutRecords()`
- `closeoutInitializedBy()`
- `closeoutCompletedBy()`

Add helpers:
- `isReadyForCloseout()`
- `isClosedOut()`
- `canInitializeCloseout()`
- `canCompleteCloseout()`

Locked logic:
- initialize only when contract is `executed` and administration is initialized
- complete only when `closeout_status === ready_for_closeout`

### Create `ContractCloseoutRecord`
Add fillable fields matching schema.
Add relations:
- `contract()`
- `preparedBy()`

---

## SERVICE LAYER

Create a dedicated service such as:

- `ContractCloseoutService`

It must handle at minimum:

### 1) `checkCloseoutReadiness(Contract $contract): array`
Return:
- `is_ready` boolean
- `issues` array

Minimum checks:
- contract status is `executed`
- administration baseline is initialized

Keep this lightweight.

### 2) `initializeCloseout(Contract $contract, array $payload, User $actor): ContractCloseoutRecord`
Behavior:
- ensure contract is eligible
- create append-only closeout record with:
  - `closeout_status = ready_for_closeout`
  - completion dates / notes from payload
- update contract header:
  - `closeout_status = ready_for_closeout`
  - `closeout_initialized_at = now()`
  - `closeout_initialized_by_user_id = actor`
  - `practical_completion_at`
  - `final_completion_at`
  - `closeout_notes`
- return the closeout record

### 3) `completeCloseout(Contract $contract, User $actor, ?string $notes = null): ContractCloseoutRecord`
Behavior:
- only allowed from `ready_for_closeout`
- create append-only closeout record with:
  - `closeout_status = closed_out`
  - copy current closeout fields from header
  - optionally override notes
- update contract header:
  - `closeout_status = closed_out`
  - `closeout_completed_at = now()`
  - `closeout_completed_by_user_id = actor`
- return the new closeout record

---

## CONTROLLER LAYER

Add a focused controller such as:

- `ContractCloseoutController`

### New actions
- `initializeCloseout`
- `completeCloseout`

Each action must:
- authorize appropriately
- validate payload
- call service
- log activity
- redirect back with success / error

---

## ROUTES

Add routes under `contracts.*`, recommended:

- `contracts.closeout.initialize`
- `contracts.closeout.complete`

Example:
- `POST /contracts/{contract}/closeout/initialize`
- `POST /contracts/{contract}/closeout/complete`

---

## UI / PAGES TO BUILD

Enhance the existing **contract show page**.

### 1) Closeout summary card
Show:
- closeout status
- initialized at/by
- completed at/by
- practical completion date
- final completion date
- closeout notes

### 2) Readiness block
When contract is not eligible:
- show compact issues list

### 3) Initialize closeout form
When eligible and not yet ready/closed:
- practical completion date
- final completion date
- closeout notes

### 4) Complete closeout action
When `closeout_status === ready_for_closeout`:
- show button `Mark closeout complete`

### 5) Closeout history
Compact append-only list showing:
- closeout status
- prepared by
- prepared at
- completion dates
- notes

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

- view uses existing contract view permission
- initialize/complete closeout uses strong contract-management permission

Do not invent a new auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.closeout_initialized`
- `contracts.contract.closeout_completed`

Suggested payloads:
- closeout record id
- closeout status
- practical completion date
- final completion date

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

- closeout
- closeout status
- not ready
- ready for closeout
- closed out
- initialize closeout
- complete closeout
- closeout readiness
- closeout history
- practical completion date
- final completion date
- closeout notes
- initialized at
- initialized by
- completed at
- completed by

Extend `contracts.php`.

---

## NAVIGATION

No new top-level nav item is required.

---

## SEEDING

No new seeders are required.

---

## NON-GOALS (STRICT)

Do not add:
- warranty engine
- retention release
- claims
- archive automation
- AI
- integrations

Stay inside Phase 14.

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contracts`
4. Exact schema for `contract_closeout_records`
5. Models created/updated
6. Service(s) added for closeout
7. How closeout readiness works
8. How initialize/complete closeout works
9. What routes/pages were added or enhanced
10. What policy/permission approach was used
11. What activity logging events were wired
12. What translation keys were added
13. Confirm `npm run build` passes
14. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:
- executed/admin-initialized contracts can initialize closeout
- closeout can be explicitly completed
- closeout history is append-only
- show page surfaces readiness/summary/history
- build passes
