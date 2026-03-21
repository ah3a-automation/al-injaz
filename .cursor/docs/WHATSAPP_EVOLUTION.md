# WhatsApp (Evolution API) — setup

## Overview

Al Injaz sends WhatsApp messages through a **self-hosted Evolution API** instance (REST). Laravel stores optional overrides in `system_settings` (`evolution_api_url`, `evolution_api_key`, `evolution_api_instance`) and merges them with `.env` on boot via `SystemSetting::applyEvolutionConfig()`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `EVOLUTION_API_URL` | Base URL of Evolution API (no trailing path), e.g. `https://evolution.example.com` |
| `EVOLUTION_API_KEY` | Global API key (header `apikey`) |
| `EVOLUTION_API_SECRET` | Optional; used by Evolution dashboard/auth — **not** used by Laravel send path (reserved for ops) |
| `EVOLUTION_API_INSTANCE` | Instance name as created in Evolution (used in `/message/sendText/{instance}`) |

Leave all empty in local dev: WhatsApp is skipped gracefully; email/in-app still work.

## Admin UI

**Settings → WhatsApp Configuration** (`/settings/whatsapp`): URL, instance, API key (masked), connection indicator, test send.

**Settings → Notification Templates** (`/settings/notification-templates`): per-template WhatsApp enable + optional `whatsapp_body` (falls back to `body_text`).

## Connecting a real Evolution instance

1. Deploy Evolution API v2 (see [official docs](https://doc.evolution-api.com/v2/en/get-started/introduction)).
2. Create an **instance** and note its name.
3. Set **API key** in Evolution (global authentication).
4. In Al Injaz **Settings → WhatsApp**, enter:
   - **URL**: public base URL of Evolution (must be reachable from the Laravel app server).
   - **Instance**: exact instance name.
   - **API key**: same key Evolution expects in the `apikey` header.
5. Click **Refresh status** — green when `GET /instance/connectionState/{instance}` succeeds.
6. Use **Send test** with a real mobile number (international or KSA `05…` / `+966…`).

## Tinker checks

```bash
php artisan tinker
>>> config('services.evolution.url')
>>> \App\Models\SystemSetting::isEvolutionApiConfigured()
>>> app(\App\Services\WhatsApp\EvolutionApiClient::class)->checkConnection()
>>> app(\App\Services\WhatsApp\EvolutionApiClient::class)->sendText('966501234567', 'Test from tinker')
```

## Email channel note

`EVOLUTION_API_SECRET` is documented in `.env.example` for operators running Evolution; Laravel does not read it for sending. If you add server-side email for expiry alerts later, wire through existing `NotificationService` / mail settings — do not duplicate secrets in application code.
