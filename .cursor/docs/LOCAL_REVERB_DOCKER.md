# Local Reverb + Docker (browser WebSockets)

## Typical failure modes

1. **Port 8080 not published** — Reverb listens inside the container; the host browser has nothing on `localhost:8080`.
2. **`REVERB_HOST` copied into Echo** — Laravel must publish to `http://reverb:8080` from the app container, but the browser cannot resolve `reverb`; Echo needs `localhost` (or your public hostname) + mapped port.
3. **`REVERB_PUBLIC_SCHEME=https` while Reverb speaks plain WS** — Echo tries `wss://` and fails unless TLS terminates on Reverb or a proxy.

## Fix (this repo)

- **Server-side publishing:** `REVERB_HOST` / `REVERB_PORT` / `REVERB_SCHEME` — target the Reverb process **as seen from the PHP container** (often the Compose service name `reverb`).
- **Browser / Echo:** Optional `REVERB_PUBLIC_*` overrides. If omitted, the shared Inertia prop uses the **current request host** (`$request->getHost()`) plus `REVERB_PORT` (or `REVERB_PUBLIC_PORT`), so Docker can keep `REVERB_HOST=reverb` for PHP while the user loads the app at `http://localhost` and Echo uses `localhost` for WebSockets.
- Laravel shares host/port/scheme + key via Inertia (`reverb` prop); `resources/js/app.tsx` initializes Echo from that config (Vite `VITE_*` is only a fallback).

## Compose

See `docker-compose.reverb.example.yml` — ensure `ports: "8080:8080"` (or your choice) and `command` uses `--host=0.0.0.0`.

## Reference `.env` (Docker)

| Variable | Example | Role |
|----------|---------|------|
| `BROADCAST_CONNECTION` | `reverb` | |
| `REVERB_HOST` | `reverb` | PHP → Reverb HTTP API (internal DNS) |
| `REVERB_PORT` | `8080` | Internal container port |
| `REVERB_SCHEME` | `http` | PHP → Reverb |
| `REVERB_SERVER_HOST` | `0.0.0.0` | Reverb bind (all interfaces) |
| `REVERB_SERVER_PORT` | `8080` | Listen port inside container |
| `REVERB_PUBLIC_HOST` | `localhost` | Browser → WebSocket host |
| `REVERB_PUBLIC_PORT` | `8080` | Host-mapped port |
| `REVERB_PUBLIC_SCHEME` | `http` | `ws` vs `wss` for Echo |

After changing `.env`: `php artisan config:clear` and restart Reverb (`docker compose restart reverb` or process manager).
