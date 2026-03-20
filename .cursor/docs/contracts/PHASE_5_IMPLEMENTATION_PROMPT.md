# Contract Module — Phase 5
## Final Implementation Prompt
## Phase 5: Contract Draft Workspace / Preparation

---

## TASK

Implement **only Phase 5** of the Contract Module.

This phase builds the first real **contract draft workspace** on top of Phase 4.

It must allow internal users to:
- open a contract draft
- edit draft header metadata
- reorder draft-local articles
- add draft-local articles from the master article library
- remove draft-local articles from the draft
- mark draft-local articles as modified when their content changes
- edit draft-local article titles/content inside the draft
- move the contract draft through the limited preparation statuses:
  - `draft`
  - `under_preparation`
  - `ready_for_review`
  - `cancelled`

This phase is about **preparation workspace only**.

It must **not** implement:
- full negotiation/redline history UI
- draft article version compare/restore
- approval workflow
- deviation approval
- PDF/Word output
- signature flow

---

## STRICT SCOPE

### IN SCOPE
- Contract draft edit page/workspace
- Contract header metadata editing
- Draft-local article list management
- Add article from master article library into draft
- Remove article from draft
- Reorder draft articles
- Edit draft-local article content in the draft
- `is_modified` handling on draft-local articles
- Draft status updates within the Phase 5 statuses
- Activity logging
- Policy/permission integration
- Translations for draft workspace UI

### OUT OF SCOPE
Do **not** implement or partially implement:
- draft article historical version table
- draft article restore/revert
- article diff/compare
- legal redline engine
- track-changes UI
- negotiation threads
- approval workflow
- AI recommendations
- placeholders/variables
- final rendering
- e-signature
- amendments/change orders
- supplier-facing contract workspace

Stay inside Phase 5.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Draft-local articles remain the only editable contract content
Only the **draft-local copied articles** may be edited in the contract draft workspace.

Do not edit:
- master `ContractArticle`
- `ContractTemplate`
- template items

### Rule 2 — Editing a draft article does not affect library/template sources
Draft article editing is isolated to the contract draft.

### Rule 3 — `is_modified` must reflect actual draft changes
When a draft-local article’s editable content is changed, mark:
- `is_modified = true`

If only sort order changes, do **not** set `is_modified` because that is structural, not textual content modification.

### Rule 4 — No version history UI yet
This phase may store update timestamps and change flags, but must **not** introduce full draft-article versioning/history UI.
That belongs to a later phase.

### Rule 5 — Draft preparation statuses only
In this phase, the contract header may transition only among:
- `draft`
- `under_preparation`
- `ready_for_review`
- `cancelled`

Do not implement later execution statuses as part of the preparation workspace logic.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

### Contract draft statuses for this workspace
Use exactly:
- `draft`
- `under_preparation`
- `ready_for_review`
- `cancelled`

### Status transition rules
For this phase, enforce:

- `draft` → `under_preparation`
- `draft` → `cancelled`

- `under_preparation` → `ready_for_review`
- `under_preparation` → `cancelled`

- `ready_for_review` → `under_preparation`
- `ready_for_review` → `cancelled`

- `cancelled` → terminal for this phase

Do not add approval statuses or live execution statuses to this workspace logic.

### Draft article origin types remain
Continue to use:
- `template`
- `library`
- `manual`

If an article is added from the master library during workspace editing:
- create a new `ContractDraftArticle`
- `origin_type = library`

This phase does **not** need to create `manual` free-typed articles unless it is trivial and clearly consistent with the project.  
Locked preference: **do not add free-manual article authoring yet**. Only add from library.

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

Also inspect actual implementation of:
- Contract Articles module
- Contract Templates module
- Phase 4 contract draft handover
- Contract show/index pages
- status badge patterns
- activity logging patterns
- policy patterns

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA CHANGES

### Existing tables to reuse
- `contracts`
- `contract_draft_articles`

### Schema changes allowed in this phase
Only add columns if truly needed for workspace support.

Recommended minimal additions only if missing:
- `updated_by_user_id` on `contract_draft_articles` nullable FK → users
- optional `last_edited_at` on `contract_draft_articles` nullable timestampTz

Do **not** introduce:
- `contract_draft_article_versions`
- `contract_negotiations`
- `contract_redlines`

Keep schema light.

### Optional minimal check
If useful and consistent, ensure `is_modified` remains boolean default false and is used as the primary textual change indicator.

---

## MODEL LAYER

Use the existing:
- `Contract`
- `ContractDraftArticle`

Add/update only what is required.

### `Contract`
Must support:
- transition helper methods for Phase 5 statuses
- allowed transition helper
- status convenience helpers if missing

Recommended helpers:
- `getAllowedPreparationTransitions(): array`
- `canPreparationTransitionTo(string $status): bool`

### `ContractDraftArticle`
Must support:
- content editing
- ordering
- `is_modified`
- optional relationships to source library/template references

Recommended helpers:
- `isFromTemplate()`
- `isFromLibrary()`
- `isManual()`

---

## SERVICE LAYER

Do not put workspace logic in controllers.

Create a dedicated service such as:
- `ContractDraftWorkspaceService`

It must handle:

### 1) Header updates
Update contract draft metadata such as:
- `title_en`
- `title_ar`
- `description`
- `internal_notes`
- `start_date`
- `end_date`

### 2) Draft status transition
Transition the draft among:
- `draft`
- `under_preparation`
- `ready_for_review`
- `cancelled`

using the locked rules above.

### 3) Add library article to draft
Input:
- contract
- source master article id
- actor

Behavior:
- resolve current master article version
- create a new `ContractDraftArticle`
- append it at the end of the draft article order
- snapshot current title/content/code
- `origin_type = library`
- `is_modified = false`

### 4) Update draft article content
Input:
- contract
- draft article
- updated fields (`title_en`, `title_ar`, `content_en`, `content_ar`)
- actor

Behavior:
- update the draft-local row only
- set `is_modified = true` if any textual field actually changed
- update `updated_by_user_id` / `last_edited_at` if those columns exist

### 5) Remove draft article
Input:
- contract
- draft article
- actor

Behavior:
- delete the row
- then normalize/rebuild `sort_order` for the remaining draft articles

### 6) Reorder draft articles
Input:
- ordered list of draft article ids

Behavior:
- validate all ids belong to the same contract
- rewrite `sort_order` according to the provided sequence
- do not alter `is_modified` merely because order changed

### 7) Normalize ordering helper
After remove/reorder/add, the article list must remain with clean contiguous order:
- 1, 2, 3, 4, ...

---

## CONTROLLER LAYER

Extend existing `ContractController` or add a dedicated workspace controller if cleaner.

Locked preference:
- keep top-level routes under `contracts.*`
- keep workspace actions near the contract module, not in a side namespace unless it improves clarity

Must provide at minimum:

### Contract workspace actions
- `edit`
- `update`
- `updateStatus`
- `addArticle`
- `updateDraftArticle`
- `removeDraftArticle`
- `reorderDraftArticles`

### `edit`
Must render the contract draft workspace page with:
- contract metadata
- source summary
- ordered draft articles
- available active master articles for add-to-draft selection
- current status and allowed transitions

### `update`
Updates contract header metadata only.

### `updateStatus`
Transitions contract status using the locked preparation transition rules.

### `addArticle`
Adds one master article into the contract as a new draft-local article.

### `updateDraftArticle`
Updates one draft-local article’s editable snapshot content.

### `removeDraftArticle`
Removes one draft-local article from the draft.

### `reorderDraftArticles`
Reorders draft articles based on a submitted ordered list.

---

## ROUTES

Add or extend top-level internal routes under `contracts.*`.

At minimum:

- `contracts.edit`
- `contracts.update`
- `contracts.update-status`
- `contracts.add-article`
- `contracts.draft-articles.update`
- `contracts.draft-articles.remove`
- `contracts.draft-articles.reorder`

Keep routing consistent with existing internal module conventions.

---

## UI / PAGES TO BUILD

### 1) Contract Draft Workspace Page
This is the main page for Phase 5.

Use the existing `contracts.edit` page or a dedicated workspace page.

It must include:

#### A. Contract metadata section
Editable fields:
- title_en
- title_ar
- description
- internal_notes
- start_date
- end_date

#### B. Source summary section
Prominently display:
- RFQ
- supplier
- project
- procurement package
- template used (if any)

This must stay visible near the top.

#### C. Status section
Show:
- current draft status
- allowed next actions/buttons according to locked transitions

Examples:
- Move to Under Preparation
- Move to Ready for Review
- Move back to Under Preparation
- Cancel Draft

Do not show later-phase approval buttons.

#### D. Add article section
Provide a compact searchable picker/list of active master contract articles:
- code
- English title
- Arabic title
- short snippet only
- add button

Do not dump full legal bodies here.

#### E. Draft article workspace list
For each draft article show:
- sort order
- article code
- origin badge (`template` / `library`)
- editable fields:
  - title_en
  - title_ar
  - content_en
  - content_ar
- modified indicator if `is_modified = true`
- remove button
- reorder controls:
  - move up
  - move down
  - or another simple stable pattern

Locked preference:
- simple move up/down buttons are acceptable
- do not introduce heavy drag-drop libraries unless the project already has a stable pattern for them

---

## PREVIEW / CONTENT RULES

### On show page
Continue Phase 4 behavior:
- code
- bilingual titles
- optional short snippet only

### On edit/workspace page
The draft article fields themselves are editable.
This is the first place where the user may edit the full draft-local text.

Important:
- editing here edits only the contract draft copy
- never mutate master article/template content

---

## POLICY / PERMISSION RULES

Use the existing authorization architecture.

Minimum expectation:
- only internal authorized users can edit draft workspace
- only authorized users can add/remove/reorder draft articles
- contract viewing continues to use contract policy

Do not invent a new auth system.

---

## ACTIVITY LOGGING

Reuse the existing `ActivityLogger`.

At minimum log:
- contract draft metadata updated
- contract draft status changed
- draft article added
- draft article updated
- draft article removed
- draft articles reordered

Suggested event names:
- `contracts.contract.metadata_updated`
- `contracts.contract.status_changed`
- `contracts.contract.draft_article_added`
- `contracts.contract.draft_article_updated`
- `contracts.contract.draft_article_removed`
- `contracts.contract.draft_articles_reordered`

Keep logs useful and not noisy.

### Important logging rule
For draft article updates:
- only log update event when textual content actually changed
- do not log “updated” if nothing changed

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Contract draft workspace
- edit contract draft
- metadata
- source summary
- draft articles
- add article
- available articles
- no articles
- modified
- origin
- template
- library
- move up
- move down
- remove
- save changes

### Status actions
- move to under preparation
- move to ready for review
- move back to under preparation
- cancel draft

### Status labels
- draft
- under preparation
- ready for review
- cancelled

Prefer extending `contracts.php`.

---

## NAVIGATION

No major new nav item is required if Contracts already exists.

Do not add unnecessary extra top-level nav clutter.

---

## SEEDING

No new seeders are required unless strictly needed.
Phase 5 should work against contract drafts already created through Phase 4 flows.

---

## NON-GOALS (STRICT)

Do not add:
- article version history table
- compare UI for draft-local articles
- restore/revert UI
- approval workflow
- AI
- rendering
- e-signature
- negotiation threads
- amendment management

Stay inside Phase 5.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- reuse existing controller/page/form patterns
- keep services modular
- do not bury workspace logic in giant controllers
- keep draft-local article editing isolated from master/template layers

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema changes (if any) to `contracts` / `contract_draft_articles`
4. Models created/updated
5. Service(s) added for contract draft workspace
6. How header update works
7. How status transition works
8. How add/remove/reorder draft articles works
9. How `is_modified` is set
10. What routes/pages were added
11. What policy/permission approach was used
12. What activity logging events were wired
13. What translation keys were added
14. Confirm `npm run build` passes
15. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- contract draft metadata can be edited
- draft status can move only through the locked preparation transitions
- master library articles can be added into the draft
- draft-local articles can be removed
- draft-local articles can be reordered cleanly
- draft-local article content can be edited
- `is_modified` is set correctly for textual changes
- permissions are enforced
- activity logging is recorded
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about existing contract policy or page patterns, inspect the current contract module first and follow the established style.