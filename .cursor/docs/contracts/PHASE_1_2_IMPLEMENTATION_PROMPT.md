# Contract Module — Phase 1 + Phase 2
## Final Implementation Prompt
## Phase 1: Master Contract Article Library
## Phase 2: Master Article Versioning + Compare

---

## TASK

Implement **only** Phase 1 + Phase 2 of the Contract Module.

This phase is the legal-content foundation only.

You must build:

- master contract article CRUD
- master article versioning
- compare between versions
- restore/revert from a prior version
- bilingual article content management
- article categorization
- article status management
- article list / show / create / edit / compare views
- policy/permission integration
- activity logging integration
- seed data for development/demo

You must **not** build anything outside this scope.

---

## STRICT SCOPE

### IN SCOPE
- Master contract article library
- Version history for master articles
- Compare versions
- Restore/revert version
- Bilingual article content
- Category/classification
- Active / draft / archived state
- Admin/internal UI for article management
- Reuse existing routing / policy / controller / UI / translation / activity-log patterns

### OUT OF SCOPE
Do **not** implement or partially implement any of the following:

- Contracts table / contract drafts
- RFQ-to-contract handover
- Contract templates
- Contract-specific article copies
- Contract-specific article versioning
- AI recommendation or AI settings
- Applicability rules
- Deviation workflow
- Contract approval workflow
- Contract PDF/Word rendering
- Signature workflow
- Clause placeholders/variables engine
- Final contract output generation

If something belongs to a later phase, do not build it now.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Master library only
This phase is for the reusable **master article library** only.

### Rule 2 — Every content edit creates a version
Changing any of the following must create a new version:
- `title_ar`
- `title_en`
- `content_ar`
- `content_en`

### Rule 3 — Metadata-only edits do not create unnecessary content versions
Changing only metadata should update the master article record without creating a new content version:
- `serial`
- `category`
- `status`
- `internal_notes`

### Rule 4 — Revert never overwrites history
Restoring a previous version must create a **new current version** using the old snapshot.
It must never mutate or delete the old version rows.

### Rule 5 — Current article points to current version
The master article record must track its current version.

### Rule 6 — Bilingual content is first-class
Arabic and English title/content are required in this phase.

### Rule 7 — No contract-specific logic in this phase
Nothing should be modeled as a live contract clause yet.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

### Article categories
Use exactly these categories:
- `mandatory`
- `recommended`
- `optional`

Do not invent more categories.

### Article statuses
Use exactly these statuses:
- `draft`
- `active`
- `archived`

### Bilingual requirement
In this phase, all of the following are required:
- `title_ar`
- `title_en`
- `content_ar`
- `content_en`

### Unique code
Each master article must have a unique `code`.

### Serial/order
Each article must have a sortable `serial`.

### Internal notes
Allow nullable internal notes on the article record for internal guidance.

---

## READ FIRST

Before writing any code, read these completely:

### Existing app structure / patterns
- `routes/web.php`
- existing admin/internal CRUD controllers and pages
- existing policy classes for internal admin/library modules
- existing activity logging pattern
- existing translation pattern
- existing React page/layout patterns
- existing shadcn/ui usage pattern
- existing table/filter/form patterns
- existing flash/toast/validation handling patterns

### Must inspect before implementation
- users / permissions / policy patterns
- any current document/article/library-like module already in the app
- any existing compare/history page patterns
- any current admin navigation/menu pattern

### Important instruction
Before proceeding to implementation, briefly report your findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL TO IMPLEMENT

### 1) `contract_articles`
This is the master article identity table.

Required columns:
- `id`
- `code` (unique)
- `serial`
- `category` (`mandatory|recommended|optional`)
- `status` (`draft|active|archived`)
- `current_version_id` nullable initially
- `internal_notes` nullable
- `created_by_user_id`
- `updated_by_user_id` nullable
- `created_at`
- `updated_at`

Recommended indexes:
- unique on `code`
- index on `category`
- index on `status`
- index on `serial`

### 2) `contract_article_versions`
This stores all content snapshots.

Required columns:
- `id`
- `contract_article_id`
- `version_number`
- `title_ar`
- `title_en`
- `content_ar`
- `content_en`
- `change_summary` nullable
- `changed_by_user_id`
- `created_at`
- `updated_at`

Required constraints:
- unique composite on (`contract_article_id`, `version_number`)
- FK to `contract_articles`
- FK to `users`

### Circular FK handling
Because `contract_articles.current_version_id` points to `contract_article_versions.id`, implement migrations carefully:
- create `contract_articles` first without the FK
- create `contract_article_versions`
- then add the FK for `current_version_id`
- or use the project’s safest migration pattern for circular references

Be careful and do not create a broken migration sequence.

---

## MODEL LAYER

### Create / update models
Implement models for:
- `ContractArticle`
- `ContractArticleVersion`

### `ContractArticle` requirements
Include:
- constants for categories
- constants for statuses
- relationships:
  - versions
  - currentVersion
  - createdBy
  - updatedBy
- useful helpers:
  - `isDraft()`
  - `isActive()`
  - `isArchived()`

### `ContractArticleVersion` requirements
Include:
- relationship to article
- relationship to changedBy

---

## VERSIONING SERVICE LAYER

Do **not** put all versioning logic directly in the controller.

Create a dedicated service, such as:
- `ContractArticleVersionService`

It must handle:
- creating version 1 on article creation
- creating new versions on content change
- restoring an older version by creating a new version snapshot
- calculating next version number safely

### Required behavior
#### On create
- create article
- create version 1
- set `current_version_id`

#### On update
If content/title changed:
- create new version with `version_number = previous max + 1`
- update `current_version_id`

If only metadata changed:
- update article without creating a new version

#### On restore
- verify selected version belongs to selected article
- create new version using the selected version’s bilingual content
- set a meaningful `change_summary`, e.g.:
  - `Restored from version X`
- update `current_version_id`

Do not overwrite old versions.

---

## CONTROLLER LAYER

Create a controller for the master article library, e.g.:
- `ContractArticleController`

It should provide at minimum:

- `index`
- `create`
- `store`
- `show`
- `edit`
- `update`
- `compare`
- `restore`

### Index action
Must support:
- pagination
- filter by category
- filter by status
- search query across:
  - `code`
  - `title_ar`
  - `title_en`
  - `content_ar`
  - `content_en`

### Show action
Must load:
- article metadata
- current version
- version history

### Compare action
Must support:
- current version vs selected version
- any version vs any version

### Compare defaulting rule
If no versions are specified and the article has at least two versions:
- default to comparing **latest version vs immediately previous version**

### Restore action
Must:
- validate ownership: the selected version must belong to the selected article
- call versioning service
- log the restore action
- redirect back with success

---

## ROUTES

Create clear routes for the master article library.

Use route names in this style unless your project already has a better consistent internal pattern:
- `contract-articles.index`
- `contract-articles.create`
- `contract-articles.store`
- `contract-articles.show`
- `contract-articles.edit`
- `contract-articles.update`
- `contract-articles.compare`
- `contract-articles.restore`

Important:
These routes are for the **master article library**, not contract drafts.

---

## UI / PAGES TO BUILD

### 1) Article Library Index
Must include:
- code
- serial
- title
- category
- status
- current version number
- updated at
- actions

Filters:
- category
- status
- search

### 2) Create Article Page
Must include:
- code
- serial
- category
- status
- title_ar
- title_en
- content_ar
- content_en
- internal_notes
- optional change summary for initial version if useful

### 3) Edit Article Page
Must include:
- metadata editing
- bilingual title/content editing
- change summary field for versioned content changes
- current version info visible

### 4) Article Show Page
Must include:
- article metadata
- bilingual current content
- version history list
- compare action
- restore action
- audit metadata

### 5) Compare View
Locked UX decision:
- use **language tabs**
  - Arabic
  - English
- inside each tab, use **side-by-side old vs new**
- compare at least:
  - title
  - content

Do not build a 4-column bilingual diff.
Do not overbuild a complex word-level diff engine unless it is already easy and consistent with project patterns.

---

## BILINGUAL UX RULES

Where both languages are shown:
- English content/title should be displayed in LTR context
- Arabic content/title should be displayed in RTL context
- labels must be explicit
- do not merge Arabic and English into one field block

On index page:
- concise bilingual presentation is okay

On show/compare pages:
- bilingual content must be clearly readable

---

## POLICY / PERMISSION RULES

Use the existing project authorization architecture.

Minimum expectation:
- only authorized internal users can create/edit/archive/restore articles
- read-only internal users can view/compare if your existing policy model supports that

Do not invent a separate auth system.
Reuse existing permission and policy style from the project.

---

## ACTIVITY LOGGING

Reuse the project’s real activity logging pattern.

At minimum log:
- article created
- article metadata updated
- article content version created
- article restored
- article status changed to archived
- article status changed to active

### Logging rule
If status changes as part of metadata update:
- use the project’s cleanest existing activity style
- avoid noisy duplicate logs
- if the project pattern supports a specific status-change event, prefer that over generic duplicated update events

Do not invent a parallel audit subsystem.

---

## SEED DATA

Add development/demo seed data for this phase.

Requirements:
- seed at least 12 realistic bilingual contract articles
- mix categories:
  - mandatory
  - recommended
  - optional
- include a mix of statuses if appropriate
- create at least some articles with 2+ historical versions
- make seeded version history useful for compare/revert testing

Important:
- seeded clause text must be concise
- internally consistent
- clearly **demo/development quality**
- do **not** make it sound like final production-approved legal drafting

This is seed data for development/testing, not legal approval content.

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Article library
- contract articles
- article code
- serial
- category
- mandatory
- recommended
- optional
- status
- draft
- active
- archived
- internal notes

### Versioning
- version history
- version number
- current version
- changed by
- changed at
- change summary
- compare versions
- restore version
- restored from version
- create new version
- no versions found

### Bilingual content
- Arabic title
- English title
- Arabic content
- English content

Use the project’s existing translation structure and namespaces.

---

## NAVIGATION

If the project has an internal admin/legal/settings navigation area, add the article library in the most appropriate place using existing menu patterns.

Do not create messy or isolated navigation.

---

## NON-GOALS (STRICT)

Do not add:
- templates
- contracts table
- contract builder
- AI provider settings
- AI recommendation engine
- contract-specific article copies
- contract-specific versions
- deviation tracking
- contract approval workflow
- PDF/Word export
- placeholders engine

Stay disciplined.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- reuse existing controller/page/form/table patterns
- reuse existing policy structure
- reuse existing activity logging pattern
- reuse existing translation strategy
- keep code modular and reviewable
- do not bury core logic in giant controllers
- do not create fake abstractions if existing project patterns are simpler

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created
3. Exact schema for `contract_articles`
4. Exact schema for `contract_article_versions`
5. Models created/updated
6. Service(s) added for versioning
7. How create → version 1 works
8. How metadata-only update vs content update is handled
9. How restore/revert works
10. How compare UX was implemented
11. What pages/routes were added
12. What policy/permission approach was used
13. What activity logging pattern was reused
14. What seeders were added
15. What translation keys were added
16. Confirm `npm run build` passes
17. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- master article CRUD works
- code is unique
- categories are exactly mandatory / recommended / optional
- statuses are exactly draft / active / archived
- create makes version 1
- content edits create new versions
- metadata-only edits do not create unnecessary versions
- show page displays version history
- compare works in bilingual tabbed side-by-side mode
- restore creates a new version instead of overwriting history
- permissions are enforced
- activity logging is recorded
- seed data exists for testing
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not ask to widen scope.
Do not silently add later-phase features.
If you are unsure about a project pattern, inspect existing similar modules first and follow the established style.