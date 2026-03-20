# Contract Module — Phase 10
## Final Implementation Prompt
## Phase 10: Contract Signature Execution Tracking

---

## TASK

Implement **only Phase 10** of the Contract Module.

This phase introduces the workflow that starts **after Phase 9** when a signature package has already been issued internally.

This phase must allow internal users to:
- define and track contract signatories
- track signature progress step-by-step
- record manual signature events
- move a contract from issued-for-signature into partially signed / fully signed / executed states
- maintain a full append-only signature audit trail

This phase is about **signature execution tracking**, not external e-signature integration.

---

## STRICT SCOPE

### IN SCOPE
- contract signature statuses on the contract header
- signatory list
- signature sequence/order
- signatory status tracking
- manual marking of signatories as signed / declined / skipped (if allowed)
- append-only signature event history
- transition contract from issued package to executed state
- compact UI for signatories + signature progress + history
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- DocuSign / Adobe Sign / Zoho Sign / external provider integrations
- email delivery workflow
- WhatsApp/SMS notifications
- supplier portal signing
- actual cryptographic signature capture
- PDF stamping
- amendment/change order workflow
- AI signature assistance
- document generation engine

Stay strictly inside Phase 10.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Phase 10 starts only after Phase 9
This phase begins from:
- `signature_package_issued`

Do not bypass Phase 9.

### Rule 2 — Contract header remains the primary source of truth
The `contracts` table remains the canonical contract header.

Signatories and signature events are supplementary tables.

### Rule 3 — Signature history must be append-only
All signature actions must create append-only history/event rows.
Do not overwrite or delete signature history.

### Rule 4 — Signatory state is structured
Each signatory must have an explicit tracked status.
Do not infer signatory state only from events.

### Rule 5 — Execution is the end-state of this phase
This phase ends at:
- `executed`

Do not implement downstream delivery/admin processes here.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## New contract statuses for Phase 10
Add exactly these new contract statuses:

- `awaiting_internal_signature`
- `awaiting_supplier_signature`
- `partially_signed`
- `fully_signed`
- `executed`

### Existing status carried in from Phase 9
- `signature_package_issued`

### Meaning
- `signature_package_issued` = package prepared and issued internally, signature process not yet started
- `awaiting_internal_signature` = currently waiting on one or more internal signatories
- `awaiting_supplier_signature` = all internal signatories complete, waiting on supplier side
- `partially_signed` = at least one signatory has signed but the whole signature chain is not complete
- `fully_signed` = all required signatories completed
- `executed` = contract marked as fully executed internally after signature completion

Do not add:
- voided
- expired
- revoked
- reissued
- notarized

Those belong to later phases if needed.

---

## SIGNATORY TYPES (LOCKED)

Use exactly these signatory types:

- `internal`
- `supplier`

Do not add other types in this phase.

---

## SIGNATORY STATUSES (LOCKED)

Use exactly these signatory statuses:

- `pending`
- `signed`
- `declined`
- `skipped`

### Meaning
- `pending` = not yet signed
- `signed` = signature completed
- `declined` = signer explicitly declined
- `skipped` = intentionally bypassed by internal decision

Do not add:
- viewed
- sent
- failed
- expired

---

## SIGNATURE EVENT TYPES (LOCKED)

Use exactly these event types:

- `signatory_added`
- `signatory_updated`
- `marked_signed`
- `marked_declined`
- `marked_skipped`
- `contract_executed`

These must be append-only.

---

## SIGNATURE FLOW RULES (LOCKED)

### Contract-level flow
- `signature_package_issued` → `awaiting_internal_signature`
- `awaiting_internal_signature` → `partially_signed`
- `partially_signed` may remain until all required signers complete
- after all required internal signatories are signed:
  - if supplier signatories exist and remain pending:
    - contract → `awaiting_supplier_signature`
  - else if all signatories (internal + supplier) are signed:
    - contract → `fully_signed`
- `awaiting_supplier_signature` → `fully_signed` once all remaining required supplier signatories are signed
- `fully_signed` → `executed`

### Important locked rule
Do not auto-mark `executed` when the last signatory signs.
Execution requires an explicit internal action:
- “Mark as executed”

### Decline behavior
If any required signatory is marked `declined`:
- do **not** add a new contract status in this phase
- keep the contract in its current signature stage
- surface the declined state clearly in UI
- let internal users decide how to proceed later

### Skipped behavior
A skipped signatory is treated as not required for completion.

---

## SIGNATORY ORDERING (LOCKED)

Signatories must support sequence ordering.

Required fields:
- `sign_order` integer
- `is_required` boolean default true

### Locked behavior
Do not build a complex sequential enforcement engine.
Sequence exists for display and future extensibility.

For this phase:
- signatories are ordered and visible in order
- status completion logic counts required signatories regardless of strict enforcement timing

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
9. `.cursor/docs/contracts/PHASE_8_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_9_IMPLEMENTATION_PROMPT.md`
11. inspect actual current implementation of:
   - `Contract`
   - `ContractIssuePackage`
   - `ContractController`
   - `ContractWorkspaceController`
   - contract show page
   - signature package service
   - activity logging patterns

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Extend `chk_contracts_status` safely to include:

- `awaiting_internal_signature`
- `awaiting_supplier_signature`
- `partially_signed`
- `fully_signed`
- `executed`

Do not remove earlier valid statuses.

No extra contract header columns are strictly required beyond status for this phase, unless needed for convenience.
Optional fields if useful:
- `executed_at` nullable timestampTz
- `executed_by_user_id` nullable FK → users

### Locked preference
Add:
- `executed_at`
- `executed_by_user_id`

because execution is an explicit action in this phase.

---

## Create `contract_signatories`
Required columns:
- `id` UUID PK
- `contract_id`
- `signatory_type` (`internal|supplier`)
- `name`
- `email` nullable
- `title` nullable
- `sign_order` unsigned integer
- `is_required` boolean default true
- `status` (`pending|signed|declined|skipped`)
- `signed_at` nullable timestampTz
- `notes` nullable text
- `created_by_user_id` nullable FK → users
- `updated_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

### Constraints
- check signatory_type
- check status
- index on `contract_id`
- unique `(contract_id, sign_order, name)` is optional but not required
- keep schema practical

---

## Create `contract_signature_events`
Required columns:
- `id` UUID PK
- `contract_id`
- `contract_signatory_id` nullable FK → `contract_signatories.id`
- `event_type`
- `event_notes` nullable text
- `old_status` nullable string
- `new_status` nullable string
- `changed_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

### Constraints
- check event_type in:
  - `signatory_added`
  - `signatory_updated`
  - `marked_signed`
  - `marked_declined`
  - `marked_skipped`
  - `contract_executed`
- index on `contract_id`

This table is append-only.

---

## MODEL LAYER

### Update `Contract`
Add new status constants:
- `STATUS_AWAITING_INTERNAL_SIGNATURE`
- `STATUS_AWAITING_SUPPLIER_SIGNATURE`
- `STATUS_PARTIALLY_SIGNED`
- `STATUS_FULLY_SIGNED`
- `STATUS_EXECUTED`

Add optional fields:
- `executed_at`
- `executed_by_user_id`

Add helpers:
- `isSignaturePackageIssued()`
- `isAwaitingInternalSignature()`
- `isAwaitingSupplierSignature()`
- `isPartiallySigned()`
- `isFullySigned()`
- `isExecuted()`

Add relations:
- `signatories()`
- `signatureEvents()`
- `executedBy()`

### Create `ContractSignatory`
Add constants:
- type constants
- status constants

Add relationships:
- `contract()`
- `createdBy()`
- `updatedBy()`
- `events()`

### Create `ContractSignatureEvent`
Add event type constants and relations:
- `contract()`
- `signatory()`
- `changedBy()`

---

## SERVICE LAYER

Do not put signature progression logic in controllers.

Create a dedicated service such as:

- `ContractSignatureTrackingService`

It must handle at minimum:

### 1) `addSignatory(...)`
Input:
- contract
- signatory payload
- actor

Behavior:
- create signatory
- append `contract_signature_events` row with `signatory_added`

### 2) `updateSignatory(...)`
Input:
- contract
- signatory
- payload
- actor

Behavior:
- update signatory metadata / order / required flag / notes
- append `signatory_updated` event
- do not rewrite old events

### 3) `markSignatoryStatus(...)`
Input:
- contract
- signatory
- new status (`signed|declined|skipped`)
- actor
- optional notes

Behavior:
- validate signatory belongs to contract
- update signatory status
- if signed:
  - set `signed_at = now()`
- if declined/skipped:
  - preserve reason in notes if provided
- append signature event with:
  - event type matching action
  - old_status
  - new_status
- recalculate contract header status using a dedicated helper

### 4) `recalculateContractSignatureStatus(...)`
Based on current signatory rows:

Suggested logic:
- if contract is still `signature_package_issued` and there are signatories:
  - move to `awaiting_internal_signature`
- if any required signatories are signed but not all complete:
  - `partially_signed`
- if all required internal signatories are signed and required supplier signatories remain pending:
  - `awaiting_supplier_signature`
- if all required signatories are either signed or skipped:
  - `fully_signed`

### 5) `markExecuted(...)`
Input:
- contract
- actor
- optional notes

Behavior:
- only allowed when contract status is `fully_signed`
- set:
  - `status = executed`
  - `executed_at = now()`
  - `executed_by_user_id = actor`
- append `contract_signature_events` row with `contract_executed`

---

## CONTROLLER LAYER

Extend `ContractController` or add a focused `ContractSignatureController`.

Locked preference:
- keep routes under `contracts.*`
- focused controller is acceptable if cleaner

Must provide at minimum:

### New actions
- `addSignatory`
- `updateSignatory`
- `markSignatoryStatus`
- `markExecuted`

### Requirements
Each action must:
- authorize appropriately
- call service
- log activity (if using `ActivityLogger`)
- redirect back with success / error

---

## ROUTES

Add routes under `contracts.*`, recommended:

- `contracts.signatories.store`
- `contracts.signatories.update`
- `contracts.signatories.mark-status`
- `contracts.mark-executed`

Example patterns:
- `POST /contracts/{contract}/signatories`
- `PUT /contracts/{contract}/signatories/{signatory}`
- `POST /contracts/{contract}/signatories/{signatory}/mark-status`
- `POST /contracts/{contract}/mark-executed`

Keep route naming consistent.

---

## UI / PAGES TO BUILD

## Main implementation target
Enhance the existing **contract show page** primarily, and optionally the workspace page only if necessary.

### 1) Signature progress summary
Show:
- current signature/execution status
- finalized package info from Phase 9
- executed_at / executed_by if executed
- count summary:
  - total signatories
  - signed
  - pending
  - declined
  - skipped

### 2) Signatory management section
Compact table/list showing:
- sign order
- type (`internal` / `supplier`)
- name
- title
- email
- required yes/no
- status
- signed_at
- notes

### 3) Add signatory form
Allow internal users to add signatories:
- type
- name
- email
- title
- sign_order
- required
- notes

Keep it compact.

### 4) Per-signatory actions
Allow actions:
- mark signed
- mark declined
- mark skipped

Optionally allow editing metadata too.

### 5) Signature event history
Show append-only event list/table:
- event type
- signatory (if applicable)
- old status → new status
- changed by
- created at
- notes

### 6) Mark executed action
When contract status is `fully_signed`:
- show button `Mark as executed`
- posts to route
- sets final Phase 10 state

### 7) Locking rule from Phase 9 remains
Do not re-open draft editing because of Phase 10.
The contract remains locked for draft editing once issued for signature.

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Minimum expectations:
- viewing signatories/history uses existing contract view permission
- mutating signatories / marking signature statuses / marking executed requires strong contract-management permission

### Locked rule
Do not invent a new auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.signatory_added`
- `contracts.contract.signatory_updated`
- `contracts.contract.signatory_status_changed`
- `contracts.contract.signature_status_changed`
- `contracts.contract.executed`

Suggested payloads:
- signatory id
- signatory type
- old_status / new_status
- contract old/new status when changed

Use `contract_signature_events` for append-only structured signature history.
Use `ActivityLogger` for system-wide activity feed consistency.

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Signature tracking
- signatories
- add signatory
- signatory type
- internal
- supplier
- required
- pending
- signed
- declined
- skipped
- mark signed
- mark declined
- mark skipped
- signature progress
- signature history
- mark as executed
- awaiting internal signature
- awaiting supplier signature
- partially signed
- fully signed
- executed

Extend `contracts.php`.

---

## NAVIGATION

No new top-level nav item is required.

This remains within the Contracts module.

---

## SEEDING

No new seeders are required for this phase.

---

## NON-GOALS (STRICT)

Do not add:
- external e-sign integrations
- email delivery
- PDF stamping
- supplier portal signing
- amendment workflows
- AI tools

Stay inside Phase 10.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- keep services modular
- do not bury progression logic in controllers
- preserve Phase 9 lock behavior
- do not break draft workspace / review / issue package features

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contracts`
4. Exact schema for `contract_signatories`
5. Exact schema for `contract_signature_events`
6. Models created/updated
7. Service(s) added for signature tracking
8. How signatory tracking works
9. How contract signature status recalculation works
10. How mark-executed works
11. What routes/pages were added or enhanced
12. What policy/permission approach was used
13. What activity logging events were wired
14. What translation keys were added
15. Confirm `npm run build` passes
16. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- signatories can be added and tracked
- signature events are append-only
- contract signature status progresses correctly
- contract can reach `fully_signed`
- contract can be explicitly marked `executed`
- Phase 9 lock behavior remains intact
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about UI placement, enhance the existing contract show page with compact signatory and signature history panels rather than creating a large new subsystem.
