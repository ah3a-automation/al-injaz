# Contract Module — Phase 18
## Final Implementation Prompt
## Phase 18: Bonds / Insurance / Guarantees Register

---

## TASK

Implement **only Phase 18** of the Contract Module.

This phase introduces a baseline **securities register** for contracts.

This phase must allow internal users to:
- register bonds / guarantees / insurance instruments
- track provider, reference, value, issue/expiry dates
- track simple lifecycle status
- surface a compact securities register on the contract show page

This phase is a register baseline, not an integration or renewal automation engine.

---

## STRICT SCOPE

### IN SCOPE
- securities register
- instrument type
- value/reference/provider
- issue/expiry dates
- lifecycle status
- compact UI
- activity logging
- translations

### OUT OF SCOPE
- bank integrations
- insurer integrations
- OCR/parsing
- renewal automation
- AI assistance

Stay strictly inside Phase 18.

---

## REQUIRED DOMAIN DECISIONS (LOCKED)

## Instrument types
- `performance_bond`
- `advance_payment_guarantee`
- `retention_bond`
- `insurance`

## Statuses
- `active`
- `expiring`
- `expired`
- `released`

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
9. `.cursor/docs/contracts/PHASE_16_IMPLEMENTATION_PROMPT.md`
10. `.cursor/docs/contracts/PHASE_17_IMPLEMENTATION_PROMPT.md`
11. `.cursor/docs/contracts/PHASE_18_IMPLEMENTATION_PROMPT.md`

### Important instruction
Before implementation, report findings in **8–12 bullets maximum**, then proceed directly to implementation.

---

## DATA MODEL / SCHEMA TO ADD

## Create `contract_securities`
Required columns:
- `id` UUID PK
- `contract_id`
- `instrument_type`
- `status`
- `provider_name` string(255)
- `reference_no` string(255)
- `amount` decimal(18,2) nullable
- `currency` string(10) nullable
- `issued_at` nullable timestampTz
- `expires_at` nullable timestampTz
- `released_at` nullable timestampTz
- `notes` text nullable
- `created_by_user_id`
- `updated_by_user_id`
- timestamps

Constraints:
- check type in locked values
- check status in locked values
- index on contract_id

---

## MODEL LAYER

Create:
- `ContractSecurity`

Update `Contract`:
- `securities()`

Add helpers if useful.

---

## SERVICE LAYER

Create:
- `ContractSecurityService`

Must handle:
- create security
- update security
- update status
- optional helper to suggest `expiring` when near expiry is **not** required in this phase

Keep manual status updates simple.

---

## CONTROLLER LAYER

Add:
- `ContractSecurityController`

Actions:
- store
- update
- updateStatus

---

## ROUTES

Under `contracts.*`:
- `contracts.securities.store`
- `contracts.securities.update`
- `contracts.securities.update-status`

---

## UI / PAGES TO BUILD

Enhance contract show page with:

### 1) Securities summary
- total count
- active / expiring / expired / released counts

### 2) Create form
- type
- provider
- reference
- amount
- currency
- dates
- notes

### 3) Register table
- type
- provider
- reference
- amount
- status
- issued/expires/released dates
- notes

### 4) Status actions
Simple status transitions.

---

## POLICY / PERMISSION RULES

Use existing contract authorization architecture.

---

## ACTIVITY LOGGING

At minimum:
- `contracts.contract.security_created`
- `contracts.contract.security_updated`
- `contracts.contract.security_status_changed`

---

## TRANSLATIONS

Add EN + AR keys for:
- securities
- instrument types
- statuses
- provider
- reference number
- issued at
- expires at
- released at
- create/update actions
- summary labels

---

## NAVIGATION

No new top-level nav item.

---

## SEEDING

No new seeders required.

---

## OUTPUT REPORT REQUIRED

After implementation, report exactly:

1. Files changed
2. Migrations created/updated
3. Exact schema for `contract_securities`
4. Models created/updated
5. Service(s) added
6. How security create/update/status workflow works
7. What routes/pages were added or enhanced
8. What policy/permission approach was used
9. What activity logging events were wired
10. What translation keys were added
11. Confirm `npm run build` passes
12. Confirm any PHP syntax checks / test commands run

---

## SUCCESS CRITERIA

Complete only if:
- securities register works
- locked types/statuses are respected
- show page surfaces the register
- build passes
