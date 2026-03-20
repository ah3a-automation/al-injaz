# Contract Module — Phase 8
## Final Implementation Prompt
## Phase 8: Contract Draft Review / Approval Workflow

---

## TASK

Implement **only Phase 8** of the Contract Module.

This phase introduces the first structured **review / approval workflow** for contract drafts.

It must allow internal users to:
- submit a contract draft for review
- review it through structured stages
- record decisions at review stages
- return the draft for rework
- approve the draft for the next stage
- reach a final internal “approved / ready for signature” state

This phase is about **internal review workflow only**.

It must **not** implement:
- e-signature
- external supplier approval
- PDF/Word final issue workflow
- amendment/change order workflow
- AI approval suggestions
- email notification engine
- obligation extraction

---

## STRICT SCOPE

### IN SCOPE
- contract header review workflow state machine
- review stages
- review decision records
- return-for-rework flow
- final approved internal state
- review history / timeline
- visibility of article-level negotiation/deviation flags inside review
- review summary on contract draft show/workspace pages
- policy/permission integration
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement or partially implement:
- digital signature
- supplier portal approval
- approval delegation/escalation engine
- SLA/reminder engine
- threaded approval chat
- AI-generated approval notes
- final rendering/output packaging
- amendment workflow

Stay inside Phase 8.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Approval is on the contract draft header
This phase’s review workflow applies to the **Contract** header.

Do not attach the main approval state machine to:
- master contract articles
- templates
- individual draft article rows

### Rule 2 — Draft article metadata informs approval, but does not replace it
Article-level data from Phase 7 must be visible during review:
- `is_modified`
- negotiation status
- `has_deviation`
- `requires_special_approval`

But approval decisions are recorded at the contract draft level.

### Rule 3 — Review history must be append-only
Every stage decision must create a review-history record.
Do not overwrite history in place.

### Rule 4 — Return-for-rework is a first-class path
Reviewers must be able to send a draft back for rework with notes.

### Rule 5 — Final approved state is internal only
Phase 8 stops at an internally approved / ready-for-signature type state.
Do not implement signature execution.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Contract review workflow statuses
Use exactly these contract statuses for Phase 8 review flow:

- `draft`
- `under_preparation`
- `ready_for_review`
- `in_legal_review`
- `in_commercial_review`
- `in_management_review`
- `returned_for_rework`
- `approved_for_signature`
- `cancelled`

### Meaning
- `draft` = initial draft
- `under_preparation` = being prepared internally
- `ready_for_review` = submit-ready
- `in_legal_review` = under legal review
- `in_commercial_review` = under commercial/contracts review
- `in_management_review` = under final management review
- `returned_for_rework` = sent back for changes
- `approved_for_signature` = fully approved internally and ready for later signature phase
- `cancelled` = abandoned

Do not add execution statuses here.
Legacy live-contract statuses may exist in the system; do not break them, but this phase’s workflow logic must focus on the above review lifecycle.

---

## Review stages (LOCKED)

Use exactly these review stages in review records:

- `legal`
- `commercial`
- `management`

Do not add custom stages in this phase.

---

## Review decisions (LOCKED)

Use exactly these decisions in review records:

- `approved`
- `rejected`
- `returned_for_rework`

### Meaning
- `approved` = stage approved and can move forward
- `rejected` = hard stop / rejected
- `returned_for_rework` = sent back for editing, not fully rejected

---

## Workflow transitions (LOCKED)

### Preparation flow
- `draft` → `under_preparation`
- `under_preparation` → `ready_for_review`
- `returned_for_rework` → `under_preparation`
- `draft|under_preparation|ready_for_review|returned_for_rework` → `cancelled`

### Review submission flow
- `ready_for_review` → `in_legal_review`

### Review progression
- `in_legal_review` + legal approved → `in_commercial_review`
- `in_commercial_review` + commercial approved → `in_management_review`
- `in_management_review` + management approved → `approved_for_signature`

### Rework flow
From any review stage:
- `in_legal_review` + returned_for_rework → `returned_for_rework`
- `in_commercial_review` + returned_for_rework → `returned_for_rework`
- `in_management_review` + returned_for_rework → `returned_for_rework`

### Rejection flow
From any review stage:
- stage decision `rejected` should set contract to `returned_for_rework` or a hard rejection state?

## Locked decision:
Use:
- `rejected` decision → `returned_for_rework`

Reason:
This keeps the workflow practical without adding an extra terminal rejection status in this phase.

### Terminal in this phase
- `approved_for_signature`
- `cancelled`

---

## REVIEW NOTES / APPROVAL SUMMARY FIELDS (LOCKED)

Add contract-level fields if missing:

- `submitted_for_review_at` nullable timestampTz
- `submitted_for_review_by_user_id` nullable FK → users
- `review_completed_at` nullable timestampTz
- `review_completed_by_user_id` nullable FK → users
- `review_return_reason` nullable text
- `approval_summary` nullable text

These are summary/header fields only.

---

## REVIEW HISTORY TABLE (REQUIRED)

Create a new append-only table, recommended name:
- `contract_reviews`

Required columns:
- `id`
- `contract_id`
- `review_stage` (`legal|commercial|management`)
- `decision` (`approved|rejected|returned_for_rework`)
- `review_notes` nullable text
- `decision_by_user_id`
- `created_at`
- `updated_at`

Optional useful columns:
- `from_status`
- `to_status`

Locked preference:
Include `from_status` and `to_status` for audit clarity.

### Required constraints
- FK to `contracts`
- FK to `users`
- check constraint for `review_stage`
- check constraint for `decision`
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
9. `.cursor/docs/contracts/PHASE_4_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_5_IMPLEMENTATION_PROMPT.md`
11. `.cursor/docs/contracts/PHASE_6_IMPLEMENTATION_PROMPT.md`
12. `.cursor/docs/contracts/PHASE_7_IMPLEMENTATION_PROMPT.md`

Also inspect actual implementation of:
- `Contract`
- contract workspace page
- Phase 7 negotiation/deviation UI
- activity logging patterns
- existing policy patterns
- current contract show page

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contracts`
Add if missing:
- `submitted_for_review_at` nullable timestampTz
- `submitted_for_review_by_user_id` nullable FK → users
- `review_completed_at` nullable timestampTz
- `review_completed_by_user_id` nullable FK → users
- `review_return_reason` nullable text
- `approval_summary` nullable text

### Contract status constraint
Extend the contracts status check constraint safely to include:
- `in_legal_review`
- `in_commercial_review`
- `in_management_review`
- `returned_for_rework`
- `approved_for_signature`

Do not break existing legacy statuses already in use.

## Create `contract_reviews`
Required columns:
- `id` UUID PK
- `contract_id`
- `review_stage`
- `decision`
- `review_notes` nullable
- `from_status` nullable string
- `to_status` nullable string
- `decision_by_user_id`
- `created_at`
- `updated_at`

Required DB checks:
- `review_stage` in (`legal`,`commercial`,`management`)
- `decision` in (`approved`,`rejected`,`returned_for_rework`)

Required indexes:
- on `contract_id`

---

## MODEL LAYER

### Update `Contract`
Add:
- review status constants:
  - `STATUS_IN_LEGAL_REVIEW`
  - `STATUS_IN_COMMERCIAL_REVIEW`
  - `STATUS_IN_MANAGEMENT_REVIEW`
  - `STATUS_RETURNED_FOR_REWORK`
  - `STATUS_APPROVED_FOR_SIGNATURE`
- helpers:
  - `isReadyForReview()`
  - `isInLegalReview()`
  - `isInCommercialReview()`
  - `isInManagementReview()`
  - `isReturnedForRework()`
  - `isApprovedForSignature()`
- relation:
  - `reviews()`
  - `submittedForReviewBy()`
  - `reviewCompletedBy()`

### Create `ContractReview`
Add:
- review stage constants
- decision constants
- relationships:
  - `contract()`
  - `decisionBy()`

---

## SERVICE LAYER

Do not put workflow logic in controllers.

Create a dedicated service such as:
- `ContractReviewWorkflowService`

It must handle:

### 1) `submitForReview(...)`
Input:
- contract
- actor

Behavior:
- validate current status is `ready_for_review`
- move contract to `in_legal_review`
- set `submitted_for_review_at`
- set `submitted_for_review_by_user_id`
- clear prior `review_return_reason` if appropriate

### 2) `recordStageDecision(...)`
Input:
- contract
- stage
- decision
- actor
- optional notes

Behavior:
- validate that the stage matches the current contract review state:
  - `legal` only when contract is `in_legal_review`
  - `commercial` only when contract is `in_commercial_review`
  - `management` only when contract is `in_management_review`
- create append-only `ContractReview` row
- transition contract status according to locked rules
- on `returned_for_rework` or `rejected`:
  - set contract status to `returned_for_rework`
  - store return reason / notes on contract summary field if appropriate
- on final management approval:
  - set status to `approved_for_signature`
  - set `review_completed_at`
  - set `review_completed_by_user_id`

### 3) optional `validateReviewPreconditions(...)`
If helpful, validate that the contract is structurally ready:
- has draft articles
- maybe no unresolved critical negotiation flags?

## Locked rule:
Do **not** over-engineer hard blockers here.
At most, lightweight validation may be added if obvious and consistent.

---

## CONTROLLER LAYER

Extend `ContractWorkspaceController` and/or `ContractController`, or add a focused `ContractReviewController`.

Locked preference:
- keep routes under `contracts.*`
- a dedicated `ContractReviewController` is acceptable if cleaner

Must provide at minimum:

### New actions
- `submitForReview`
- `reviewDecision`

### `submitForReview`
Must:
- authorize update/review permission
- call service
- log activity
- redirect back with success

### `reviewDecision`
Must:
- validate:
  - `review_stage`
  - `decision`
  - `review_notes`
- call service
- log activity
- redirect back with success

---

## ROUTES

Add routes under `contracts.*`, recommended:

- `contracts.submit-for-review`
- `contracts.review-decision`

Examples:
- `POST /contracts/{contract}/submit-for-review`
- `POST /contracts/{contract}/review-decision`

Keep route naming consistent with the module.

---

## UI / PAGES TO BUILD

## Main implementation target
Enhance the existing contract draft workspace page and contract show page with a compact review workflow panel.

### Required UI sections

## 1) Review workflow summary section
On contract workspace/show page, show:
- current contract status
- submitted for review metadata
- review completed metadata if applicable
- approval summary / return reason if present

## 2) Review actions section
Show only actions relevant to current status and user permission.

Examples:
- when `ready_for_review`:
  - button: `Submit for review`
- when `in_legal_review`:
  - actions for legal reviewer:
    - approve
    - return for rework
- when `in_commercial_review`:
  - actions for commercial reviewer:
    - approve
    - return for rework
- when `in_management_review`:
  - actions for management reviewer:
    - approve
    - return for rework

### Decision form
For the active review stage, provide:
- decision selector or buttons
- review notes textarea

### Locked UX preference
Use a compact review card/panel, not a huge wizard.

## 3) Review history section
Show append-only review records:
- stage
- decision
- notes
- decided by
- created at
- optional from_status → to_status

Keep it readable and compact.

## 4) Article-level visibility inside review
On the workspace/show page, make article-level warning indicators visible to reviewers:
- `is_modified`
- negotiation status
- deviation flag
- special approval required

Do not build separate article approval actions yet.
Just surface these signals clearly during review.

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

### Locked permission approach
Reuse `ContractPolicy` and existing contract permissions where possible.

Minimum expectations:
- contract editing/preparation still uses `update`
- review-stage decisions should require a strong internal contract-management permission

If the project already has fine-grained roles, map them cleanly.
If not, keep it consistent and simple with the existing contract governance permission.

Do not invent a second auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.submitted_for_review`
- `contracts.contract.review_decision_recorded`
- `contracts.contract.status_changed`

### Logging rule
Only log when real workflow actions occur.

For review decision logging, include:
- `review_stage`
- `decision`
- `from_status`
- `to_status`

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Review workflow
- submit fo
