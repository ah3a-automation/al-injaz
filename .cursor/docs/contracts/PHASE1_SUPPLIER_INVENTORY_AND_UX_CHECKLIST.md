# Phase 1: Supplier Registration & Supplier Management — Inventory & UX Checklist

Scope: **Supplier registration** (public) and **supplier management** (internal + supplier portal self-service) only.  
Excluded: RFQs, contracts, evaluations, procurement packages, tasks, supplier intelligence, watchlist, and all later modules.

---

## 1. Routes (Phase 1 only)

### Public supplier registration (no auth)

| Route name | Method | Path |
|------------|--------|------|
| `supplier.register.form` | GET | `/register/supplier` |
| `supplier.register` | POST | `/register/supplier` |
| `supplier.register.check-cr` | GET | `/register/supplier/check-cr` |
| `supplier.success` | GET | `/register/supplier/success` |
| `supplier.complete.form` | GET | `/supplier/complete/{token}` |
| `supplier.complete` | POST | `/supplier/complete/{token}` |
| `supplier.status` | GET | `/supplier/status` |

### Supplier portal (supplier role; approval not required for pending)

| Route name | Method | Path |
|------------|--------|------|
| `supplier.pending` | GET | `/supplier/pending` |

### Supplier portal (supplier role; approved suppliers only)

| Route name | Method | Path |
|------------|--------|------|
| `supplier.dashboard` | GET | `/supplier/dashboard` |
| `supplier.profile` | GET | `/supplier/profile` |
| `supplier.profile.edit` | GET | `/supplier/profile/edit` |
| `supplier.profile.update` | PATCH | `/supplier/profile` |
| `supplier.profile.reverse-geocode` | GET | `/supplier/profile/reverse-geocode` |
| `supplier.profile.geocode-address` | GET | `/supplier/profile/geocode-address` |
| `supplier.company.logo` | GET | `/supplier/company/logo` |
| `supplier.contact.profile` | GET | `/supplier/contact` |
| `supplier.contact.profile.update` | PATCH | `/supplier/contact` |
| `supplier.contact.media` | GET | `/supplier/contact/media/{contact}/{type}` |
| `supplier.contacts.create` | GET | `/supplier/contacts/create` |
| `supplier.contacts.store` | POST | `/supplier/contacts` |
| `supplier.contacts.edit` | GET | `/supplier/contacts/{contact}/edit` |
| `supplier.contacts.update` | PATCH | `/supplier/contacts/{contact}` |
| `supplier.contacts.set-primary` | POST | `/supplier/contacts/{contact}/set-primary` |
| `supplier.documents.show` | GET | `/supplier/documents/{document}` |
| `supplier.documents.download` | GET | `/supplier/documents/{document}/download` |
| `supplier.notifications.index` | GET | `/supplier/notifications` |
| `supplier.notifications.read` | PATCH | `/supplier/notifications/{notification}/read` |
| `supplier.notifications.read-all` | POST | `/supplier/notifications/read-all` |

### Internal supplier management (ERP; auth + not supplier)

| Route name | Method | Path |
|------------|--------|------|
| `suppliers.index` | GET | `/suppliers` |
| `suppliers.create` | GET | `/suppliers/create` |
| `suppliers.store` | POST | `/suppliers` |
| `suppliers.show` | GET | `/suppliers/{supplier}` |
| `suppliers.edit` | GET | `/suppliers/{supplier}/edit` |
| `suppliers.update` | PUT/PATCH | `/suppliers/{supplier}` |
| `suppliers.destroy` | DELETE | `/suppliers/{supplier}` |
| `suppliers.bulk-destroy` | DELETE | `/suppliers/bulk-destroy` |
| `suppliers.check-cr` | GET | `/suppliers/check-cr` |
| `suppliers.approve` | POST | `/suppliers/{supplier}/approve` |
| `suppliers.approval` | POST | `/suppliers/{supplier}/approval` |
| `suppliers.reset-login` | POST | `/suppliers/{supplier}/reset-login` |
| `suppliers.contacts.store` | POST | `/suppliers/{supplier}/contacts` |
| `suppliers.contacts.update` | PUT | `/suppliers/{supplier}/contacts/{contact}` |
| `suppliers.contacts.destroy` | DELETE | `/suppliers/{supplier}/contacts/{contact}` |
| `suppliers.documents.store` | POST | `/suppliers/{supplier}/documents` |
| `suppliers.documents.destroy` | DELETE | `/suppliers/{supplier}/documents/{document}` |
| `suppliers.capabilities.update` | POST | `/suppliers/{supplier}/capabilities` |
| `admin.suppliers.map` | GET | `/admin/suppliers/map` |

### Supporting (settings — reference data for registration & management)

| Route name | Method | Path |
|------------|--------|------|
| `settings.supplier-categories.index` | GET | `/settings/supplier-categories` |
| `settings.supplier-categories.store` | POST | `/settings/supplier-categories` |
| `settings.supplier-categories.update` | PUT | `/settings/supplier-categories/{supplier_category}` |
| `settings.supplier-categories.destroy` | DELETE | `/settings/supplier-categories/{supplier_category}` |
| `settings.supplier-capabilities.index` | GET | `/settings/supplier-capabilities` |
| `settings.supplier-capabilities.store` | POST | `/settings/supplier-capabilities` |
| `settings.supplier-capabilities.update` | PUT | `/settings/supplier-capabilities/{supplier_capability}` |
| `settings.supplier-capabilities.destroy` | DELETE | `/settings/supplier-capabilities/{supplier_capability}` |
| `settings.certifications.index` | GET | `/settings/certifications` |
| `settings.certifications.store` | POST | `/settings/certifications` |
| `settings.certifications.update` | PUT | `/settings/certifications/{certification}` |
| `settings.certifications.destroy` | DELETE | `/settings/certifications/{certification}` |

---

## 2. Controllers (Phase 1)

| Controller | Flow | Purpose |
|-------------|------|---------|
| `App\Http\Controllers\PublicSupplierController` | Public registration | Registration form, submit, check CR, success, complete profile, status |
| `App\Http\Controllers\SupplierPortal\DashboardController` | Portal | Pending page, dashboard |
| `App\Http\Controllers\SupplierPortal\ProfileController` | Portal | Profile edit, edit full, update, geocode, logo |
| `App\Http\Controllers\SupplierPortal\ContactProfileController` | Portal | Contact profile edit, update, media |
| `App\Http\Controllers\SupplierPortal\ContactController` | Portal | Contacts create, store, edit, update, set primary |
| `App\Http\Controllers\SupplierPortal\DocumentController` | Portal | Document show, download |
| `App\Http\Controllers\SupplierPortal\NotificationController` | Portal | Notifications list, mark read |
| `App\Http\Controllers\SupplierController` | Internal | Index, create, store, show, edit, update, destroy, check CR, approve |
| `App\Http\Controllers\SupplierApprovalController` | Internal | Approval workflow, reset login |
| `App\Http\Controllers\SupplierBulkController` | Internal | Bulk destroy |
| `App\Http\Controllers\SupplierContactController` | Internal | Store, update, destroy (no dedicated page; used from Show/Edit) |
| `App\Http\Controllers\SupplierDocumentController` | Internal | Store, destroy (no dedicated page; used from Show/Edit) |
| `App\Http\Controllers\SupplierProfileController` | Internal | Update capabilities (from Show/Edit) |
| `App\Http\Controllers\Admin\SupplierCoverageController` | Internal | Coverage map page |
| `App\Http\Controllers\SupplierCategoryController` | Settings | Categories CRUD |
| `App\Http\Controllers\SupplierCapabilityController` | Settings | Capabilities CRUD |
| `App\Http\Controllers\CertificationController` | Settings | Certifications CRUD |

**Excluded (later phases):**  
`SupplierIntelligenceController`, `SupplierWatchlistController`, `SupplierPortal\RfqController`, `SupplierPortal\QuotationController`, `SupplierPortal\QuoteController`, `SupplierPortal\ClarificationController`.

---

## 3. Frontend pages (Phase 1)

### Public supplier registration

| Page component | Route(s) | Purpose |
|----------------|----------|---------|
| `Public/SupplierRegister` | `supplier.register.form` | Multi-step registration form |
| `Public/SupplierSuccess` | `supplier.success` | Post-registration success + complete-profile CTA |
| `Public/SupplierComplete` | `supplier.complete.form` | Complete profile (token-based) |
| `Public/SupplierStatus` | `supplier.status` | Check application status (e.g. by email) |

### Supplier portal

| Page component | Route(s) | Purpose |
|----------------|----------|---------|
| `SupplierPortal/Pending` | `supplier.pending` | Pending approval message |
| `SupplierPortal/Dashboard` | `supplier.dashboard` | Portal home (includes RFQ metrics — exclude metric content from Phase 1 review) |
| `SupplierPortal/Profile/Edit` | `supplier.profile` | Profile summary + cards (includes RFQ/analytics cards — exclude those from Phase 1) |
| `SupplierPortal/Profile/EditFull` | `supplier.profile.edit` | Full profile edit form |
| `SupplierPortal/ContactProfile/Edit` | `supplier.contact.profile` | Primary contact profile edit |
| `SupplierPortal/Contacts/Create` | `supplier.contacts.create` | Add contact |
| `SupplierPortal/Contacts/Edit` | `supplier.contacts.edit` | Edit contact |
| `SupplierPortal/Notifications/Index` | `supplier.notifications.index` | Notifications list |

### Internal supplier management

| Page component | Route(s) | Purpose |
|----------------|----------|---------|
| `Suppliers/Index` | `suppliers.index` | List suppliers (filters, bulk actions) |
| `Suppliers/Create` | `suppliers.create` | Create supplier |
| `Suppliers/Show` | `suppliers.show` | Supplier detail + approval + contacts/documents |
| `Suppliers/Edit` | `suppliers.edit` | Edit supplier + capabilities |
| `Admin/Suppliers/CoverageMap` | `admin.suppliers.map` | Suppliers on map |

### Settings (reference data)

| Page component | Route(s) | Purpose |
|----------------|----------|---------|
| `Suppliers/Categories/Index` | `settings.supplier-categories.*` | Manage supplier categories |
| `Suppliers/Capabilities/Index` | `settings.supplier-capabilities.*` | Manage supplier capabilities |
| `Suppliers/Certifications/Index` | `settings.certifications.*` | Manage certifications |

**Excluded (later phases):**  
`SupplierPortal/Rfqs/Index`, `SupplierPortal/Rfqs/Show`, `SupplierPortal/Quotations/Index`, `SupplierIntelligence/Index`, `SupplierIntelligence/Show`.

---

## 4. Reusable components (Phase 1)

### Registration & public

- `Components/Suppliers/WizardProgress` — step indicator for registration.
- `Components/SupplierPortal/SupplierImageUploadField` — avatar/logo upload with crop.
- `Layouts/GuestSupplierLayout` — public registration shell (logo, footer, locale).

### Portal profile & contacts

- `Components/Supplier/Header/SupplierHeaderCard` — header + quick actions.
- `Components/Supplier/Company/SupplierCompanyInfoCard` — company info display.
- `Components/Supplier/Company/EditCompanyInfoModal` — edit company (portal).
- `Components/Supplier/Legal/SupplierLegalCard` — legal/CR info.
- `Components/Supplier/Finance/SupplierBankCard` — bank details.
- `Components/Supplier/Finance/SupplierPaymentCard` — payment terms.
- `Components/Supplier/Documents/SupplierDocumentsCard` — documents list (portal).
- `Components/Supplier/Contacts/SupplierContactsCard` — contacts list (portal).
- `Components/Supplier/Contacts/ContactCard` — single contact card (portal).
- `Components/Supplier/Sidebar/PrimaryContactCard` — primary contact sidebar.
- `Components/Supplier/Sidebar/SupplierMetricsCard` — metrics (e.g. completeness).
- `Components/Supplier/Sidebar/SupplierActivityCard` — activity (if used on profile).
- `Components/Supplier/Location/CompanyMap` — read-only map.
- `Components/Maps/MapPicker` — map location picker.
- `Components/Supplier/ProfileSkeleton` — loading state.
- `Layouts/SupplierPortalLayout` — portal shell (nav, notifications).

### Internal management

- `Components/Suppliers/ContactsSection` — contacts table + actions on Show/Edit.
- `Components/Suppliers/DocumentsSection` — documents table + actions on Show/Edit.
- `Components/ActivityTimeline` — activity on Show.
- `Components/DataTable` — used on Suppliers/Index (and elsewhere).
- `Components/Modal` — approval modals on Show.

### Shared UI (shadcn etc.)

- `Components/ui/button`, `Input`, `Label`, `Card`, `Checkbox`, etc. — used across all above.

**Exclude from Phase 1 component review:**  
`SupplierRFQAnalyticsCard`, `SupplierPerformanceScorecard`, `SupplierCapabilityMatrixCard` (if only used for RFQ/analytics), `SupplierIntelligenceCard`, `SupplierRankingCard`, `SupplierCoverageCard`, dashboard RFQ-specific blocks, and any RFQ/Quotation/Quote components.

---

## 5. Separation summary

| Flow | Routes | Controllers | Pages |
|------|--------|-------------|--------|
| **Public supplier registration** | 7 (register, check-cr, success, complete, status) | PublicSupplierController | 4 (Register, Success, Complete, Status) |
| **Supplier portal** | Pending + dashboard + profile + contact + contacts + documents + notifications | Dashboard, Profile, ContactProfile, Contact, Document, Notification | 8 pages (Pending, Dashboard, Profile Edit, EditFull, ContactProfile Edit, Contacts Create/Edit, Notifications Index) |
| **Internal supplier management** | suppliers.* + admin.suppliers.map | Supplier, Approval, Bulk, Contact, Document, Profile, Coverage | 5 pages (Index, Create, Show, Edit, CoverageMap) |
| **Supporting (settings)** | settings.supplier-categories, supplier-capabilities, certifications | Category, Capability, Certification | 3 pages (Categories, Capabilities, Certifications Index) |

---

## 6. Page inventory table

| Route | Controller | Page component | Purpose | Main actions |
|-------|------------|----------------|---------|--------------|
| `supplier.register.form` | PublicSupplierController | Public/SupplierRegister | Supplier registration | Submit registration, check CR |
| `supplier.success` | PublicSupplierController | Public/SupplierSuccess | Post-registration success | Link to complete profile |
| `supplier.complete.form` | PublicSupplierController | Public/SupplierComplete | Complete profile (token) | Submit completion |
| `supplier.status` | PublicSupplierController | Public/SupplierStatus | Check status | Look up by email |
| `supplier.pending` | SupplierPortal\DashboardController | SupplierPortal/Pending | Pending approval | — |
| `supplier.dashboard` | SupplierPortal\DashboardController | SupplierPortal/Dashboard | Portal home | Navigate to profile, RFQs, notifications |
| `supplier.profile` | SupplierPortal\ProfileController | SupplierPortal/Profile/Edit | View profile | Edit profile, edit contact, view docs |
| `supplier.profile.edit` | SupplierPortal\ProfileController | SupplierPortal/Profile/EditFull | Edit full profile | Save profile, geocode, map picker |
| `supplier.contact.profile` | SupplierPortal\ContactProfileController | SupplierPortal/ContactProfile/Edit | Edit contact profile | Save contact, media |
| `supplier.contacts.create` | SupplierPortal\ContactController | SupplierPortal/Contacts/Create | Add contact | Submit new contact |
| `supplier.contacts.edit` | SupplierPortal\ContactController | SupplierPortal/Contacts/Edit | Edit contact | Save, set primary |
| `supplier.notifications.index` | SupplierPortal\NotificationController | SupplierPortal/Notifications/Index | Notifications | Mark read, read all |
| `suppliers.index` | SupplierController | Suppliers/Index | List suppliers | Search, filter, bulk delete, create, view, edit, delete |
| `suppliers.create` | SupplierController | Suppliers/Create | Create supplier | Submit new supplier |
| `suppliers.show` | SupplierController | Suppliers/Show | Supplier detail | Approve/reject/suspend/blacklist, reset login, edit, delete, add contact/doc |
| `suppliers.edit` | SupplierController | Suppliers/Edit | Edit supplier | Save, update capabilities |
| `admin.suppliers.map` | Admin\SupplierCoverageController | Admin/Suppliers/CoverageMap | Coverage map | Filter, click supplier → show |
| `settings.supplier-categories.index` | SupplierCategoryController | Suppliers/Categories/Index | Categories | Add, edit, delete categories |
| `settings.supplier-capabilities.index` | SupplierCapabilityController | Suppliers/Capabilities/Index | Capabilities | Add, edit, delete capabilities |
| `settings.certifications.index` | CertificationController | Suppliers/Certifications/Index | Certifications | Add, edit, delete certifications |

---

## 7. UX/UI review checklist (Phase 1 supplier pages only)

Use this for a focused Phase 1 pass. Do **not** review RFQ, contract, evaluation, procurement package, or task flows.

### Accessibility (A11Y)

- [ ] All form inputs have associated `<Label>` or `aria-label`.
- [ ] Buttons and links have clear, non-generic labels (no "Submit" only where context matters).
- [ ] Focus order is logical on registration wizard and long forms.
- [ ] Error messages are announced (e.g. live region or focus move to first error).
- [ ] Required fields are indicated (visually and in markup).
- [ ] Modals (approval, edit company) trap focus and restore on close.
- [ ] Map controls (MapPicker) are keyboard-usable where applicable.

### RTL / LTR and locale

- [ ] Public registration and portal respect `dir` and `lang` from layout/shared props.
- [ ] Tailwind `rtl:` / `ltr:` used where layout differs by direction.
- [ ] All user-facing strings use translation keys (no hardcoded English) on Phase 1 pages.
- [ ] Date/number formats respect locale where shown.

### Public registration flow

- [ ] Wizard steps are clear and allow back/forward where intended.
- [ ] CR check feedback is clear (unique vs duplicate vs blacklisted).
- [ ] Validation errors appear inline and at step level where appropriate.
- [ ] Success page clearly explains next step (e.g. complete profile link).
- [ ] Complete-profile page (token) works when token is valid and shows error when invalid/expired.
- [ ] Status check (e.g. by email) returns clear messaging (found vs not found, status text).

### Supplier portal (pending + dashboard + profile + contacts + documents)

- [ ] Pending page explains that approval is required and whom to contact.
- [ ] Dashboard entry points (profile, contact, documents) are obvious.
- [ ] Profile view (Edit) and full edit (EditFull) are consistent (same fields, same validation).
- [ ] Map picker updates lat/long and shows validation errors.
- [ ] Contact profile and contacts create/edit: required fields and validation are clear.
- [ ] Document list shows view/download correctly; no broken links.
- [ ] Notifications list is readable; mark read / read-all work.

### Internal management (list, create, show, edit, map)

- [ ] Suppliers index: filters, sort, pagination, and bulk destroy work and reflect permissions.
- [ ] Create supplier: required fields and validation match backend; categories/capabilities load.
- [ ] Show: approval actions (approve, reject, request info, suspend, blacklist, reactivate) show correct modals and feedback.
- [ ] Show: add contact/document flows work; delete contact/document with confirmation.
- [ ] Edit: all editable fields save correctly; capability matrix saves.
- [ ] Coverage map: loads suppliers; filter and click-through to supplier show work.

### Settings (categories, capabilities, certifications)

- [ ] List and pagination work.
- [ ] Create/update/delete with validation and success/error feedback.
- [ ] Inactive items (if any) are clearly distinguished.

### Consistency and polish

- [ ] Primary actions use primary button style; destructive actions use destructive style.
- [ ] Loading states (buttons, skeletons) shown during submit and page load where appropriate.
- [ ] Flash messages (success/error) appear and are dismissible or auto-dismiss.
- [ ] No duplicate or conflicting CTAs (e.g. two "Save" buttons with different behavior).
- [ ] Mobile: key flows (registration, profile edit, list, show) are usable on small screens.

### Out of scope for this checklist

- RFQ list/detail, quotations, quote submission, clarifications.
- Contracts, evaluations, procurement packages, tasks.
- Supplier intelligence, ranking, watchlist.
- Any page or component that only serves the excluded modules above.

---

*Document generated for Phase 1 supplier registration and supplier management isolation. Last updated: March 2025.*
