# ============================================================
# SECURITY_POLICY.md — CCP Security Governance
# ============================================================

## 1. Authorization

- All controller actions MUST be gated by Policies.
- No public controller methods without policy enforcement.
- UI hiding is secondary; backend is authoritative.

Never:
- Trust frontend role checks.
- Bypass policy for performance shortcuts.

---

## 2. Input Validation

- All incoming requests must use Form Request classes.
- No inline $request->validate() in controllers.
- Validate filters and sort[field] against whitelist.

Never:
- Accept arbitrary column names for sorting.
- Accept arbitrary IDs without validation.

---

## 3. File Security

- Validate MIME using finfo.
- Never trust file extension.
- Strip EXIF metadata.
- Reject SVG (XSS vector).
- Use signed URLs for private files.

---

## 4. Mass Assignment Protection

- Use guarded or fillable explicitly.
- Never use $model->update($request->all()).
- Never allow ID mutation.

---

## 5. Rate Limiting

- Apply rate limiting to:
  - Login
  - Search
  - Export
  - Bulk actions

---

## 6. XSS / CSRF

- Use Laravel CSRF protection.
- Never render raw user input without escaping.
- Avoid dangerouslySetInnerHTML in React.

---

## 7. Logging & Monitoring

- Critical errors logged.
- Security-related actions logged.
- Failed authorization attempts logged.