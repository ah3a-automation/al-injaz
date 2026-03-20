# Contract Module — Phase 6
## Final Implementation Prompt
## Phase 6: Draft Article Change Tracking / Negotiation Foundation

---

## TASK

Implement **only Phase 6** of the Contract Module.

This phase introduces the first controlled **change tracking foundation** for contract draft articles.

It must allow internal users to:
- keep editing draft-local contract articles
- automatically record draft-article versions when textual content changes
- compare versions of a draft-local article
- restore a prior draft-local article version by creating a new current version
- preserve a clean audit trail for negotiation-related content changes

This phase is about **version tracking foundation only**.

It must **not** implement:
- full negotiation discussion threads
- supplier collaboration
- legal redline markup UI
- approval workflow
- final rendering
- e-signature
- deviation approval routing

---

## STRICT SCOPE

### IN SCOPE
- Draft article version history table
- Automatic version creation on textual draft article changes
- Current version pointer or equivalent current-version logic
- Draft article compare view
- Draft article restore action
- Show version history within the draft workspace or a dedicated article history page
- Activity logging for draft-article version events
- Policy/permission integration
- EN/AR translations for versioning UI

### OUT OF SCOPE
Do **not** implement or partially implement:
- full negotiation threads/chat
- inline redline/track-changes markup
- word-level diff engine
- supplier-side visibility
- approval workflow
- clause variable engine
- PDF/Word rendering
- amendment workflow
- AI negotiation suggestions

Stay inside Phase 6.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Versioning is for draft-local articles only
This phase applies only to **ContractDraftArticle** rows.

Do not add versioning to:
- master `ContractArticle`
- `ContractTemplate`
- contract header metadata

### Rule 2 — Current draft article remains the editable row
Keep the existing `contract_draft_articles` row as the current editable article record.

Version history must support that row, not replace it with an entirely different editing pattern.

### Rule 3 — Every textual change creates a version record
When any of these fields change:
- `title_en`
- `title_ar`
- `content_en`
- `content_ar`

the system must create a version record representing the previous or new state according to the locked model below.

### Rule 4 — Restore never deletes history
Restoring a prior version must not overwrite or delete historical version rows.
Restore must produce a safe current result while preserving the full audit trail.

### Rule 5 — Ordering changes are not version events
Changing `sort_order` is structural and must not create draft article content versions.

### Rule 6 — `is_modified` remains meaningful
`is_modified` continues to indicate that the draft-local article content diverged from its imported starting point.
Version history does not replace this flag.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Versioning model (LOCKED)
Use this model:

### Current editable row
`contract_draft_articles` remains the live editable row.

### History table
Create a new table for historical snapshots, recommended name:
- `contract_draft_article_versions`

Each version row stores a snapshot of:
- `contract_draft_article_id`
- `version_number`
- `title_en`
- `title_ar`
- `content_en`
- `content_ar`
- `change_summary` nullable
- `changed_by_user_id`
- `created_at`
- `updated_at`

### Snapshot rule
On the **first tracked edit** to a draft article:
- create version 1 from the article’s pre-edit state
- then apply the new edit to the live `contract_draft_articles` row

On each later tracked edit:
- create the next version row from the article’s pre-edit state
- then apply the new edit to the live row

This means:
- history table stores **prior states**
- live row stores the latest/current state

### Restore rule
When restoring version X:
- create a new version row from the current live state before restoration
- then copy the restored version’s content into the live row
- keep `is_modified = true`
- update editor metadata on the live row
- do not delete any historical versions

This is the safest and clearest approach for this phase.

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

Also inspect actual implementation of:
- `ContractDraftArticle`
- `ContractDraftWorkspaceService`
- contract workspace page
- existing compare/restore patterns in Contract Articles module
- activity logging usage

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL / SCHEMA TO ADD

### New table: `contract_draft_article_versions`

Required columns:
- `id`
- `contract_draft_article_id`
- `version_number`
- `title_en`
- `title_ar`
- `content_en`
- `content_ar`
- `change_summary` nullable
- `changed_by_user_id`
- `created_at`
- `updated_at`

Required constraints:
- FK to `contract_draft_articles`
- FK to `users`
- unique composite:
  - (`contract_draft_article_id`, `version_number`)

Recommended indexes:
- index on `contract_draft_article_id`
- index on (`contract_draft_article_id`, `version_number`)

### No separate current_version_id required in this phase
Do **not** add `current_version_id` to `contract_draft_articles` unless truly necessary.
The live row itself is the current version.
History rows are prior states only.

This keeps the model simpler and aligned with the locked snapshot rule.

---

## MODEL LAYER

### Create
- `ContractDraftArticleVersion`

### Update existing
- `ContractDraftArticle`

### `ContractDraftArticleVersion` requirements
Include:
- UUID PK if consistent with project
- relationship to draft article
- relationship to changedBy user
- casts for IDs/version number

### `ContractDraftArticle` updates
Add:
- `versions()` relationship ordered by `version_number DESC`
- optional helper:
  - `hasHistory(): bool`

---

## SERVICE LAYER

Do not put versioning logic in controllers.

Create a dedicated service such as:
- `ContractDraftArticleVersionService`

It must handle:

### 1) `updateDraftArticleWithVersioning(...)`
Input:
- contract
- draft article
- new content fields
- actor
- optional `change_summary`

Behavior:
- validate the article belongs to the contract
- compare incoming textual fields vs live row
- if no textual changes:
  - do not create a version row
  - do not log a version event
  - do not mark as changed unnecessarily
- if textual changes exist:
  - create next history snapshot row from the **current live state**
  - then update the live row with new content
  - set `is_modified = true`
  - update `updated_by_user_id`, `last_edited_at`

### 2) `restoreVersion(...)`
Input:
- contract
- draft article
- target version
- actor
- optional `change_summary`

Behavior:
- validate ownership:
  - version belongs to draft article
  - draft article belongs to contract
- create a new history row from the current live row before restore
- overwrite the live row’s textual fields using the target version snapshot
- set `is_modified = true`
- update editor metadata

### 3) `nextVersionNumber(...)`
Return the next version number for one draft article.

### 4) optional `recordInitialVersionIfNeeded(...)`
If helpful, encapsulate the “first tracked edit” logic cleanly.

---

## CONTROLLER LAYER

Extend the contract workspace controller or add a dedicated draft-article history controller if cleaner.

Locked preference:
- keep routes under `contracts.*`
- do not create a separate top-level module

Must provide at minimum:

### New actions
- `compareDraftArticle`
- `restoreDraftArticleVersion`

### Update existing action
- replace the current direct textual update flow so that it uses `ContractDraftArticleVersionService::updateDraftArticleWithVersioning(...)`

### `compareDraftArticle`
Must:
- load one draft article and its versions
- default comparison behavior:
  - if at least one history version exists:
    - compare latest history version vs current live row
  - if explicit version id is provided:
    - compare that selected history version vs current live row
- render an Inertia compare page

### `restoreDraftArticleVersion`
Must:
- restore selected version into the live row using the service
- redirect back to workspace or compare page with success flash

---

## ROUTES

Add routes under `contracts.*` for draft article versioning.

Recommended:
- `contracts.draft-articles.compare`
- `contracts.draft-articles.restore-version`

Examples:
- `GET /contracts/{contract}/draft-articles/{draftArticle}/compare`
- `POST /contracts/{contract}/draft-articles/{draftArticle}/versions/{version}/restore`

Keep route naming consistent with existing module style.

---

## UI / PAGES TO BUILD

### 1) Draft workspace enhancements
On the Phase 5 workspace page, for each draft article add:
- a `History` / `Compare` button when version history exists
- optional small badge showing number of previous versions

Do not overload the workspace UI.

### 2) Draft article compare page
Create a dedicated compare page for one draft article.

Must include:
- contract context breadcrumb
- article code
- current origin badge
- language tabs:
  - English
  - Arabic
- side-by-side compare:
  - Left = selected historical version
  - Right = current live row
- version selection list/table:
  - version number
  - changed_at
  - changed_by
  - optional change_summary
  - compare action
  - restore action

### Locked compare decision
Do **not** build a 4-column bilingual diff.
Use:
- language tabs
- two-column compare for the selected language

This matches the earlier module pattern and avoids UI overload.

### Compare empty state
If no versions exist yet:
- show a clean informational empty state
- do not render a broken compare layout

---

## CONTENT / PREVIEW RULES

### On compare page
Show full content for the selected language in side-by-side compare cards.
This page is specifically for inspection of article changes, so full content is acceptable here.

### On workspace page
Continue the Phase 5 pattern:
- full editable text inside the editor area
- compact surrounding chrome
- no unnecessary duplication of compare content inline

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Minimum expectation:
- viewing compare page requires contract view permission
- restoring a version requires contract update permission
- updating draft article content continues to require contract update permission

Do not invent a new auth system.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- draft article version snapshot created
- draft article restored from prior version

Suggested event names:
- `contracts.contract.draft_article_version_created`
- `contracts.contract.draft_article_restored`

### Logging rules
- When textual edit causes version creation:
  - log the version creation event
- When restore occurs:
  - log restore event
- Keep the Phase 5 `draft_article_updated` event if textual content changed, but do not create duplicate noisy events without purpose

A good pattern is:
- version created
- draft article updated
for textual edit
and
- version created (snapshot before restore)
- draft article restored
for restore

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Versioning
- article history
- compare changes
- restore version
- version number
- changed by
- changed at
- change summary
- no version history yet
- compare current vs selected version

### Compare UI
- current version
- historical version
- select version
- restore this version
- English
- Arabic

Extend `contracts.php` unless there is a better clearly established namespace.

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
- word-level visual diff engine
- inline redline markup
- comments/discussion threads
- approval routing
- supplier visibility
- AI negotiation features
- final output generation

Stay inside Phase 6.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- reuse compare page patterns from Contract Articles where helpful
- keep services modular
- do not bury versioning logic in controllers
- preserve contract draft workspace clarity

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created
3. Exact schema for `contract_draft_article_versions`
4. Models created/updated
5. Service(s) added for draft article versioning
6. How update-with-versioning works
7. How restore works
8. What routes/pages were added
9. What policy/permission approach was used
10. What activity logging events were wired
11. What translation keys were added
12. Confirm `npm run build` passes
13. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- draft article textual edits create history rows correctly
- no-op edits do not create history rows
- compare page works for draft article history
- restore works safely without deleting history
- permissions are enforced
- activity logging is recorded
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not add later-phase features.
If uncertain about compare UX, inspect the existing Contract Articles compare implementation and follow the same language-tab + side-by-side pattern.