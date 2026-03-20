# Contract Module — Phase 7
## Final Implementation Prompt
## Phase 7: Negotiation Workspace / Deviation Capture

---

## TASK

Implement **only Phase 7** of the Contract Module.

This phase introduces the first structured **negotiation workspace foundation** for contract draft articles.

It must allow internal users to:
- capture negotiation notes against draft-local contract articles
- record legal/commercial/internal comments
- flag draft articles as standard / modified / negotiated / deviation-required
- capture whether a change requires approval later
- track negotiation state per draft article without yet implementing the approval engine
- provide a clear workspace for contract preparation before review/approval phases

This phase is about **structured negotiation/deviation capture only**.

It must **not** implement:
- full approval workflow
- supplier portal collaboration
- threaded external discussions
- AI negotiation advice
- final rendering
- signature workflow
- amendment/change-order workflow

---

## STRICT SCOPE

### IN SCOPE
- negotiation/deviation data structure per `ContractDraftArticle`
- contract draft article negotiation panel / workspace section
- article-level negotiation status
- article-level internal notes/comments
- deviation-required flag
- requires-approval-later flag
- article-level summary of latest negotiation state
- optional simple internal negotiation log/history table
- translations for negotiation workspace
- activity logging for negotiation events

### OUT OF SCOPE
Do **not** implement or partially implement:
- approval routing
- approval assignments
- supplier-visible comments
- threaded chat
- email notifications
- AI suggestion engine
- final legal rendering
- e-signature
- obligation tracking
- amendments
- commercial comparison engine

Stay inside Phase 7.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Negotiation stays on draft-local articles only
Negotiation/deviation capture applies only to `ContractDraftArticle`.

Do not attach this phase’s negotiation state to:
- master `ContractArticle`
- `ContractTemplate`
- contract header metadata

### Rule 2 — Negotiation is structured metadata, not free chaos
This phase must not be only a giant free-text box.
There must be structured states/flags in addition to notes.

### Rule 3 — Article content editing remains Phase 5/6 behavior
Do not replace the existing draft article editing/versioning flow.
Negotiation capture must sit alongside it.

### Rule 4 — Approval is not implemented yet
This phase may flag that an article **requires approval later**, but must not implement the approval engine or routing.

### Rule 5 — Deviation capture must be explicit
If an article deviates materially from standard/template/library source, the system must allow the user to mark this clearly.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Draft article negotiation statuses
Use exactly these statuses for article-level negotiation state:

- `not_reviewed`
- `in_negotiation`
- `agreed`
- `deviation_flagged`
- `ready_for_review`

### Meanings
- `not_reviewed` = article has not yet been negotiated/reviewed
- `in_negotiation` = article is being actively discussed/adjusted internally
- `agreed` = article text is agreed internally for the current draft stage
- `deviation_flagged` = article contains a deviation that must be highlighted
- `ready_for_review` = article is prepared for later approval/review phases

Do not add approval states here.

---

## Negotiation/deviation fields (LOCKED)

Each draft article must support these fields:

- `negotiation_status`
- `negotiation_notes` nullable text
- `legal_notes` nullable text
- `commercial_notes` nullable text
- `internal_notes` nullable text
- `has_deviation` boolean default false
- `requires_special_approval` boolean default false
- `negotiation_updated_by_user_id` nullable FK → users
- `negotiation_updated_at` nullable timestampTz

### Interpretation
- `negotiation_notes`: general article negotiation summary
- `legal_notes`: legal concern/summary
- `commercial_notes`: commercial concern/summary
- `internal_notes`: internal drafting remarks for this article only
- `has_deviation`: marks article as deviating from standard baseline
- `requires_special_approval`: marks article for future approval phase handling

---

## Optional negotiation log table (LOCKED PREFERENCE)

### Preferred design
Add a simple append-only negotiation log/history table:

- `contract_draft_article_negotiations`

Columns:
- `id`
- `contract_draft_article_id`
- `negotiation_status`
- `negotiation_notes` nullable
- `legal_notes` nullable
- `commercial_notes` nullable
- `internal_notes` nullable
- `has_deviation` boolean
- `requires_special_approval` boolean
- `changed_by_user_id`
- `created_at`
- `updated_at`

### Why
This gives a lightweight audit trail of negotiation-state changes without building full discussion threads.

### Locked rule
If you implement this log table:
- it stores negotiation-state snapshots only
- it is append-only
- it does not replace the live fields on `contract_draft_articles`

### Acceptable fallback
If schema simplicity strongly prefers not to add the log table, you may keep only live fields on `contract_draft_articles`.
But the **locked preference is to add the log table** because this phase is specifically about negotiation/deviation capture and auditability.

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
9. `.cursor/docs/contracts/PHASE_1_2_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_3_IMPLEMENTATION_PROMPT.md`
11. `.cursor/docs/contracts/PHASE_4_IMPLEMENTATION_PROMPT.md`
12. `.cursor/docs/contracts/PHASE_5_IMPLEMENTATION_PROMPT.md`
13. `.cursor/docs/contracts/PHASE_6_IMPLEMENTATION_PROMPT.md`

Also inspect actual implementation of:
- `ContractDraftArticle`
- contract draft workspace page
- draft article version compare page
- activity logging patterns
- existing contract status badge/panel patterns

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

## Update `contract_draft_articles`
Add these columns if missing:

- `negotiation_status` string(30) default `'not_reviewed'`
- `negotiation_notes` text nullable
- `legal_notes` text nullable
- `commercial_notes` text nullable
- `internal_notes` text nullable
- `has_deviation` boolean default false
- `requires_special_approval` boolean default false
- `negotiation_updated_by_user_id` foreignId nullable → users
- `negotiation_updated_at` timestampTz nullable

### DB check constraint
Add named check constraint for `negotiation_status`:
- `not_reviewed`
- `in_negotiation`
- `agreed`
- `deviation_flagged`
- `ready_for_review`

## Preferred additional table
Create `contract_draft_article_negotiations` with:

- `id` UUID PK
- `contract_draft_article_id` FK
- `negotiation_status`
- `negotiation_notes` nullable
- `legal_notes` nullable
- `commercial_notes` nullable
- `internal_notes` nullable
- `has_deviation`
- `requires_special_approval`
- `changed_by_user_id`
- `created_at`
- `updated_at`

### Constraints
- FK to `contract_draft_articles`
- FK to `users`
- check constraint for `negotiation_status`
- index on `contract_draft_article_id`

---

## MODEL LAYER

### Update `ContractDraftArticle`
Add:
- negotiation status constants
- helpers:
  - `isNegotiationNotReviewed()`
  - `isInNegotiation()`
  - `isAgreed()`
  - `isDeviationFlagged()`
  - `isReadyForReview()`
- relation:
  - `negotiationUpdatedBy()`
- if log table is implemented:
  - `negotiationLogs()` ordered newest first

### Create `ContractDraftArticleNegotiation` if log table is implemented
Add:
- relationship to draft article
- relationship to changedBy user
- casts for flags and IDs

---

## SERVICE LAYER

Do not put negotiation logic in controllers.

Create a dedicated service such as:
- `ContractDraftNegotiationService`

It must handle:

### 1) `updateNegotiationState(...)`
Input:
- contract
- draft article
- negotiation fields
- actor

Behavior:
- validate ownership (article belongs to contract)
- compare live negotiation fields vs incoming data
- if nothing changed:
  - no new negotiation log snapshot
  - no noisy activity event
- if changed:
  - update live draft article negotiation fields
  - update negotiation_updated_by_user_id / negotiation_updated_at
  - if negotiation log table exists:
    - append a new negotiation snapshot row
  - return changed state for logging

### 2) optional `appendNegotiationSnapshot(...)`
Encapsulate creation of append-only negotiation history rows.

### 3) optional helper for no-op detection
Encapsulate comparison of negotiation fields to avoid noisy writes.

---

## CONTROLLER LAYER

Extend the existing `ContractWorkspaceController` or add a focused negotiation controller if cleaner.

Locked preference:
- keep routes under `contracts.*`
- avoid a separate top-level module

Must provide at minimum:

### New actions
- `updateDraftArticleNegotiation`
- optionally `showDraftArticleNegotiationHistory` if you implement a dedicated history page
  - but this is optional; a compact inline history section inside the workspace page is acceptable

### `updateDraftArticleNegotiation`
Must:
- validate incoming negotiation fields
- call `ContractDraftNegotiationService`
- log activity only when meaningful changes occur
- redirect back with success flash

---

## ROUTES

Add routes under `contracts.*`, recommended:

- `contracts.draft-articles.negotiation.update`

Optional if history page is implemented:
- `contracts.draft-articles.negotiation.history`

Examples:
- `POST /contracts/{contract}/draft-articles/{draftArticle}/negotiation`
- optional `GET /contracts/{contract}/draft-articles/{draftArticle}/negotiation-history`

Keep routing consistent with the module.

---

## UI / PAGES TO BUILD

## Main implementation target: enhance the existing contract draft workspace page

For each draft article on the workspace page, add a **Negotiation / Deviation panel**.

### Required fields in UI
For each draft article, allow editing:

- negotiation status (select)
- has deviation (checkbox / switch)
- requires special approval (checkbox / switch)
- negotiation notes
- legal notes
- commercial notes
- internal notes

### Visual indicators
Show compact badges/indicators for:
- current negotiation status
- deviation flag
- special approval required flag
- modified flag (existing Phase 5/6 behavior)

### Workspace UX rules
- Keep the article editor readable
- Do not collapse everything into one giant wall of text
- Group negotiation fields clearly under a separate section/card per article
- Maintain bilingual article content editing above or alongside the negotiation section

### Optional negotiation history UI
If log table is implemented, add a compact inline history summary under each article or a small history drawer/section:
- changed_at
- changed_by
- negotiation status
- deviation/special approval flags

Locked preference:
- keep history compact
- do not build full threaded timeline UI

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Minimum expectation:
- viewing negotiation workspace uses contract view permission
- updating negotiation fields uses contract update permission

Do not invent a new auth system.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.draft_article_negotiation_updated`
- if negotiation log table exists and you want finer granularity, that is fine, but do not become noisy

### Logging rule
Only log when negotiation fields actually changed.

Suggested `old/new` payload should include:
- `negotiation_status`
- `has_deviation`
- `requires_special_approval`
- note fields

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Negotiation
- negotiation
- negotiation status
- not reviewed
- in negotiation
- agreed
- deviation flagged
- ready for review
- negotiation notes
- legal notes
- commercial notes
- internal notes
- deviation
- requires special approval
- update negotiation
- no negotiation history yet

Extend `contracts.php`.

---

## NAVIGATION

No new top-level nav item is required.

This is part of the contract draft workspace flow.

---

## SEEDING

No new seeders are required for this phase.

---

## NON-GOALS (STRICT)

Do not add:
- approval routing
- threaded negotiation chat
- supplier access
- notifications
- AI suggestions
- rendering
- signatures

Stay inside Phase 7.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- keep services modular
- do not bury negotiation logic in controllers
- preserve Phase 5/6 workspace clarity
- do not disrupt article versioning logic from Phase 6

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes to `contract_draft_articles`
4. Exact schema for `contract_draft_article_negotiations` if created
5. Models created/updated
6. Service(s) added for negotiation/deviation capture
7. How negotiation update works
8. Whether append-only negotiation log was implemented
9. What routes/pages were added or enhanced
10. What policy/permission approach was used
11. What activity logging events were wired
12. What translation keys were added
13. Confirm `npm run build` passes
14. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- each draft article can store structured negotiation state
- deviation flag can be captured
- special-approval-needed flag can be captured
- negotiation updates are auditable
- permissions are enforced
- activity logging is recorded
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about UI placement, enhance the existing contract draft workspace page rather than inventing a separate complex module.
