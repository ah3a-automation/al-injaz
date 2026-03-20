# Contract Module — Phase 4
## Final Implementation Prompt
## Phase 4: RFQ to Contract Handover

---

## TASK

Implement **only Phase 4** of the Contract Module.

This phase builds the first **contract draft creation flow** from an RFQ / award context.

It must allow internal users to:
- start a contract draft from an RFQ
- select the awarded supplier
- optionally select a contract template
- create a contract draft header
- import contract articles into the draft
- preserve source linkage to the RFQ / package / supplier
- prepare the contract draft for later negotiation and approvals

This phase is about **handover and contract draft creation only**.

It must **not** implement the later negotiation/versioning workflow in full detail yet.

---

## STRICT SCOPE

### IN SCOPE
- Contract draft header/entity
- RFQ → contract draft handover action
- Source linkage to RFQ / package / project / supplier
- Template-based article import into contract draft
- Manual article import from master library if needed
- Contract draft status
- Contract draft show page (basic)
- Contract article instance creation inside the draft
- Copy-on-create behavior from master/template articles into contract draft
- Policy/permission integration
- Activity logging integration
- Internal UI/pages/routes for draft creation and viewing
- Development/demo-safe seeding only if needed minimally

### OUT OF SCOPE
Do **not** implement or partially implement:
- full negotiation workspace
- contract-instance version compare UI
- redline editor
- deviation approval workflow
- final contract approvals
- AI recommendation
- PDF/Word rendering
- signature workflow
- outbound legal package generation
- clause variable engine
- supplier-facing contract portal
- final contract execution lifecycle
- amendment/change-order workflow

If something belongs to later phases, do not build it now.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Contract drafts are new entities
A contract draft must be its own entity, separate from:
- RFQ
- template
- master contract article

### Rule 2 — Copy-on-create is mandatory
When a master article or template article is imported into a contract draft:
- create a **contract-specific article instance**
- do **not** keep it as a live reference for editable draft content

This is critical because later negotiation must not mutate master articles or templates.

### Rule 3 — Draft article content is snapshotted at handover time
Each contract draft article must store its own snapshot of:
- source article code
- title_ar
- title_en
- content_ar
- content_en
- source master article id
- source master article version id if available

### Rule 4 — Template is a source, not a live dependency
If a draft is created from a template:
- import articles into the draft
- do not keep the draft dependent on future template changes

### Rule 5 — RFQ remains the business source
The contract draft must preserve source references to:
- project
- procurement package if applicable
- RFQ
- supplier
- template if used

### Rule 6 — This phase creates draft, not final contract governance
Do not build full contract approval stages here.
Only prepare the draft object and imported article structure.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

### Contract draft statuses
Use exactly these statuses for this phase:
- `draft`
- `under_preparation`
- `ready_for_review`
- `cancelled`

Meaning:
- `draft` = newly generated handover draft
- `under_preparation` = user is editing/importing/completing it
- `ready_for_review` = draft is complete enough for future review phases
- `cancelled` = draft abandoned

Do not add approval statuses yet.

### Contract creation source types
Use exactly these source types:
- `rfq_award`
- `manual`

For this phase, main operational path is `rfq_award`.
`manual` can exist for architecture completeness, but do not overbuild manual drafting flow.

### Template selection
During RFQ handover:
- template selection is **optional**
- if selected, template articles are imported
- if not selected, the draft can be created with:
  - no articles initially, or
  - optional manual article selection in the same flow if practical

Locked preference:
- allow template selection, but do not require it

### Draft identity
Each draft must have:
- unique code or number
- bilingual title/name if consistent with project style, or at minimum a clear draft title/number
- status
- source linkage fields
- commercial summary fields copied from source RFQ if available

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

Also inspect actual implementation of:
- RFQ module
- award/recommendation flows
- Contract Articles module
- Contract Templates module
- policy patterns
- activity logging patterns
- internal create/show/edit flows

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL TO IMPLEMENT

### 1) `contracts`
This is the contract draft header table.

Required columns:
- `id`
- `contract_no` or `code` (unique)
- `title_en` nullable
- `title_ar` nullable
- `status` (`draft|under_preparation|ready_for_review|cancelled`)
- `source_type` (`rfq_award|manual`)
- `project_id` nullable or required if the source always provides it
- `procurement_package_id` nullable
- `rfq_id` nullable
- `supplier_id` nullable
- `contract_template_id` nullable
- `currency` nullable
- `commercial_total` nullable numeric/decimal
- `start_date` nullable
- `end_date` nullable
- `description` nullable
- `internal_notes` nullable
- `created_by_user_id`
- `updated_by_user_id` nullable
- `created_at`
- `updated_at`

Required constraints:
- unique on `contract_no` or `code`
- FKs to project / package / rfq / supplier / template / users as applicable

### 2) `contract_items` or `contract_articles_instances`
Use a clear name. Recommended:
- `contract_articles`

This table stores the **draft-local copied article content**.

Required columns:
- `id`
- `contract_id`
- `sort_order`
- `source_contract_article_id` nullable
- `source_contract_article_version_id` nullable
- `source_template_id` nullable
- `source_template_item_id` nullable
- `article_code`
- `title_ar`
- `title_en`
- `content_ar`
- `content_en`
- `origin_type` (`template|library|manual`)
- `is_modified` boolean default false
- `created_at`
- `updated_at`

Required constraints:
- FK to contract
- indexes on contract + sort_order
- optional indexes on source ids

### DB-level check constraints
If consistent with project style, add named check constraints for:
- contract status
- source_type
- origin_type

---

## MODEL LAYER

Create/update models for:
- `Contract`
- `ContractArticle` (draft-local contract article instance)

Important:
This is different from the existing **master** `ContractArticle` model from Phase 1 + 2.

To avoid naming collision/confusion:
- either rename master model logically in codebase if needed, or
- create a clearly separated model name for draft-local rows, such as:
  - `ContractDraftArticle`
  - or similar

### Locked recommendation
Use:
- `Contract` for draft header
- `ContractDraftArticle` for draft-local article instances

Keep naming unambiguous.

### `Contract` requirements
Include:
- status constants
- source type constants
- relationships:
  - project
  - procurementPackage
  - rfq
  - supplier
  - template
  - draftArticles
  - createdBy
  - updatedBy
- helpers:
  - `isDraft()`
  - `isUnderPreparation()`
  - `isReadyForReview()`
  - `isCancelled()`

### `ContractDraftArticle` requirements
Include:
- relationship to contract
- relationship to source master article
- relationship to source master version
- origin type constants

---

## SERVICE LAYER

Do not put handover/import logic in controllers.

Create a dedicated service, such as:
- `ContractHandoverService`

It must handle:
- creating a contract draft from RFQ context
- importing articles from a selected template
- optionally importing selected master articles directly
- creating draft-local article snapshots
- assigning sort order

### Required methods
At minimum:

#### `createFromRfq(...)`
Inputs:
- RFQ
- supplier
- optional template
- optional selected master article ids
- actor/user
- optional metadata overrides

Behavior:
- create contract draft header
- copy key source data from RFQ into contract header
- import draft-local article rows from template and/or selected library articles
- preserve source linkage fields

#### `importTemplateArticles(...)`
Behavior:
- read ordered template items
- for each referenced master article, resolve current version
- create draft-local article snapshot row

#### `importLibraryArticles(...)`
Behavior:
- for each selected master article, resolve current version
- create draft-local article snapshot row

### Ordering rule
If both template articles and manually selected library articles are imported in one flow:
- template articles keep their original template order first
- manually selected additional articles are appended after them

---

## RFQ HANDOVER RULES

### Preconditions
The contract draft handover action should only be available when:
- RFQ is in a suitable post-award state
- supplier selection / award is known
- user has proper permission

Do not guess wildly — inspect current RFQ award flows and follow the real source-of-truth pattern.

### Locked behavior
Handover must use the **awarded supplier** or the explicitly chosen supplier if your current RFQ flow supports that and remains consistent.

Do not create a contract draft without a supplier in the RFQ award handover path unless current business logic explicitly allows it.

### Commercial copy rules
Copy into contract header whatever stable commercial summary fields are already available and trustworthy in the current RFQ flow, such as:
- currency
- quoted total / awarded total / recommended total if one is canonical

Do not invent complex pricing decomposition yet.

---

## CONTROLLER LAYER

Create a controller, such as:
- `ContractController`
or
- `ContractHandoverController` + `ContractController`

Locked preference:
- use a dedicated handover action/controller if that keeps responsibilities cleaner
- but keep the final module routes under the top-level contracts namespace

Must provide at minimum:

### Handover actions
- `createFromRfqForm`
- `storeFromRfq`

### Contract draft actions
- `index`
- `show`
- optionally `edit` only if needed for minimal metadata adjustments in this phase

### `createFromRfqForm`
Must provide:
- RFQ context
- awarded/eligible supplier info
- available active templates
- optional available active master articles
- source summary for user confirmation

### `storeFromRfq`
Must:
- validate inputs
- call `ContractHandoverService`
- log creation/handover
- redirect to contract draft show page

### `show`
Must display:
- contract draft metadata
- source references
- ordered imported draft articles
- clear distinction that these are draft-local copies

---

## ROUTES

Create top-level internal routes under a contracts namespace.

Examples:
- `contracts.index`
- `contracts.show`
- `contracts.create-from-rfq`
- `contracts.store-from-rfq`

If the project already has a contracts module route pattern, extend it consistently.

Important:
Do not bury this under settings.

---

## UI / PAGES TO BUILD

### 1) RFQ → Contract Handover Page
This is the key page in this phase.

Must include:
- RFQ summary
- project / package / supplier source info
- optional template selector
- optional additional article selector from active library
- draft metadata fields if needed:
  - title / description / notes
- create draft action

### 2) Contract Draft Show Page
Must include:
- contract draft header metadata
- source section:
  - RFQ
  - supplier
  - package
  - template if used
- imported draft article list in order
- each row should show:
  - article code
  - English title
  - Arabic title
  - origin indicator (template/library/manual)
- optional short snippet preview, not giant content dumps by default

### 3) Contract Draft Index
Basic internal list is enough for this phase:
- contract number/code
- title
- status
- source type
- supplier
- template
- updated at

---

## DRAFT ARTICLE PREVIEW RULES

Just like template preview, keep this readable.

On contract draft show:
- prioritize article code + bilingual titles
- optional short snippet only
- do not dump very long full legal bodies by default in the main list
- full editing/redline experience belongs to later phases

---

## BILINGUAL UX RULES

Where both languages are shown:
- English in LTR
- Arabic in RTL
- labels explicit
- do not merge both languages into one block

---

## POLICY / PERMISSION RULES

Use existing project authorization architecture.

Minimum expectation:
- only authorized internal users can create contract drafts from RFQs
- only authorized internal users can view contract drafts
- permissions should align with contract governance, RFQ award authority, or existing contract permissions

Do not invent a separate auth system.

---

## ACTIVITY LOGGING

Reuse existing `ActivityLogger`.

At minimum log:
- contract draft created
- RFQ handover executed
- draft articles imported
- template used if applicable
- status changed if it changes during creation flow

Suggested event naming:
- `contracts.contract.created`
- `contracts.contract.handover_from_rfq`
- `contracts.contract.articles_imported`
- `contracts.contract.status_changed`

Keep logs useful and not noisy.

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Contracts
- contracts
- contract draft
- contract number/code
- source type
- rfq award handover
- supplier
- template
- project
- package
- status

### Statuses
- draft
- under preparation
- ready for review
- cancelled

### Source types
- RFQ award
- manual

### Actions
- create contract draft
- handover from RFQ
- back
- save
- cancel

### UI / Sections
- source summary
- imported articles
- additional articles
- template selection
- no articles imported
- no contracts found

Prefer a dedicated `contracts.php` translation namespace if not already present.

---

## NAVIGATION

Add or extend top-level internal navigation for Contracts if not already present.

Keep it aligned with:
- Contract Articles
- Contract Templates
- future contract workflow

Do not place it under settings.

---

## SEEDING

Keep seeding minimal in this phase unless clearly needed.

If you add seed/demo support:
- do not fabricate complex live business handovers
- prefer minimal demo-safe contract drafts only if necessary
- do not create noisy unrealistic production-looking contracts

Seeding is optional for this phase unless needed to support existing local demo flows.

---

## NON-GOALS (STRICT)

Do not add:
- negotiation editor
- contract-local version compare UI
- article restore/revert UI for draft articles
- approval workflow
- deviation workflow
- final rendering
- signature flow
- amendment workflow
- AI recommendation
- placeholders engine

Stay disciplined.

---

## QUALITY / IMPLEMENTATION RULES

- follow existing project coding style
- reuse existing migration/controller/policy/page patterns
- reuse existing activity logging pattern
- keep services modular
- do not bury handover logic in giant controllers
- keep naming clear between master articles and draft-local articles

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created
3. Exact schema for contracts
4. Exact schema for draft-local contract articles
5. Models created/updated
6. Service(s) added for RFQ handover/import
7. How template import works
8. How library article import works
9. What pages/routes were added
10. What policy/permission approach was used
11. What activity logging events were wired
12. What translation keys were added
13. Confirm `npm run build` passes
14. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- contract draft can be created from RFQ handover flow
- source linkage is preserved
- optional template can be selected
- draft-local copied article rows are created
- master articles/templates are not mutated
- contract draft show page clearly displays imported ordered articles
- permissions are enforced
- activity logging is recorded
- build passes

---

## FINAL EXECUTION INSTRUCTION

Implement this phase now.

Do not widen scope.
Do not silently add later-phase features.
If uncertain about RFQ award source-of-truth, inspect the actual RFQ implementation first and follow the established business logic.