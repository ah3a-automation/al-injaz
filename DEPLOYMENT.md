# Al Injaz — production deployment guide

This document summarizes security/performance work applied in-repo, how to deploy, monitor, back up, and what must be done manually on a real server (TLS, DNS, secrets).

---

## 1. Security audit — findings & fixes (in repository)

| Area | Finding | Mitigation |
|------|---------|------------|
| **`.env.example`** | Incomplete / dev-oriented | Rewritten with PostgreSQL, Redis, session, CORS, security/CSP, health, Horizon, S3/Reverb/Evolution placeholders; sensitive keys labeled. |
| **`config/cors.php`** | Missing | Added: `CORS_ALLOWED_ORIGINS` comma-separated list; **no** `*` with credentials. |
| **Security headers** | Missing | `SecurityHeadersMiddleware` + `config/security.php` (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy; CSP optional via `SECURITY_CSP_*`). |
| **Rate limiting** | API / auth gaps | `throttle:api` on `routes/api.php`; `throttle:login` on login POST; `throttle:password-reset` on forgot/reset password; `RateLimiter::for('api'|'password-reset')` in `AppServiceProvider`. Public supplier routes already use `throttle:30,1`. |
| **File uploads** | Audit | **MIME**: `MediaController` streams `mime_type` from stored media; uploads should use server-side validation (finfo) in controllers — see `MediaManager` / upload controllers. **Size**: PHP `upload-limits.ini` (10M) + Nginx `client_max_body_size`. **Access**: media routes call `authorizeMedia()` — not public without policy/signature. |
| **Session** | Production hardening | `config/session.php` uses `SESSION_SECURE_COOKIE`, `SESSION_SAME_SITE` from env. **Production:** set `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=strict` (or `lax` if you need cross-site flows). |

---

## 2. Performance

### Database indexes

A migration adds (where missing):

- `idx_suppliers_created_at` on `suppliers(created_at)`
- Partial index `idx_sn_user_unread` on `system_notifications(user_id) WHERE status <> 'read'`

**Already present** (no duplicate migration): `suppliers.status`, `supplier_user_id`, `system_notifications` user/event/created, `notification_recipients`, `user_notification_preferences` unique `(user_id, event_key, channel)`, `tasks.status`, `tasks.due_at`.

### Query notes

- **Supplier list** (`ListSuppliersQuery`): uses `with(['primaryContact', 'categories:...'])` — no extra N+1 for those relations.
- **`HandleInertiaRequests::share()`**: runs branding read, notification count + recent list, permission booleans. Spatie permission checks are cached when `cache` driver is **Redis** (not `array`). Avoid adding heavy queries per request without caching.

### Caching

- **`BrandingHelper::get()`** uses `Cache::rememberForever` with invalidation in branding admin (`Cache::forget`). No change required; TTL is “until cleared.”
- **Deploy:** always run `php artisan config:cache` (and route/view/event cache as in `deploy.sh`) after env changes.

---

## 3. Docker & Nginx

| File | Purpose |
|------|---------|
| `docker-compose.yml` | **Local dev** (unchanged). |
| `docker-compose.prod.yml` | Production-oriented: no Mailpit/pgAdmin/RedisInsight/Vite; bind-mount `./src`; Reverb **without** `--debug`. |
| `Dockerfile` | Dev PHP-FPM image (extensions). |
| `Dockerfile.prod` | **Optional** CI image: multi-stage `npm run build` + `composer --no-dev` + baked `public/build`. |
| `nginx/production.conf` | HTTP server block, gzip, long cache for `/build/*`, Reverb proxy, security headers; **HTTPS block commented** — enable after certs. |

**Manual:** Replace `YOUR_DOMAIN` in `nginx/production.conf`; obtain TLS (Let’s Encrypt or corporate PKI); uncomment HTTPS server block and HTTP→HTTPS redirect when ready.

---

## 4. Scripts

| Script | Purpose |
|--------|---------|
| `./deploy.sh` | `git pull`, `composer install --no-dev`, `npm ci && npm run build`, maintenance mode, migrate, caches, `docker compose … restart horizon reverb` if compose file exists. |
| `./backup.sh` | `pg_dump` → gzip, optional `aws s3 sync`, retention 7 days (`RETENTION_DAYS`). |

Both are **executable** (`chmod +x`). Run from repo root (`al-injaz/`).

**Environment for backup:** `BACKUP_DIR`, `PG*` / `PGPASSWORD`, optional `S3_BACKUP_BUCKET` + AWS CLI.

---

## 5. Monitoring & observability

### Telescope

- Package is **`require-dev`**. Production images using `composer install --no-dev` **do not** install Telescope.
- If you install dev tools in staging: `TelescopeServiceProvider` gate allows **`super_admin`** only.

### Horizon

- **`HorizonServiceProvider`**: `viewHorizon` gate → **`super_admin`** only.
- **Mail alerts:** set `HORIZON_NOTIFICATION_EMAIL` in `.env` (maps to `Horizon::routeMailNotificationsTo`). Long wait thresholds: `config/horizon.php` → `waits` (e.g. 60s). Failed-job notifications follow Horizon’s docs (mail/slack hooks).

### Logging & errors

- Production: `LOG_CHANNEL=stack`, `LOG_LEVEL=error` (or `warning`) in `.env`.
- **Sentry:** optional `SENTRY_LARAVEL_DSN` in `.env.example`; install `sentry/sentry-laravel` only after approval (not added by default).
- Laravel hides stack traces when `APP_DEBUG=false`.

### Health endpoints

| URL | Role |
|-----|------|
| `GET /up` | Framework probe (lightweight). |
| `GET /health` | DB + Redis + cache; optional Horizon (`HEALTH_CHECK_HORIZON=true`) and Reverb HTTP probe (`HEALTH_CHECK_REVERB` + `HEALTH_REVERB_URL`). Throttled `60/min`. |

---

## 6. Backups & retention

- **Postgres:** `backup.sh` → `postgres_<UTC>.sql.gz` under `BACKUP_DIR` (default `./backups`).
- **S3/MinIO:** optional sync to `s3://$S3_BACKUP_BUCKET/` if AWS CLI + bucket configured.
- **Retention:** delete dumps older than `RETENTION_DAYS` (default 7).

Store backups **off-server** (object storage, another region, or tape) per org policy.

---

## 7. Manual actions on the server (checklist)

- [ ] DNS A/AAAA records to load balancer or origin.
- [ ] TLS certificates (Let’s Encrypt or internal CA); update `nginx/production.conf`.
- [ ] Secrets: `APP_KEY`, DB, Redis, AWS, Reverb, mail — **never** commit real values.
- [ ] `.env.production` at **repository root** (`al-injaz/.env.production`) for `docker-compose.prod.yml` — copy from `src/.env.example` and fill secrets (Compose requires this file to exist if `env_file` is listed).
- [ ] `TRUSTED_PROXIES` / `TrustProxies` when behind Cloudflare, ELB, etc.
- [ ] `php artisan config:cache` after any config/env change.
- [ ] Process supervision: Horizon, `schedule:work`, Reverb, queue — Docker Compose or systemd.
- [ ] **OPcache:** `Dockerfile.prod` sets `opcache.validate_timestamps=0` for immutable images; with bind-mounted `./src` (dev-style deploy), prefer `opcache.validate_timestamps=1` or restart PHP after deploy.

---

## 8. Files created or modified (this effort)

**Repository root (`al-injaz/`):**

- `docker-compose.prod.yml` — production Compose reference.
- `Dockerfile.prod` — optional multi-stage production image.
- `nginx/production.conf` — production Nginx template.
- `deploy.sh`, `backup.sh` — deployment & backup automation.
- `DEPLOYMENT.md` — this file.

**Application (`src/`):**

- `.env.example` — production-oriented template.
- `config/cors.php`, `config/security.php`, `config/health.php`
- `config/horizon.php` — `notification_email` key.
- `app/Http/Middleware/SecurityHeadersMiddleware.php`
- `app/Http/Controllers/HealthCheckController.php`
- `app/Providers/AppServiceProvider.php` — API + password-reset rate limiters.
- `app/Providers/HorizonServiceProvider.php` — gate + optional mail notifications.
- `app/Providers/TelescopeServiceProvider.php` — gate.
- `bootstrap/app.php` — security middleware; `/health` route.
- `routes/api.php`, `routes/auth.php` — throttles.
- `database/migrations/2026_03_30_120000_production_readiness_indexes.php`

---

## 9. Items intentionally not automated

- SSL certificate issuance (certbot / ACME / corporate PKI).
- DNS and firewall rules.
- Installing `sentry/sentry-laravel` or other APM (composer approval required).
- Exact resource limits for Kubernetes/Swarm (compose `deploy` keys are best-effort under plain `docker compose`).

For questions, align with internal runbooks and the platform charter (`.cursorrules` / governance docs).
