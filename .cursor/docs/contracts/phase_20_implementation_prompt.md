# Contract Module — Phase 20
## Final Implementation Prompt
## Phase 20: Dynamic Contract Variables / Merge Fields Engine

---

## TASK

Implement **only Phase 20** of the Contract Module.

This phase introduces the first structured **dynamic contract variables / merge fields engine** for:

- Contract Articles
- Contract Templates
- Contract Draft Articles
- Contract preview
- Signature-package readiness validation

This phase must allow internal users to:

- write contract article content with placeholders
- define and manage a controlled set of allowed variables
- resolve placeholders against real contract / project / supplier / RFQ / awarded quote / system data
- preview rendered contract draft article content
- detect unresolved placeholders
- store manual override values at the **contract level**
- block signature-package issuance when unresolved placeholders remain

This phase is the **core rendering engine only**. It is **not** a document generation or AI phase.

---

## STRICT SCOPE

### IN SCOPE
- variable registry
- placeholder parser
- variable resolver
- renderer
- limited formatter support
- unresolved placeholder detection
- contract-level manual overrides
- draft article render preview
- signature-package blocking if unresolved placeholders remain
- lightweight UI support for preview and missing-variable summary
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- full DOCX generation
- full PDF generation
- e-sign integration
- advanced conditional logic (`if`, `else`, loops, formulas, nested functions)
- AI clause rewriting
- NLP extraction
- machine translation
- rich token editor
- drag/drop variable builder

Stay strictly inside Phase 20.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Master articles remain the reusable source
`ContractArticle` remains the master source for reusable article text.

### Rule 2 — Contract draft articles remain the editable working rows
`ContractDraftArticle` remains the draft-local working row for the contract.

### Rule 3 — Variable rendering must be deterministic
No executable template language.
No arbitrary expressions.
No loops.
No nested logic.

### Rule 4 — Registry-driven variables only
Only variables declared in the central variable registry are valid.

### Rule 5 — Rendering must be auditable
The system must be able to:
- list variables used
- resolve them
- report unresolved ones
- preview final rendered content

### Rule 6 — Manual overrides belong to the contract
Manual values are stored at the **contract level**, not on master articles.

### Rule 7 — Signature issuance must respect variable completeness
If unresolved placeholders remain in contract draft articles used for contract text, the contract must **not** issue a signature package.

### Rule 8 — Content parsing is the rendering source of truth
Rendering must parse actual article text content.
Metadata fields like `variable_keys` help UI/search/inspection, but they do not replace live parsing.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Placeholder syntax
Use exactly this syntax:

- `{{ supplier.legal_name_ar }}`
- `{{ contract.number }}`
- `{{ contract.value | currency }}`
- `{{ contract.start_date | date }}`

### Parsing rules
- placeholder body is a dot-notation key
- optional formatter appears after `|`
- spaces inside braces are allowed
- no nested placeholders
- no function calls
- no boolean logic
- no arithmetic
- no loops

---

## LOCKED FORMATTERS

Only support these formatters in Phase 20:

- `date`
- `datetime`
- `currency`
- `number`
- `hijri_date`

Do not add any others in this phase.

---

## LOCKED VARIABLE SOURCES

Variables may resolve only from these sources:

- `supplier.*`
- `contract.*`
- `project.*`
- `rfq.*`
- `quote.*`
- `today`
- `today.hijri`
- `manual.*`

### Notes
- `manual.*` is for user-supplied contract-level overrides
- `quote.*` must resolve from the **awarded/winning quote source already linked to the contract/RFQ award path**
- if that quote source does not exist, `quote.*` variables remain unresolved
- `manual.*` values may only override `manual.*` keys, not system-owned keys

---

## REQUIRED UNRESOLVED RULE (LOCKED)

For Phase 20, use this exact rule:

> **Any unresolved placeholder found in the draft articles used for contract text blocks signature-package issuance.**

Do not introduce a separate required/optional placeholder engine in this phase.

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
9. prior contract module implementation prompts and current implementations for:
   - Contract Articles
   - Contract Templates
   - Contract Draft Articles
   - draft workspace
   - signature package readiness
   - contract show page

Also inspect the current implementation of:
- `Contract`
- `ContractArticle`
- `ContractTemplate`
- `ContractDraftArticle`
- contract draft workspace
- signature package issuance flow
- current contract/article/template translations
- existing activity logging patterns

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

---

## DATA MODEL / SCHEMA TO ADD

## 1) Create `contract_variable_overrides`
This table stores **contract-level** manual values for placeholders.

### Required columns
- `id` UUID PK
- `contract_id` FK → contracts
- `variable_key` string(255)
- `value_text` nullable text
- `created_by_user_id` nullable FK → users
- `updated_by_user_id` nullable FK → users
- `created_at`
- `updated_at`

### Constraints
- unique `(contract_id, variable_key)`
- index on `contract_id`

### Meaning
This stores manual values such as:
- `manual.final_offer_reference_ar`
- `manual.final_offer_reference_en`
- `manual.special_scope_note_ar`
- `manual.special_scope_note_en`

---

## 2) Update `contract_articles`
Add a metadata field for declared variables used by the master article.

### Required addition
- `variable_keys` nullable json

### Meaning
This stores the list of variables intentionally used by the article, for example:

```json
["project.name_ar", "supplier.legal_name_ar", "contract.value"]
```

### Locked behavior
- rendering still parses live content
- `variable_keys` is metadata for UI/help/search/inspection
- it may be auto-refreshed from parsed content on save

---

## 3) Update `contract_draft_articles`
Add rendering-support metadata fields.

### Required additions
- `source_template_content_en` nullable text
- `source_template_content_ar` nullable text
- `rendered_content_en` nullable text
- `rendered_content_ar` nullable text
- `used_variable_keys` nullable json
- `unresolved_variable_keys` nullable json
- `last_rendered_at` nullable timestampTz

### Meaning
- `source_template_content_*` = original placeholder-based source snapshot imported from article/template
- `rendered_content_*` = last rendered preview output
- `used_variable_keys` = placeholders detected in the current draft text
- `unresolved_variable_keys` = unresolved placeholders at last render
- `last_rendered_at` = timestamp of latest render

### Locked behavior
- do **not** replace or remove existing `content_en` / `content_ar`
- keep current draft editing behavior intact
- `content_*` remains the user working text
- `source_template_content_*` is the imported source snapshot
- rendering must parse the **current draft article text content** (`content_*`) as the source of truth for preview, while preserving `source_template_content_*` for traceability

---

## MODEL LAYER

## Update `Contract`
Add:
- `variableOverrides()`

Optional helpers if useful:
- `hasUnresolvedMergeFields(): bool`

Do not move signature-package logic out of its current area unless needed.
Integrate unresolved placeholder checks cleanly into existing readiness/service flow.

---

## Update `ContractArticle`
Add fillable/casts for:
- `variable_keys`

---

## Update `ContractDraftArticle`
Add fillable/casts for:
- `source_template_content_en`
- `source_template_content_ar`
- `rendered_content_en`
- `rendered_content_ar`
- `used_variable_keys`
- `unresolved_variable_keys`
- `last_rendered_at`

---

## Create `ContractVariableOverride`
Add:
- fillable
- casts
- `contract()`
- `createdBy()`
- `updatedBy()`

---

## SERVICE / SUPPORT LAYER

Create these services/support classes.

## 1) `ContractVariableRegistry`
Central registry of allowed variables.

Each variable definition should include at minimum:
- `key`
- `label_en`
- `label_ar`
- `group`
- `source`
- `data_type`
- `nullable`
- `allowed_formatters`
- optional `example_value`

### Locked groups
- supplier
- contract
- project
- rfq
- quote
- system
- manual

### Minimum variables to include

#### Supplier
- `supplier.legal_name_ar`
- `supplier.legal_name_en`
- `supplier.commercial_registration_no`
- `supplier.vat_number`

#### Contract
- `contract.number`
- `contract.value`
- `contract.start_date`
- `contract.end_date`
- `contract.duration_days`
- `contract.title_ar`
- `contract.title_en`

#### Project
- `project.name_ar`
- `project.name_en`
- `project.code`

#### RFQ
- `rfq.number`
- `rfq.title`

#### Quote
- `quote.total_value`
- `quote.submitted_at`

#### System
- `today`
- `today.hijri`

#### Manual
- `manual.final_offer_reference_ar`
- `manual.final_offer_reference_en`
- `manual.special_scope_note_ar`
- `manual.special_scope_note_en`

You may include more, but keep them structured and realistic.

---

## 2) `ContractPlaceholderParser`
Responsibilities:
- extract placeholders from content
- parse variable key and optional formatter
- validate syntax shape

### Output shape
For each placeholder return structured data such as:
- raw token
- key
- formatter
- valid syntax true/false
- positions optional

### Locked limitations
No:
- nested placeholders
- functions
- conditionals
- formulas
- loops

---

## 3) `ContractVariableResolver`
Responsibilities:
- accept a `Contract`
- resolve allowed registry variables to raw values
- merge:
  - system values
  - contract/project/supplier/rfq/quote values
  - contract-level manual overrides

### Resolution order
1. system values
2. supplier / contract / project / rfq / quote values
3. manual override values for `manual.*`

### Important
Manual overrides must only apply to `manual.*` variables.

---

## 4) `ContractArticleRenderer`
Responsibilities:
- take content
- parse placeholders
- resolve values
- apply formatter
- render final string
- return unresolved variables list
- return used variables list

### Required output
Return a structured payload like:
- `rendered_content`
- `used_variable_keys`
- `unresolved_variable_keys`

### Missing values
Do not silently hide problems.
For preview, unresolved placeholders may remain visibly marked or preserved as raw tokens.
But unresolved keys must always be returned explicitly.

---

## 5) `ContractDraftRenderingService`
Responsibilities:
- render one draft article
- render all draft articles of a contract
- store rendering metadata back onto `contract_draft_articles`

### Required behavior
For each draft article:
- parse `content_en` and `content_ar` as the current editable source text
- render EN and AR separately
- save:
  - `rendered_content_en`
  - `rendered_content_ar`
  - `used_variable_keys`
  - `unresolved_variable_keys`
  - `last_rendered_at`

### Important
If useful, you may keep separate EN/AR used/unresolved arrays merged into one JSON structure, but keep the data auditable and clear.

---

## CONTROLLER LAYER

Add a focused controller such as:
- `ContractVariableController`
or
- `ContractDraftRenderingController`

### Required actions

#### 1) List available variables
Return grouped registry payload for UI use.

#### 2) Save/update manual overrides for a contract
Create/update rows in `contract_variable_overrides`.

#### 3) Preview render contract draft articles
Render all draft articles for a contract and return a summary including:
- rendered content
- used variables
- unresolved variables

You may integrate preview into the existing contract workspace controller only if the logic remains service-driven and clean.

---

## ROUTES

Add routes under `contracts.*`, for example:

- `contracts.variables.index`
- `contracts.variables.save-overrides`
- `contracts.variables.preview-render`

Naming may vary slightly, but keep them under the contracts namespace and consistent with the existing module structure.

---

## UI / PAGES TO BUILD

## Primary UI location (LOCKED)
The **draft workspace** is the primary Phase 20 UI.

The contract show page may optionally display a compact unresolved-variable warning summary, but the main editing/render preview must live in the draft workspace.

---

## 1) Variables panel
Show:
- available grouped variables
- manual override fields
- unresolved-variable summary

## 2) Preview render section
For selected draft article or full contract:
- show rendered EN content
- show rendered AR content
- show unresolved variables list
- show used variables list if useful

## 3) Missing variables warning
Prominently show unresolved placeholders before signature readiness.

## 4) Optional lightweight insert helper
A simple insert-variable list/button is acceptable if lightweight.
Do **not** build a rich token editor in this phase.

---

## SIGNATURE PACKAGE INTEGRATION (REQUIRED)

Phase 20 must integrate with Phase 9 signature issuance readiness.

### Required rule
A contract must **not** issue a signature package if unresolved placeholders remain in the rendered draft articles used for contract text.

### Required implementation
Update the signature readiness check so it includes unresolved variable detection across draft articles.

### Expected readiness message
Readiness issues should include a clear message such as:
- `Contract has unresolved merge fields.`

Optionally include counts or article references.

Do not implement external signing here.

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

- viewing preview uses existing contract view permission
- saving manual overrides and rendering actions use existing contract update/manage permission

No new auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.variables_overrides_updated`
- `contracts.contract.render_preview_generated`

If signature issuance is blocked due to unresolved variables, no extra logging event is required in this phase beyond readiness messaging.

---

## TRANSLATIONS

Add EN + AR translation keys for at minimum:
- variables
- merge fields
- available variables
- manual overrides
- preview render
- unresolved variables
- used variables
- missing values
- render preview
- save overrides
- variable groups

Extend `contracts.php`, and `contract_articles.php` if needed.

---

## NAVIGATION

No new top-level nav item is required.

---

## SEEDING

No new seeders are required.

---

## NON-GOALS (STRICT)

Do not add:
- full DOCX/PDF generation
- e-sign integration
- conditional template language
- AI rewriting
- NLP extraction
- machine translation
- formulas
- loops
- nested functions

Prepare for future phases, but do not implement them now.

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema for `contract_variable_overrides`
4. Exact schema changes to `contract_articles`
5. Exact schema changes to `contract_draft_articles`
6. Models created/updated
7. Services/support classes added
8. How placeholder parsing works
9. How variable resolution works
10. How rendering and unresolved detection work
11. How manual overrides work
12. How preview UI works
13. How signature-package readiness was updated
14. What routes/pages were added or enhanced
15. What policy/permission approach was used
16. What activity logging events were wired
17. What translation keys were added
18. Confirm `npm run build` passes
19. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:
- articles can contain placeholders using the locked syntax
- allowed variables come from a registry
- preview rendering works
- unresolved placeholders are detected clearly
- manual overrides work at the contract level
- signature-package issuance is blocked when unresolved placeholders exist
- build passes

