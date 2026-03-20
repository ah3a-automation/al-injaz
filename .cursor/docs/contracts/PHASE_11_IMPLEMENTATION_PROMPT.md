# Contract Module — Phase 11
## Final Implementation Prompt
## Phase 11: Post-Execution Contract Administration Baseline

---

## TASK

Implement **only Phase 11** of the Contract Module.

This phase begins **after Phase 10**, once a contract can already reach:

- `executed`

Phase 11 introduces the first controlled layer of **post-execution contract administration**, focused on the baseline administrative record after execution.

This phase must allow internal users to:

- record the official contract commencement / administration baseline
- store key execution-administration metadata on the contract header
- define the core commercial administration values that govern the live contract
- track the baseline document/admin package readiness
- surface a compact executed-contract administration summary
- preserve full auditability

This is **not** the phase for amendments, claims, EOT, obligations engine, or invoice/payment automation.

---

## STRICT SCOPE

### IN SCOPE
- post-execution administration baseline on executed contracts
- contract administration metadata fields
- baseline commercial administration values
- baseline dates for administration start
- compact administration readiness / summary panel
- explicit “initialize administration baseline” action
- append-only baseline history record
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- amendments / addenda / variation orders workflow
- claims / disputes / EOT / notices engine
- retention release workflow
- payment certificate workflow
- invoice engine
- BOQ measurement engine
- obligations / deliverables engine
- insurance / bond workflow
- external integrations
- AI assistance

Stay strictly inside Phase 11.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Phase 11 starts from executed contracts
This phase is only for contracts already in:

- `executed`

Do not bypass execution.

### Rule 2 — Contract header remains the primary source of truth
The `contracts` table remains the canonical contract header.

Phase 11 adds administration baseline support around that header.

### Rule 3 — Administration baseline history must be append-only
Each initialization/reset of the administration baseline must create an append-only history row.
Do not overwrite history rows.

### Rule 4 — This phase initializes administration, not full administration workflow
This phase only establishes the baseline admin record.
It does **not** build downstream operational modules.

### Rule 5 — Executed remains a valid state
Do not replace `executed` with a complex parallel state machine unless explicitly needed.
Use a lightweight administration status/flag approach.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Contract status
Do **not** add a large new post-execution status tree in this phase.

Keep `contracts.status` as-is, with `executed` remaining the main terminal execution state from Phase 10.

### Locked approach
Instead of adding many new contract statuses, add a lightweight administration baseline marker:

- `administration_status`

Use this only for Phase 11 baseline readiness.

### Locked administration status values
Use exactly:

- `not_initialized`
- `initialized`

Do not add:
- suspended
- closed_out
- on_hold
- under_claim
- archived

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
9. `.cursor/docs/contracts/PHASE_9_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_10_IMPLEMENTATION_PROMPT.md`
11. inspect actual current implementation of:
   - `Contract`
   - `ContractIssuePackage`
   - `ContractSignatory`
   - `ContractSignatureEvent`
   - `ContractController`
   - contract show page
   - execution/signature services
   - activity logging patterns

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Add the following columns to `contracts`:

- `administration_status` string(30) NOT NULL default `'not_initialized'`
- `administration_initialized_at` nullable timestampTz
- `administration_initialized_by_user_id` nullable FK → users
- `administration_notes` nullable text

### Baseline commercial/admin fields on contract header
Add:

- `effective_date` nullable timestampTz
- `commencement_date` nullable timestampTz
- `completion_date_planned` nullable timestampTz
- `contract_value_final` nullable decimal(18,2)
- `currency_final` nullable string(10)
- `supplier_reference_no` nullable string(255)

### Constraints
Add check constraint for `administration_status`:

- `not_initialized`
- `initialized`

Do not create a separate complex lifecycle table for this.

---

## Create `contract_administration_baselines`
Create an append-only history table:

- `contract_administration_baselines`

### Required columns
- `id` UUID PK
- `contract_id` FK → contracts
- `baseline_version` unsigned integer
- `administration_status`
- `effective_date` nullable timestampTz
- `commencement_date` nullable timestampTz
- `completion_date_planned` nullable timestampTz
- `contract_value_final` nullable decimal(18,2)
- `currency_final` nullable string(10)
- `supplier_reference_no` nullable string(255)
- `administration_notes` nullable text
- `prepared_by_user_id` nullable FK → users
- `prepared_at` timestampTz
- `created_at`
- `updated_at`

### Constraints
- unique `(contract_id, baseline_version)`
- check `administration_status in ('not_initialized','initialized')`
- index on `contract_id`

### Meaning
This table preserves each recorded baseline snapshot.
Every initialization or re-initialization creates a new version row.

---

## MODEL LAYER

### Update `Contract`
Add constants:
- `ADMIN_STATUS_NOT_INITIALIZED`
- `ADMIN_STATUS_INITIALIZED`

Add to `$fillable`:
- `administration_status`
- `administration_initialized_at`
- `administration_initialized_by_user_id`
- `administration_notes`
- `effective_date`
- `commencement_date`
- `completion_date_planned`
- `contract_value_final`
- `currency_final`
- `supplier_reference_no`

Add casts:
- datetime fields
- decimal for `contract_value_final`

Add relationships:
- `administrationBaselines()`
- `administrationInitializedBy()`

Add helpers:
- `isAdministrationInitialized()`
- `canInitializeAdministration()`  
  Locked logic:
  - true only when `status === executed`

### Create `ContractAdministrationBaseline`
Add model with:
- fillable fields matching schema
- relations:
  - `contract()`
  - `preparedBy()`

---

## SERVICE LAYER

Do not put baseline logic in controllers.

Create a dedicated service such as:

- `ContractAdministrationBaselineService`

It must handle:

### 1) `checkAdministrationReadiness(Contract $contract): array`
Return:
- `is_ready` boolean
- `issues` array

Minimum checks:
- contract status is `executed`
- supplier exists
- contract number exists
- contract value / currency is available either from existing fields or incoming payload
- signature/execution was completed (practically: status executed)

Keep this lightweight.

### 2) `initializeAdministrationBaseline(Contract $contract, array $payload, User $actor): ContractAdministrationBaseline`
Behavior:
- ensure contract is `executed`
- run readiness checks
- compute next baseline version:
  - `max(baseline_version) + 1`
- create append-only baseline row
- update contract header fields:
  - `administration_status = initialized`
  - `administration_initialized_at = now()`
  - `administration_initialized_by_user_id = actor`
  - `administration_notes`
  - `effective_date`
  - `commencement_date`
  - `completion_date_planned`
  - `contract_value_final`
  - `currency_final`
  - `supplier_reference_no`
- return new baseline row

### 3) optional helper `nextBaselineVersion(Contract $contract): int`
Encapsulate version numbering logic.

### Locked behavior
Do not auto-create baselines during execution.
Initialization must be an explicit action.

---

## CONTROLLER LAYER

Extend `ContractController` or add a focused controller such as:

- `ContractAdministrationController`

Locked preference:
- keep routes under `contracts.*`
- focused controller is acceptable if cleaner

Must provide at minimum:

### New action
- `initializeAdministrationBaseline`

Must:
- authorize appropriately
- validate payload
- call service
- log activity
- redirect back with success or error

No separate CRUD UI for baseline history is required beyond compact display.

---

## ROUTES

Add route under `contracts.*`, recommended:

- `contracts.initialize-administration`

Example:
- `POST /contracts/{contract}/initialize-administration`

Keep naming/module structure consistent.

---

## UI / PAGES TO BUILD

## Main implementation target
Enhance the existing **contract show page** with compact post-execution administration sections.

### 1) Administration summary panel
Show:
- administration status
- administration initialized at
- administration initialized by
- effective date
- commencement date
- planned completion date
- final contract value
- final currency
- supplier reference number

### 2) Readiness panel
When contract is `executed` and `administration_status === not_initialized`:
- show readiness output:
  - ready to initialize
  - blocking issues
- show lightweight initialization form

### 3) Initialization form
Allow input for:
- effective_date
- commencement_date
- completion_date_planned
- contract_value_final
- currency_final
- supplier_reference_no
- administration_notes

Submit to:
- `contracts.initialize-administration`

### 4) Baseline history
Show compact append-only list/table:
- baseline version
- prepared by
- prepared at
- administration status
- effective date
- commencement date
- planned completion date
- final value/currency

Keep compact and readable.

### 5) Executed-only visibility
Administration baseline controls should appear only when:
- contract is `executed`

For non-executed contracts:
- show summary if data exists
- but no initialization action

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Minimum expectations:
- viewing baseline/history uses existing contract view permission
- initializing administration baseline requires strong contract-management permission

### Locked rule
Do not invent a new auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.administration_initialized`
- optionally `contracts.contract.administration_status_changed`

Suggested payload:
- baseline id
- baseline version
- administration_status
- effective_date
- commencement_date
- completion_date_planned
- contract_value_final
- currency_final

Use the append-only baseline table for historical record and `ActivityLogger` for activity feed consistency.

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Administration baseline
- contract administration
- administration status
- not initialized
- initialized
- initialize administration
- readiness to initialize
- blocking issues
- baseline history
- baseline version
- effective date
- commencement date
- planned completion date
- final contract value
- final currency
- supplier reference number
- administration notes
- initialized at
- initialized by

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
- amendments
- claims
- notices
- invoices
- obligations engine
- retention workflows
- external integrations
- AI

Stay inside Phase 11.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- keep services modular
- do not bury baseline logic in controllers
- preserve Phase 9 lock behavior
- preserve Phase 10 signature/execution behavior
- do not break previous phases

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contracts`
4. Exact schema for `contract_administration_baselines`
5. Models created/updated
6. Service(s) added for administration baseline
7. How administration readiness check works
8. How administration baseline initialization works
9. What routes/pages were added or enhanced
10. What policy/permission approach was used
11. What activity logging events were wired
12. What translation keys were added
13. Confirm `npm run build` passes
14. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- executed contracts can be initialized for administration
- readiness checks exist
- initialization is explicit
- baseline history is append-only
- administration summary is visible
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about UI placement, enhance the existing contract show page with compact administration summary/readiness/history panels rather than creating a large new subsystem.
