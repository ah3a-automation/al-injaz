# Contract Module — Phase 21
## Final Implementation Prompt
## Phase 21: DOCX / PDF Document Generation Layer

---

## TASK

Implement **only Phase 21** of the Contract Module.

This phase introduces the first controlled **document generation layer** for contracts, built on top of the already implemented:

- Contract Articles
- Contract Templates
- Contract Draft Articles
- Signature package issuance
- Merge fields / variable rendering engine (Phase 20)

This phase must allow internal users to:

- generate a **DOCX contract package**
- generate a **PDF contract package**
- generate documents from the **current rendered contract draft articles**
- generate documents from the **current issued signature package snapshot context**
- preserve generation history
- keep generated files traceable to contract + issue package version
- block generation when unresolved merge fields remain

This phase is a **document output layer only**.  
It is **not** an e-sign integration phase, and it is **not** an AI phase.

---

## STRICT SCOPE

### IN SCOPE
- contract document generation history
- DOCX generation
- PDF generation
- document metadata + traceability
- generation from rendered contract text
- contract show page visibility for generated files
- optional generate button in workspace or show page
- readiness checks
- activity logging
- translations

### OUT OF SCOPE
Do **not** implement:
- DocuSign / Adobe Sign / e-sign delivery
- OCR
- AI rewriting
- clause suggestion
- conditional template logic
- loops / formulas / nested template language
- editable WYSIWYG DOCX designer
- mail delivery
- supplier portal delivery
- document redlining
- watermark workflow
- multi-file bundling zip engine
- external storage integrations unless already standard in the app

Stay strictly inside Phase 21.

---

## ARCHITECTURAL RULES (LOCKED)

### Rule 1 — Generated documents are outputs, not the source of truth
The source of truth remains:
- contract header
- contract draft articles
- variable overrides
- signature package / issue package history

Generated DOCX/PDF files are **derived artifacts** only.

### Rule 2 — Generation must be reproducible and traceable
Every generated document must be linked to:
- the contract
- the issue package version if relevant
- the document type
- the generation timestamp
- the generating user

### Rule 3 — No document generation with unresolved placeholders
If unresolved merge fields remain, generation must fail with a clear message.

### Rule 4 — Rendering must use already-rendered contract text
Phase 21 must consume the Phase 20 rendered draft article outputs.
Do not build a second independent rendering engine.

### Rule 5 — No direct editing inside generated files
Generated DOCX/PDF files are outputs only, not editable source objects in this phase.

### Rule 6 — Signature package context matters
If the contract has a current issue package, generated signature-ready documents must be tied to that issue package version.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Document types
Support exactly these generation targets in Phase 21:

- `contract_docx`
- `contract_pdf`
- `signature_package_docx`
- `signature_package_pdf`

### Meaning
- `contract_*` = generated from current contract draft rendered content
- `signature_package_*` = generated for signature-ready package context and tied to the current issue package

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
9. `.cursor/docs/contracts/PHASE_09_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_20_IMPLEMENTATION_PROMPT.md`
11. current implementation of:
   - Contract
   - ContractDraftArticle
   - ContractVariableOverride
   - ContractDraftRenderingService
   - ContractSignaturePackageService
   - contract show page
   - contract workspace
   - activity logging patterns

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

---

## DATA MODEL / SCHEMA TO ADD

## 1) Create `contract_generated_documents`

This table stores generated contract documents and their traceability metadata.

### Required columns
- `id` UUID PK
- `contract_id` FK → contracts
- `contract_issue_package_id` nullable FK → contract_issue_packages
- `document_type` string(40)
- `file_name` string(255)
- `file_path` string(1000)
- `mime_type` string(100)
- `file_size_bytes` nullable bigint
- `generation_source` string(30)
- `snapshot_contract_status` string(50)
- `snapshot_issue_version` nullable unsignedInteger
- `generated_by_user_id` nullable FK → users
- `generated_at` timestampTz
- `created_at`
- `updated_at`

### Constraints
- index on `contract_id`
- index on `contract_issue_package_id`
- check constraint on `document_type`:
  - `contract_docx`
  - `contract_pdf`
  - `signature_package_docx`
  - `signature_package_pdf`
- check constraint on `generation_source`:
  - `draft`
  - `signature_package`

### Meaning
This table is append-only generation history.
Each row is one generated file.

---

## MODEL LAYER

## Update `Contract`
Add:
- `generatedDocuments()`

Optional helpers:
- `latestGeneratedDocumentByType(string $type)`
- `canGenerateDocuments(): bool`

## Create `ContractGeneratedDocument`
Add:
- fillable
- casts
- `contract()`
- `issuePackage()`
- `generatedBy()`

---

## SERVICE LAYER

Create these services/support classes.

## 1) `ContractDocumentReadinessService`
Responsibilities:
- determine whether contract documents can be generated
- determine whether signature package documents can be generated

### Required checks
For any generation:
- no unresolved merge fields
- contract has draft articles
- rendered draft content exists or can be refreshed safely

For signature package generation:
- contract must have a current issue package
- contract must be locked for signature or otherwise in signature-package-ready context
- issue package must exist and be current

### Required output
Return structured payload:
- `is_ready`
- `issues`

---

## 2) `ContractDocumentAssembler`
Responsibilities:
- gather header data
- gather rendered draft article content
- build a normalized document structure for output generation

### Required output structure
At minimum:
- contract metadata
- source metadata
- article list in order
- rendered EN content
- rendered AR content
- issue package metadata if relevant
- generation mode (`draft` or `signature_package`)

This service should not write files.  
It only assembles content.

---

## 3) `ContractDocxGenerator`
Responsibilities:
- accept assembled document data
- produce a DOCX file
- return metadata:
  - file path
  - file name
  - mime type
  - size if available

### Locked requirement
Use a stable and maintainable DOCX generation approach consistent with the project stack.
Do not build a custom XML engine from scratch if a supported library is available in the repo/environment.

---

## 4) `ContractPdfGenerator`
Responsibilities:
- accept assembled document data
- produce a PDF file
- return metadata:
  - file path
  - file name
  - mime type
  - size if available

### Locked requirement
Use a stable PDF generation approach consistent with the current Laravel app and deployment environment.
Do not over-engineer a print engine.

---

## 5) `ContractDocumentGenerationService`
Responsibilities:
- orchestrate readiness checks
- assemble document data
- call DOCX or PDF generator
- persist `contract_generated_documents`
- return generated document row

### Required methods
At minimum:
- `generateContractDocx(Contract $contract, User $actor)`
- `generateContractPdf(Contract $contract, User $actor)`
- `generateSignaturePackageDocx(Contract $contract, User $actor)`
- `generateSignaturePackagePdf(Contract $contract, User $actor)`

### Required behavior
- fail clearly if readiness check fails
- use rendered draft article content from Phase 20
- for signature package generation, capture current issue package linkage
- save one `contract_generated_documents` row per generation

---

## CONTENT RULES (LOCKED)

## Generated document content must include at minimum:
- contract number
- EN/AR title if available
- source summary (project / supplier / RFQ / template if useful)
- ordered draft articles
- rendered contract article text only, not unresolved raw placeholders
- issue package metadata when generation source is `signature_package`

## Important
Use rendered content from draft articles:
- `rendered_content_en`
- `rendered_content_ar`

Do not regenerate from scratch using a parallel engine unless you must refresh Phase 20 rendering through the existing rendering service first.

---

## FILE STORAGE RULES

Use the project’s standard storage mechanism.

### Required behavior
Store generated files in an organized contract-based path, for example:

- `contracts/{contract_id}/generated/...`

Naming should be deterministic and traceable, for example including:
- contract number
- type
- issue version when relevant
- timestamp

Do not introduce external cloud storage integrations in this phase unless already standard in the app.

---

## CONTROLLER LAYER

Add a focused controller such as:

- `ContractDocumentController`

### Required actions
At minimum:
- generate contract DOCX
- generate contract PDF
- generate signature package DOCX
- generate signature package PDF
- optionally download/show generated document metadata list

### Notes
You may keep listing of generated files inside `ContractController@show`, but generation actions should stay service-driven.

---

## ROUTES

Add routes under `contracts.*`, for example:

- `contracts.documents.generate-contract-docx`
- `contracts.documents.generate-contract-pdf`
- `contracts.documents.generate-signature-docx`
- `contracts.documents.generate-signature-pdf`

If you add a download route, keep it under `contracts.documents.*`.

---

## UI / PAGES TO BUILD

## Primary UI location (LOCKED)
The **contract show page** is the primary Phase 21 UI.

The draft workspace may optionally provide a quick action, but the show page must be the main generation and history surface.

---

## 1) Document generation card
Show:
- readiness summary
- issues list if generation is blocked
- buttons for:
  - Generate DOCX
  - Generate PDF
  - Generate Signature Package DOCX
  - Generate Signature Package PDF

Buttons must only be shown/enabled when relevant.

## 2) Generated documents history
Show:
- type
- file name
- generation source
- issue version if applicable
- generated by
- generated at
- optional download/view action

## 3) Signature package awareness
If current issue package exists, show that signature generation will bind to it.

---

## SIGNATURE PACKAGE INTEGRATION (REQUIRED)

Phase 21 must respect Phase 9 and Phase 20.

### Required rules
- do not generate signature-package documents without a current issue package
- do not generate any document if unresolved merge fields remain
- signature-package generated documents must be linked to `current_issue_package_id`

---

## POLICY / PERMISSION RULES

Use the existing contract authorization architecture.

Recommended:
- generation actions use existing contract view/update/manage policy pattern already used by the contract module
- downloading/viewing generated docs uses contract view permission

Do not create a new auth framework.

---

## ACTIVITY LOGGING

Reuse `ActivityLogger`.

At minimum log:
- `contracts.contract.document_generated`
- include metadata such as:
  - generated_document_id
  - document_type
  - generation_source
  - issue_version if applicable

Optional:
- a more specific event for signature package document generation if you want, but not required.

---

## TRANSLATIONS

Add EN + AR translation keys for at minimum:

- documents
- generation
- generate docx
- generate pdf
- signature package docx
- signature package pdf
- generated files
- generation source
- issue version
- generated by
- generated at
- readiness
- not ready
- no generated documents
- download
- contract document
- signature package document

Extend `contracts.php`.

---

## NAVIGATION

No new top-level nav item is required.

---

## SEEDING

No new seeders are required.

---

## NON-GOALS (STRICT)

Do not add:
- e-sign delivery
- supplier notification
- AI rewriting
- OCR
- conditional templating language
- document approval workflow
- watermark lifecycle
- redline / compare inside DOCX
- machine translation
- zip package bundling
- external signing vendor SDK integration

Prepare for future phases, but do not implement them now.

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema for `contract_generated_documents`
4. Models created/updated
5. Services/support classes added
6. How readiness checks work
7. How document assembly works
8. How DOCX generation works
9. How PDF generation works
10. How generated file storage/pathing works
11. How signature-package linkage works
12. What routes/pages were added or enhanced
13. What policy/permission approach was used
14. What activity logging events were wired
15. What translation keys were added
16. Confirm `npm run build` passes
17. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

This phase is complete only if:
- DOCX generation works
- PDF generation works
- generated files are stored and traceable
- generation history is visible
- unresolved merge fields block generation
- signature package generation is linked to the current issue package
- build passes
