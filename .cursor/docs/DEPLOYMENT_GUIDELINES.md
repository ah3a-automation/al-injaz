# ============================================================
# DEPLOYMENT_GUIDELINES.md — Production Discipline
# ============================================================

## 1. Environment Rules

- APP_ENV must not be production in local.
- APP_DEBUG false in production.
- Use secure .env storage.

---

## 2. Database

- Always run migrations before deploy.
- Never edit production DB manually.
- Use migration rollback only via version control.

---

## 3. Queues

- Horizon must be running in production.
- Monitor failed jobs.
- Alert on integration failures.

---

## 4. Caching

- config:cache
- route:cache
- view:cache

---

## 5. Build Process

Frontend:
- npm run build
Backend:
- php artisan optimize

---

## 6. Backup

- Daily DB backup required.
- Weekly full backup.
- Test restore procedure quarterly.