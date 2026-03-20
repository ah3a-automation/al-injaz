# Contract Module — Phase 9
## Final Implementation Prompt
## Phase 9: Signature Readiness / Final Internal Lock / Issue Package Preparation

---

## TASK

Implement **only Phase 9** of the Contract Module.

This phase introduces the transition from:
- internally approved contract draft

to:

- signature-ready contract package preparation

This is the phase where the draft becomes **finalized for signature preparation**, but **actual signature execution is still out of scope**.

This phase must allow internal users to:
- finalize a contract after approval
- perform final readiness checks
- lock the editable draft
- generate and store a structured signature-ready issue package record
- track the issued package version / issue event
- maintain a clean handoff to a later e-signature or manual-signature phase

---

## STRICT SCOPE

### IN SCOPE
- final signature-readiness state
- final pre-signature checks
- locking contract editing after finalization
- issue-package metadata/header
- issue-package version numbering
- issue-package history records
- ability to regenerate a new issue package version if the contract returns to draft/rework and is later re-approved
- compact issue-package summary UI
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- actual digital signature
- external supplier acceptance flow
- PDF rendering engine
- DOCX generation
- email sending
- WhatsApp/SMS sending
- amendment/change order workflow
- AI-assisted redlining
- obligation extraction
- payment milestone engine

Stay strictly inside Phase 9.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Signature readiness is still internal
Phase 9 ends at:
- contract is internally finalized and packaged for signature

It does **not** perform signature itself.

### Rule 2 — Locked draft means no more editable workspace changes
Once a contract is finalized for signature readiness, the normal draft workspace editing flow must be blocked.

### Rule 3 — Issue package history is append-only
Each issued package record must be append-only.
Do not overwrite previous issue-package rows.

### Rule 4 — Contract remains the header source of truth
The `contracts` table remains the main contract header.
Issue-package history is supplementary.

### Rule 5 — Re-issue must be supported later
If a contract is returned from signature-ready state back into rework in a future correction flow, the system must be capable of generating a **new issue package version** later.
This phase should support that by using issue-package history/versioning rather than a single mutable row.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Final contract statuses for this phase
By the end of Phase 8, the contract can reach:
- `approved_for_signature`

Phase 9 adds exactly one new status:

- `signature_package_issued`

### Meaning
- `approved_for_signature` = fully approved internally, ready to prepare issue package
- `signature_package_issued` = signature-ready package has been prepared and issued internally for the next signature phase

Do not add:
- signed
- partially_signed
- supplier_signed
- executed

Those belong to later phases.

---

## PRE-SIGNATURE READINESS CHECKS (LOCKED)

Before issuing a signature package, the system must validate at minimum:

1. Contract status must be `approved_for_signature`
2. Contract must have at least one draft article
3. Contract must not be cancelled
4. Contract must have a supplier
5. Contract must have RFQ/source linkage if the current business flow depends on RFQ handover
6. Contract titles / key header fields should not be empty if your current flow expects them

### Locked behavior
Do not overbuild a complex checklist engine in this phase.

Implement a **lightweight readiness check service** that returns:
- `is_ready`
- list of blocking issues

This check is mandatory before package issue.

---

## ISSUE PACKAGE HISTORY TABLE (REQUIRED)

Create an append-only table, recommended name:

- `contract_issue_packages`

### Required columns
- `id`
- `contract_id`
- `issue_version` integer
- `package_status`
- `prepared_by_user_id`
- `prepared_at`
- `notes` nullable text
- `snapshot_contract_status`
- `snapshot_contract_title_en` nullable
- `snapshot_contract_title_ar` nullable
- `snapshot_supplier_name` nullable
- `snapshot_contract_number`
- `snapshot_article_count`
- `created_at`
- `updated_at`

### Locked package status values
Use exactly:
- `issued`
- `superseded`

### Meaning
- `issued` = current active signature-ready package version
- `superseded` = older package version replaced by a later issue

### Required constraints
- FK to `contracts`
- FK to `users`
- check constraint for `package_status`
- unique `(contract_id, issue_version)`
- index on `contract_id`

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
9. `.cursor/docs/contracts/PHASE_5_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_6_IMPLEMENTATION_PROMPT.md`
11. `.cursor/docs/contracts/PHASE_7_IMPLEMENTATION_PROMPT.md`
12. `.cursor/docs/contracts/PHASE_8_IMPLEMENTATION_PROMPT.md`

Also inspect actual implementation of:
- `Contract`
- `ContractReview`
- review workflow service
- contract workspace page
- contract show page
- current activity logging patterns

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Add if missing:

- `finalized_for_signature_at` nullable timestampTz
- `finalized_for_signature_by_user_id` nullable FK → users
- `current_issue_package_id` nullable UUID FK → `contract_issue_packages.id`
- `is_locked_for_signature` boolean default false

### Status constraint
Extend `chk_contracts_status` safely to include:
- `signature_package_issued`

Do not remove earlier valid statuses.

### Locked behavior
- `approved_for_signature` remains valid
- issuing a package transitions `status` to `signature_package_issued`
- set `is_locked_for_signature = true`

---

## Create `contract_issue_packages`
Required columns:
- `id` UUID PK
- `contract_id`
- `issue_version` unsigned integer
- `package_status` (`issued|superseded`)
- `prepared_by_user_id`
- `prepared_at`
- `notes` nullable
- `snapshot_contract_status`
- `snapshot_contract_title_en` nullable
- `snapshot_contract_title_ar` nullable
- `snapshot_supplier_name` nullable
- `snapshot_contract_number`
- `snapshot_article_count`
- `created_at`
- `updated_at`

### Constraints
- check `package_status in ('issued','superseded')`
- unique `(contract_id, issue_version)`
- index on `contract_id`

---

## MODEL LAYER

### Update `Contract`
Add:
- `STATUS_SIGNATURE_PACKAGE_ISSUED`
- helper:
  - `isApprovedForSignature()`
  - `isSignaturePackageIssued()`
  - `isLockedForSignature()`
- relations:
  - `issuePackages()`
  - `currentIssuePackage()`
  - `finalizedForSignatureBy()`

### Create `ContractIssuePackage`
Add:
- `PACKAGE_STATUS_ISSUED`
- `PACKAGE_STATUS_SUPERSEDED`
- relationships:
  - `contract()`
  - `preparedBy()`

---

## SERVICE LAYER

Do not put finalization logic in controllers.

Create a dedicated service such as:

- `ContractSignaturePackageService`

It must handle:

### 1) `checkReadiness(Contract $contract): array`
Return structure like:
- `is_ready` boolean
- `issues` array of strings

Check at minimum:
- contract status is `approved_for_signature`
- contract has draft articles
- contract has supplier
- contract is not cancelled
- contract number exists
- optional title/header completeness checks if your current flow requires them

Keep this lightweight.

### 2) `issueSignaturePackage(Contract $contract, User $actor, ?string $notes = null): ContractIssuePackage`
Behavior:
- run readiness check; if not ready, throw a meaningful exception
- compute next issue version:
  - max(issue_version) + 1
- mark prior active issue package rows for this contract as `superseded`
- create a new `ContractIssuePackage` row with full snapshot fields
- update contract:
  - `status = signature_package_issued`
  - `is_locked_for_signature = true`
  - `finalized_for_signature_at = now()`
  - `finalized_for_signature_by_user_id = actor`
  - `current_issue_package_id = new issue package id`
- return the new package

### Locked note
Do not create a PDF/document file in this phase.
This phase only prepares the structured issue-package record and lock state.

### 3) optional helper `nextIssueVersion(Contract $contract): int`
Encapsulate version numbering logic.

---

## CONTROLLER LAYER

Extend `ContractController` and/or add a focused `ContractSignaturePackageController`.

Locked preference:
- keep routes under `contracts.*`
- a focused controller is acceptable if cleaner

Must provide at minimum:

### New actions
- `issueSignaturePackage`
- optionally `showIssuePackageHistory` if separate page is desired
  - but inline history on the contract show page is acceptable and preferred

### `issueSignaturePackage`
Must:
- authorize appropriately
- call readiness check + issue service
- log activity
- redirect back with success or validation-style error

---

## ROUTES

Add routes under `contracts.*`, recommended:

- `contracts.issue-signature-package`

Example:
- `POST /contracts/{contract}/issue-signature-package`

Optional history route if needed, but not required.

Keep naming/module structure consistent.

---

## UI / PAGES TO BUILD

## Main implementation target
Enhance the existing **contract show page** and **workspace page** with compact signature-readiness / issue-package panels.

### 1) Signature readiness summary
Show:
- current contract status
- whether locked for signature
- finalized_for_signature_at
- finalized_for_signature_by
- current issue package version if any

### 2) Readiness check output
When contract is `approved_for_signature`, show a compact readiness panel:
- “Ready to issue” or “Blocking issues found”
- list blocking issues if any

### 3) Issue action
When contract is `approved_for_signature` and user has permission:
- show button: `Issue signature package`
- optional notes textarea/input if useful
- action posts to `contracts.issue-signature-package`

### 4) Issue package history
Show append-only list/table:
- issue version
- package status
- prepared by
- prepared at
- notes
- snapshot article count

Keep it compact and readable.

### 5) Lock behavior in workspace
When contract `is_locked_for_signature === true` or status is `signature_package_issued`:
- show a clear banner that the draft is locked for signature preparation
- disable or hide normal editing controls:
  - metadata save
  - article editing save
  - add article
  - remove article
  - reorder controls
  - negotiation update actions
  - review actions that should no longer apply

Do not remove visibility; just block editing.

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Minimum expectations:
- issue package action requires strong contract-management permission
- existing viewers can still see history/summary
- editing remains blocked by lock state even if user otherwise has update permission

### Locked rule
Do not invent a new auth system.
Use current contract policy / permission approach and extend carefully if needed.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.signature_package_issued`
- `contracts.contract.status_changed`

Optional:
- `contracts.contract.locked_for_signature`

### Logging rule
Only log when a real issue-package event occurs.

Suggested logging payload:
- `issue_package_id`
- `issue_version`
- `from_status`
- `to_status`
- `article_count`

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Signature package workflow
- signature package
- ready to issue
- blocking issues
- issue signature package
- issued package history
- issue version
- issued
- superseded
- locked for signature
- finalized for signature
- prepared by
- prepared at

Extend `contracts.php`.

---

## NAVIGATION

No new top-level nav item is required.

This remains part of the Contracts module.

---

## SEEDING

No new seeders are required for this phase.

---

## NON-GOALS (STRICT)

Do not add:
- actual signatures
- file generation
- supplier delivery workflow
- notifications
- amendments
- AI assistance

Stay inside Phase 9.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- keep services modular
- do not bury package-issue logic in controllers
- preserve Phase 5–8 clarity
- do not break draft editing/versioning/negotiation/review behavior

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contracts`
4. Exact schema for `contract_issue_packages`
5. Models created/updated
6. Service(s) added for signature readiness / issue package workflow
7. How readiness check works
8. How issue package generation works
9. What routes/pages were added or enhanced
10. What policy/permission approach was used
11. What activity logging events were wired
12. What translation keys were added
13. Confirm `npm run build` passes
14. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- contract can be checked for signature readiness
- issue package can be created from `approved_for_signature`
- issue package history is append-only
- contract becomes locked for signature
- normal editing is blocked after issue
- activity logging is recorded
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about UI placement, enhance the existing contract show/workspace pages with compact signature-package panels rather than inventing a large new subsystem.
