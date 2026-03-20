# Contract Module — Phase 3
## Final Implementation Prompt
## Phase 3: Contract Templates

---

## TASK

Implement **only Phase 3** of the Contract Module.

This phase builds the **Contract Templates** layer on top of the already-completed master contract article library.

A contract template is a reusable, ordered bundle of **master contract articles** for a common contract type, such as:
- standard supply contract
- supply + installation
- subcontract
- service agreement
- consultancy agreement

Templates must allow internal users to:
- create templates
- edit template metadata
- add/remove master articles to a template
- order template articles
- classify template status
- preview template contents
- clone template structure later in future phases

This phase is about **template definition only**.

It must **not** create live contract drafts yet.

---

## STRICT SCOPE

### IN SCOPE
- Contract template CRUD
- Template metadata
- Template article selection from **master contract articles**
- Template article ordering
- Template article include/exclude management
- Template detail/preview page
- Internal module pages/routes/translations/navigation
- Policy/permission integration
- Activity logging integration
- Development/demo seed data for templates

### OUT OF SCOPE
Do **not** implement or partially implement any of the following:

- `contracts` table
- RFQ-to-contract handover
- contract draft builder
- contract-specific article copies
- contract-specific article versioning
- AI recommendation / AI settings
- applicability rules engine
- deviation workflow
- contract approval workflow
- PDF/Word rendering
- final contract output generation
- placeholders/variables engine
- negotiation workspace
- signing workflow

If something belongs to Phase 4 or later, do not build it now.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Templates reference master articles only
Templates must be built from the **master article library** created in Phase 1 + 2.

### Rule 2 — Templates do not duplicate article content
In this phase, templates should reference master articles and their current library identity.
They should **not** create contract-local snapshots yet.

### Rule 3 — Templates are reusable bundles, not contracts
A template is not a live contract, not a negotiation artifact, and not a supplier-specific draft.

### Rule 4 — Ordered composition is required
Each template must maintain an explicit article order.

### Rule 5 — Templates must support future cloning
The schema and service design should make it easy in future phases to generate a contract draft from a template, but this phase must not implement that cloning yet.

### Rule 6 — Only active master articles should normally be selectable
Templates should be composed from `active` master articles by default.
Historical or archived articles should not be normal selectable candidates unless clearly handled as read-only legacy references.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

### Template statuses
Use exactly these template statuses:
- `draft`
- `active`
- `archived`

Meaning:
- `draft` = internal preparation
- `active` = approved for normal reuse
- `archived` = no longer used for new contract drafting in future phases

### Template types
Use exactly these template types for now:
- `supply`
- `supply_install`
- `subcontract`
- `service`
- `consultancy`

Do not invent more types in this phase.

### Template identity
Each template must have:
- unique code
- English name
- Arabic name
- type
- status
- optional description/notes

### Template composition
Template items must reference:
- the master article id
- display order / serial within template

No contract-specific content editing belongs here.

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

Also inspect the actual implementation of:
- Contract Articles module from Phase 1 + 2
- existing internal CRUD/DataTable modules
- current policy patterns
- activity logging usage
- internal navigation/menu patterns

### Important instruction
Before proceeding to implementation, briefly report your findings in **8–12 bullets maximum**, then proceed directly to implementation.

Do not produce a long essay before coding.

---

## DATA MODEL TO IMPLEMENT

### 1) `contract_templates`
This is the master template table.

Required columns:
- `id`
- `code` (unique)
- `name_en`
- `name_ar`
- `template_type` (`supply|supply_install|subcontract|service|consultancy`)
- `status` (`draft|active|archived`)
- `description` nullable
- `internal_notes` nullable
- `created_by_user_id`
- `updated_by_user_id` nullable
- `created_at`
- `updated_at`

Recommended indexes:
- unique on `code`
- index on `template_type`
- index on `status`

### 2) `contract_template_items`
This is the ordered join table between templates and master articles.

Required columns:
- `id`
- `contract_template_id`
- `contract_article_id`
- `sort_order`
- `created_at`
- `updated_at`

Required constraints:
- FK to `contract_templates`
- FK to `contract_articles`
- unique composite on (`contract_template_id`, `contract_article_id`) so the same article is not added twice to one template

Recommended indexes:
- index on (`contract_template_id`, `sort_order`)

### DB-level check constraints
If consistent with project migration style, add named check constraints for:
- `template_type`
- `status`

---

## MODEL LAYER

### Create / update models
Implement models for:
- `ContractTemplate`
- `ContractTemplateItem`

### `ContractTemplate` requirements
Include:
- constants for template types
- constants for statuses
- relationships:
  - items
  - articles through items if useful
  - createdBy
  - updatedBy
- useful helpers:
  - `isDraft()`
  - `isActive()`
  - `isArchived()`

### `ContractTemplateItem` requirements
Include:
- relationship to template
- relationship to contract article

---

## SERVICE LAYER

Do not bury all composition logic directly in the controller.

Create a dedicated service, such as:
- `ContractTemplateService`

It must handle:
- creating a template with ordered article items
- updating template metadata
- syncing template article set
- reordering template articles safely

### Required behavior
#### On create
- create the template
- attach selected master articles in the provided order
- store explicit `sort_order`

#### On update
Must support:
- metadata-only update
- items-only update
- full update of metadata + item order

#### On item sync
- if an article is removed from the template, remove its template item
- if a new article is added, create a template item
- preserve or rebuild explicit ordering cleanly

### Rule
This phase manages template composition only.
It must not clone article content into another table.

---

## CONTROLLER LAYER

Create a controller for the template module, e.g.:
- `ContractTemplateController`

It should provide at minimum:

- `index`
- `create`
- `store`
- `show`
- `edit`
- `update`

### Index action
Must support:
- pagination
- filter by template type
- filter by status
- search query across:
  - `code`
  - `name_en`
  - `name_ar`
  - `description`

### Show action
Must load:
- template metadata
- ordered template items
- referenced master articles with current version data for preview

### Create / edit actions
Must provide:
- available **active** master articles for selection
- existing selected articles in order
- template type options
- status options

### Update action
Must allow:
- metadata update
- ordered article list update
- add/remove articles from template

---

## ROUTES

Create clear routes for the templates module.

Use route names in this style unless your project already has a better consistent internal pattern:
- `contract-templates.index`
- `contract-templates.create`
- `contract-templates.store`
- `contract-templates.show`
- `contract-templates.edit`
- `contract-templates.update`

Important:
This module is top-level internal, like Contract Articles.
Do not bury it under settings.

---

## UI / PAGES TO BUILD

### 1) Template Index
Must include:
- code
- English / Arabic name
- template type
- status
- article count
- updated at
- actions

Filters:
- template type
- status
- search

### 2) Create Template Page
Must include:
- code
- name_en
- name_ar
- template_type
- status
- description
- internal_notes
- article picker from active master articles
- selected articles list with ordering controls

### 3) Edit Template Page
Must include:
- all metadata
- selected articles
- add/remove article support
- reorder template article list

### 4) Template Show Page
Must include:
- template metadata
- ordered article preview
- bilingual article titles clearly shown
- ability to inspect the article sequence
- article count summary

### Template article selection UX
Locked preference:
- use a searchable list/panel of active master articles
- selected items should appear in an ordered list
- support reorder using simple move up/down or drag-and-drop only if the project already has a stable pattern for it
- do not over-engineer with custom complex builders if simpler ordered controls fit the project style

---

## ARTICLE PREVIEW RULES

When showing articles inside a template:
- show article code
- show English and Arabic title
- optionally show a short content preview/snippet
- do not render huge full legal text blocks on the index page
- on show page, concise preview is okay, but keep the page readable

Important:
Templates reference the **current master article** for preview in this phase.
Do not snapshot content yet.

---

## BILINGUAL UX RULES

Where both languages are shown:
- English title/content should be displayed in LTR context
- Arabic title/content should be displayed in RTL context
- labels must be explicit
- do not merge Arabic and English into one field block

---

## POLICY / PERMISSION RULES

Use the existing project authorization architecture.

Minimum expectation:
- only authorized internal users can create/edit/archive templates
- read-only internal users can view templates if your current policy model supports that

Do not invent a separate auth system.

Recommended permission base:
- align with contract governance permissions already used for Contract Articles
- keep the module consistent with future contract-related phases

---

## ACTIVITY LOGGING

Reuse the project’s real activity logging pattern.

At minimum log:
- template created
- template metadata updated
- template article set changed
- template status changed
- template reordered

Suggested event naming:
- `contracts.template.created`
- `contracts.template.metadata_updated`
- `contracts.template.items_synced`
- `contracts.template.status_changed`
- `contracts.template.reordered`

If multiple changes happen in one save, keep logging useful and not excessively noisy.

Do not invent a parallel audit subsystem.

---

## TRANSLATIONS

Add EN + AR translations for at minimum:

### Template library
- contract templates
- template code
- English name
- Arabic name
- template type
- status
- description
- internal notes
- article count

### Template types
- supply
- supply + installation
- subcontract
- service
- consultancy

### Statuses
- draft
- active
- archived

### Actions
- create template
- edit template
- save
- cancel
- back
- add article
- remove article
- move up
- move down

### UI / Sections
- selected articles
- available articles
- article order
- no articles selected
- no templates found

Use the project’s existing translation structure and namespaces.
Prefer a dedicated `contract_templates.php` namespace.

---

## NAVIGATION

Add the module to the internal navigation in the most appropriate place using existing menu patterns.

Recommended:
- a top-level internal nav item near Contract Articles / Contracts-related modules

Do not place it under settings.

---

## SEED DATA

Add development/demo seed data for this phase.

Requirements:
- create at least 5 realistic contract templates
- cover multiple template types:
  - supply
  - supply_install
  - subcontract
  - service
  - consultancy
- each template should include ordered references to existing seeded master contract articles from Phase 1 + 2
- use sensible article bundles for demo/testing

Important:
- do not create fake contract drafts
- seed templates only
- if the Contract Articles seed has not run yet, handle dependency safely or document the expected seeding order

---

## NON-GOALS (STRICT)

Do not add:
- contracts table
- RFQ handover
- contract draft generation
- template versioning
- article content snapshotting
- AI recommendation
- deviation workflow
- approval workflow
- final contract rendering
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
- do not bury composition logic in giant controllers
- do not invent unnecessary abstractions

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created
3. Exact schema for `contract_templates`
4. Exact schema for `contract_template_items`
5. Models created/updated
6. Service(s) added for template composition
7. How create/update/sync/reorder behavior works
8. What pages/routes were added
9. What policy/permission approach was used
10. What activity logging pattern was reused
11. What seeders were added
12. What translation keys were added
13. Confirm `npm run build` passes
14. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:

- template CRUD works
- template code is unique
- template type is one of the locked values
- template status is one of the locked values
- templates can reference ordered master articles
- add/remove/reorder of template items works
- template show page previews the ordered article list clearly
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