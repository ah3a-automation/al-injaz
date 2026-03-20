# Notification Configuration Contract (Phase 1.5)

## Scope
This document defines the contracts introduced in **Phase 1.5 — Catalog + Schema Hardening** for the Notification Configuration feature.

No UI and no delivery/dispatcher engine is implemented yet. This is strictly about hardening the event catalog + database schema so Phase 2 can build on stable foundations.

## 1) Event Key vs Template Code vs Emitted Event Key
There are three related identifiers in the system:

1. **Emitted event key** (runtime)
   - The `event_key` passed by workflow services / commands when they decide that an event happened.
   - Example: `supplier.approved`, `rfq.issued`, `supplier.document_expiring_soon.internal`

2. **Notification template code** (`notification_templates.event_code`)
   - Only exists for events that already have rows in `notification_templates`.
   - Used by `BaseAppNotification` (Laravel Notifications) to render subject/body + enable channel flags.
   - Example: `supplier.approved`, `task.assigned`

3. **Configurable notification event key** (database)
   - The `notification_settings.event_key` that Phase 2 engines will consult to decide:
     - whether notifications are enabled
     - which channels are supported (in-app/internal, email, etc.)
     - which recipient rules apply

Phase 1.5 hardening keeps the **configurable event key** aligned with existing system event strings used across:
- `notification_templates`
- `NotificationService` and `SystemNotification`
- listeners / commands / outbox event keys

## 2) Canonical vs Transitional Alias (`.internal`)
Some existing flows emit event keys with a `.internal` suffix to represent internal audience variants.

Phase 1.5 formalizes this via:
- `source_event_key` in `notification_settings`
- `NotificationEventCatalog::canonicalEventKey(...)`
- `NotificationEventCatalog::resolveSeedKey(...)` (provided for Phase 2 engines)

Policy for compatibility:
- `.internal` variants remain fully supported for now (seeded with default recipient rules)
- engines should treat `.internal` as transitional aliases and prefer canonical keys for long-term configuration
- Phase 2 should still preserve existing behavior for all currently emitted keys

## 3) NotificationEventCatalog contract
Catalog entries are provided by:
- `App\Domain\Notifications\NotificationEventCatalog::hardenedDefinitions()`

Each catalog item explicitly defines:
- `event_key`
- `source_event_key` (nullable, for aliases)
- `template_event_code` (nullable, only for events that exist in `notification_templates`)
- support flags (`supports_internal`, `supports_email`, `supports_sms`, `supports_whatsapp`)
- `default_channels` (mapped to `notification_settings.send_*` booleans)
- `default_recipient_rules` (mapped to `notification_recipients`)
- `is_seed_enabled_by_default`

## 4) Recipient Rule Model
Recipient rows live in `notification_recipients` and support a resolver-friendly shape:
- `recipient_type`
- `role_name` and/or `user_id` (for role/user-based resolution)
- `recipient_value` (reserved for future resolver inputs like identifiers)
- `resolver_config_json` (reserved for future resolver configuration)
- `channel_override` (reserved for future per-recipient channel routing)
- `is_enabled`
- `sort_order`

Phase 1.5 seeds recipient rules without requiring any resolver engine yet.

## 5) What Phase 1.5 Completed
- Added hardened catalog contract and alias helpers.
- Hardened `notification_settings` with:
  - `source_event_key`
  - `template_event_code`
  - compatibility `notes`
  - lookup indexes for enabled-event resolution
- Hardened `notification_recipients` with resolver-friendly columns + dedupe strategy indexes.
- Refactored the seeder to seed from the hardened catalog structure and avoid duplicating recipient rows on reruns.

## 6) Remaining Work for Phase 2
Phase 2 will implement the actual policy resolver + dispatcher engine, including:
- loading the correct notification setting for an emitted event key
- applying alias/canonical rules as designed
- evaluating `conditions_json`
- resolving recipients from `notification_recipients` rows
- dispatching to in-app/email/broadcast channels based on enabled settings

## Phase 2 (Notification Engine Core) Overview
Phase 2 introduced runtime services that turn an emitted event key + event context into a normalized dispatch plan.

### Engine flow (v2 core)
1. `NotificationPolicyResolver`
   - canonicalize + alias-resolve the emitted event key (centralized alias handling)
   - load the matching `notification_settings` row
   - enforce `is_enabled` and `environment_scope`
2. `NotificationConditionEvaluator`
   - evaluate `notification_settings.conditions_json` using a minimal deterministic rule set
3. `NotificationRecipientResolver`
   - load `notification_recipients` for the resolved setting
   - resolve supported audience types into concrete user/email targets
4. `NotificationChannelPlanner`
   - compute which channels are eligible based on:
     - setting-level `send_*` flags
     - catalog support flags (`NotificationEventCatalog`)
     - recipient `channel_override`
     - resolved recipient capability (e.g. `explicit_email` only routes to email)
5. `NotificationDispatcher`
   - execute clean channel-specific delivery points:
     - internal/in-app (creates `SystemNotification` via `NotificationService`)
     - email (safe no-op in Phase 2 v1)

### Conditions v1 scope
Supported rule operators:
- `equals`, `not_equals`
- `in`, `not_in` (expected value must be an array)
- `boolean`
- `less_than`, `less_than_or_equal`
- `greater_than`, `greater_than_or_equal`

Condition JSON format:
{
  "mode": "all"|"any",
  "rules": [
    {"field":"supplier.status","op":"equals","value":"approved"}
  ]
}
If the structure is unrecognized (and not an empty object), Phase 2 will default to *pass-through* to avoid blocking all notifications.

### Recipient resolution v1 scope
Supported recipient types:
- `user` (by `user_id` or `recipient_value` parsed as id)
- `role` (by `role_name` using Spatie role membership)
- `supplier_user` (by `supplier_user_id` in context, or via `supplier_id` lookup)
- `actor` (from `actor_id` in context)
- `record_creator` (from `record_creator_user_id` or `created_by_user_id` in context)
- `explicit_email` (email taken from `recipient_value` or `resolver_config_json.email`)

Unsupported recipient types are skipped (fail-safe) with debug logging.

### Compatibility approach
Phase 2 deliberately does not replace:
- existing listener/command calls to `NotificationService`
- `notification_templates` + legacy Laravel Notification classes

The new engine is additive: it can be called by future event wiring without changing current behavior.

### Known Phase 2 limitations (expected for Phase 3+)
- Email channel execution is implemented for pilot events in Phase 2.6; non-pilot keys remain deferred (legacy behavior unchanged).
- SMS/WhatsApp/broadcast routing is planned structurally but not executed until Phone/channel recipient modeling exists.
- Conditions JSON parsing is minimal and may require Phase 3 rule-set expansion driven by real data usage.

## Phase 2.5 (Pilot Runtime Wiring) Overview
Phase 2.5 incrementally routes a small set of *pilot* event keys through the new engine while keeping legacy notification behavior for all other events.

### Pilot event keys
Default pilot list (from `NOTIFICATION_ENGINE_PILOT_EVENT_KEYS`):
- `supplier.document_expiring_soon` (supplier document expiry; in-app/internal via `SystemNotification`)
- `rfq.issued` (RFQ issued; internal in-app)
- `rfq.issued.supplier` (RFQ issued; supplier audience in-app)
- `contract.activated` (contract activation; internal in-app)

Rationale:
- These keys already flow through the existing `NotificationService` (creating `SystemNotification` rows), so the engine can replace the legacy path safely without depending on the unfinished email execution path.
- Recipient resolution is practical for v1 (creator + supplier_user audiences).
- Pilot wiring is reversible and prevents duplicates via feature-flagged routing.

### Rollout gate strategy
Pilot gating is controlled by `config/notifications.php`:
- `NOTIFICATION_ENGINE_ENABLED`
- `NOTIFICATION_ENGINE_PILOT_ENABLED`
- `NOTIFICATION_ENGINE_PILOT_EVENT_KEYS` (comma-separated list)
- optional safety net: `NOTIFICATION_ENGINE_FALLBACK_TO_LEGACY`

### Duplicate-prevention strategy
- When the pilot gate enables a given event key, Phase 2.5 runs **engine-first**.
- Legacy notification dispatch runs only if the engine did not dispatch any channel (e.g., policy missing/disabled, conditions failed, or no recipients).
- This guarantees “no duplicates” on successful engine dispatch and preserves user-facing notifications during early pilot if engine dispatch is skipped.

### Condition safety for pilot rollout
Phase 2.5 tightened evaluator safety:
- empty/null conditions => dispatch allowed (pass)
- recognized valid structure => evaluated
- non-empty unrecognized structure => fail-closed (dispatch skipped)

### Observability
Added debug logs along the pilot wiring path:
- routing decision (gate enable/disable)
- engine planned/dispatched vs skipped
- legacy fallback selection

## Phase 2.6 (Real Email Execution for Pilot Events)
Phase 2.6 replaces the earlier Phase 2 v1 email no-op with **real email sending** for the currently piloted event keys:
- `supplier.document_expiring_soon`
- `rfq.issued`
- `rfq.issued.supplier`
- `contract.activated`

### Pilot email reality (audit)
- The pilot event wiring code paths create `SystemNotification` rows through `NotificationService` (in-app/internal) and do not currently send email via legacy `notification_templates` + `BaseAppNotification` for these keys.
- `NotificationEventCatalog::TEMPLATE_EVENT_CODES` explicitly lists only events that exist in `notification_templates`; pilot keys are not in that list, so template-based email rendering cannot be used safely for them.

### Email execution design (pilot-scoped)
- Email is sent directly by the new engine email channel using the runtime notification context (`title`, `message`, `link`) via a lightweight `NotificationEventMail`.
- Email recipients are deduped by normalized inbox to prevent duplicate messages when multiple recipient rules map to the same address.
- Email is only sent when the engine resolves recipients with a valid email address.

### Dispatch result semantics + fallback matrix
`NotificationDispatchResult.status` provides explicit states such as:
- `dispatched`, `partially_dispatched`
- `skipped_policy_missing`, `skipped_policy_disabled`
- `skipped_conditions_failed`, `skipped_no_recipients`
- `skipped_no_executable_channels`

`NotificationEngineBridge` applies a narrow, intentional fallback:
- fallback to legacy only when `status === skipped_policy_missing`
- no fallback for `skipped_policy_disabled`, `skipped_conditions_failed`, or recipient-resolution skips

### Context gateway: supplier document expiry email toggle
For `supplier.document_expiring_soon`, email sending is additionally gated by the existing `supplier_document_expiry_notify_email` setting via `metadata.email_delivery_enabled` passed into the engine context.

### Known limitations / deferred cases
- Non-pilot event keys still do not have real email execution in this Phase (legacy behavior remains unchanged).
- If the engine intentionally resolves no valid email recipients, email is skipped without falling back.

## Phase 2.7 (Pilot Expansion: Next Safe Event Keys)
Phase 2.7 expands the pilot runtime event coverage using the same centralized `NotificationEngineBridge` mechanism and the same narrow, status-driven fallback matrix.

### Newly added pilot events (Phase 2.7)
- `rfq.awarded` (supplier audience)
- `clarification.added.supplier` (supplier audience)
- `clarification.answered` (supplier audience)

### Parity findings (legacy vs engine)
- Legacy internal delivery for these events uses `NotificationService` to create `SystemNotification` rows for the target supplier user.
- Legacy direct email delivery was not found for these `NotificationService`-driven event keys; therefore, the engine email behavior is additive for this pilot scope.
- Engine internal recipients for the new pilot events match legacy recipients by using the same `supplier_user_ids` values derived from the legacy producer (RFQ event service).
- Engine email recipients match by resolving the same `supplier_user` audience to `user.email`.

### Known differences
- Engine email content is generated from the runtime context (`title`, `message`, `link`) using `NotificationEventMail` (not from `notification_templates`), since these keys are not part of the template-event catalog.

### Rollout notes
- Pilot gating remains controlled by `NOTIFICATION_ENGINE_PILOT_EVENT_KEYS` and `NOTIFICATION_ENGINE_PILOT_ENABLED`.
- Fallback to legacy is still restricted to `skipped_policy_missing` only, so disabled policies / condition failures do not re-enable legacy dispatch.

## Real-time In-app Notifications (Reverb + Broadcasting)

### Source of truth and delivery model
- `system_notifications` remains the authoritative store for:
  - unread counts
  - notification history
  - reconnect/reload recovery
- broadcasting is a secondary mechanism used only to keep the UI fresh between page refreshes.

### Backend flow
1. Internal channel delivery still goes through existing boundaries:
   - `NotificationDispatcher` -> `SendInternalNotificationAction` -> `NotificationService::notifyUser()`
2. `NotificationService::notifyUser()` persists `SystemNotification`.
3. After successful persistence, it emits `App\Events\SystemNotificationCreated` (broadcast event).
4. Event broadcasts on private channel:
   - `private-users.{id}.notifications`

### Channel authorization
- Channel authorization lives in `routes/channels.php`.
- Only authenticated users can subscribe to their own channel:
  - `users.{userId}.notifications` where `auth()->id() === userId`

### Frontend flow
- Echo subscribes after authenticated app load.
- `NotificationBell` listens for `.system-notification.created`.
- On event:
  - prepend lightweight notification item to local dropdown list
  - update unread count immediately
- Existing API / Inertia reads remain in place to recover canonical state.

### Queue / async behavior
- Broadcast event implements `ShouldBroadcast` (queue-safe async broadcasting).
- If broadcasting is disabled (`BROADCAST_CONNECTION=null` or `log`), application behavior still works via DB-backed notifications and regular reads.

### Required environment variables
- `BROADCAST_CONNECTION=reverb`
- `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`
- `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME`
- `REVERB_SERVER_HOST`, `REVERB_SERVER_PORT`
- `VITE_BROADCAST_CONNECTION`
- `VITE_REVERB_APP_KEY`, `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, `VITE_REVERB_SCHEME`

### Local run steps
1. Ensure queue worker is running (`php artisan queue:work`).
2. Start Reverb server (`php artisan reverb:start`).
3. Start Vite (`npm run dev`).
4. Trigger notification-producing actions (e.g. task assignment).
5. Confirm:
   - row exists in `system_notifications`
   - bell updates in real time
   - reload still shows correct unread count/history from DB.

## Phase 3 (Admin UI: Notification Configuration)
Phase 3 introduces the first admin-facing UI for managing notification policies and recipient rules.

### Scope (v1)
- List and filter `notification_settings`
- Edit a single setting:
  - `is_enabled`
  - channel flags (`send_internal`, `send_email`, `send_sms`, `send_whatsapp`)
  - `conditions_json` (v1 JSON textarea editor)
  - `notes`
- Manage recipient rules for a setting (v1):
  - add/edit/remove recipient rules
  - editable recipient types:
    - `user`
    - `role`
    - `supplier_user`
    - `actor`
    - `record_creator`
    - `explicit_email`

### Read-only metadata shown
- `event_key`
- `source_event_key`
- `template_event_code`

### Limitations (intentional in v1)
- No end-user preferences
- No bulk mass-edit tooling
- No advanced visual rule builder (conditions are JSON only)
- No SMS/WhatsApp execution or UI beyond the toggles

## Phase 3.5 (UX polish + Safety + Audit Logging)
Phase 3.5 improves admin usability and operational safety for the Notification Configuration UI without changing the notification engine architecture.

### UX improvements
- Settings navigation: added a dedicated sidebar entry for Notification Configuration (permission-gated by `settings.manage`).
- Recipient user picker: replaced the raw numeric `user_id` entry with a searchable "search + pick" control (remote lookup by name/email).
- Conditions helper: kept v1 JSON editing, but added:
  - an inline example for the expected v1 structure (`mode` + `rules`), including shorthand rule support
  - a list of supported v1 operators
  - lightweight client-side JSON/rule-shape validation to prevent common misconfigurations before submit
- Read-only rollout context on the edit page:
  - pilot scope indicator
  - currently enabled channels (from the setting's `send_*` flags)
  - source/template metadata references
  - a short note explaining the engine vs legacy fallback behavior
- Safety messaging: the edit page clearly warns that changes impact live notification behavior for the selected event key.

### Audit logging behavior
- All admin state changes are logged via `ActivityLogger` (governance/audit convention).
- Logged events:
  - `notifications.notification_setting.updated` (policy/conditions/toggles/notes changes)
  - `notifications.notification_recipient.created`
  - `notifications.notification_recipient.updated`
  - `notifications.notification_recipient.deleted`
- Logged data is stored as `old_values`/`new_values` diffs (compact and safe).
- For `explicit_email` recipients, the stored recipient value is masked in audit logs to reduce PII exposure.

### Known limitations (intentional in v1)
- Conditions remain a JSON textarea (no visual rule builder).
- Server-side validation of `conditions_json` remains intentionally minimal (JSON decode + shape handling is enforced at runtime via the fail-closed evaluator).

### Remaining future enhancements
- Visual rule builder UI for conditions.
- Richer recipient resolution UX for additional recipient types (where safely resolvable).
- Optional “send test notification” tooling for a small safe scope (if supported by routes and operator intent).

## Phase 4 (Broader Migration + Outbox Alignment + Recipient Coverage)
Phase 4 expands the notification engine migration in a controlled, event-key gated way, while improving recipient resolver coverage and aligning outbox payloads with notification policy keys.

### 1) Broader event migration (next safe batch)
These event keys are routed through the engine-first pilot bridge (reversible via `NOTIFICATION_ENGINE_PILOT_EVENT_KEYS`):
RFQs / Quotations / Clarifications:
- `rfq.evaluation` (RFQ moved to evaluation) — internal in-app for the record creator
- `quote.submitted` (Quote submitted) — internal in-app for the record creator
- `quote.revised` (Quote revised) — internal in-app for the record creator
- `clarification.made_public` (Clarification shared with all suppliers) — internal in-app for invited supplier users

Migration strategy:
- keep legacy dispatch intact, but allow legacy to be skipped when the engine successfully dispatches (no duplicate delivery)
- only migrate events with clear v1 recipient semantics available in real event services

### 1.1) Parity checks (legacy internal/email vs engine)
For the migrated events above, the parity target is **recipient coverage** (channel routing remains internal-only in v1).

- `rfq.evaluation`
  - legacy internal recipients: `rfq.created_by` (record creator) via `NotificationService->notifyUser(...)`
  - legacy email recipients: none (`send_email` is `false` for this key in the catalog)
  - new engine recipients: `recipient_type=creator` resolved from `created_by_user_id` in the emitted context
  - intentional differences: none (internal title/message/link are taken from runtime context)

- `quote.submitted` / `quote.revised`
  - legacy internal recipients: `rfq.created_by` (record creator) via `NotificationService->notifyUser(...)`
  - legacy email recipients: none (`send_email` is `false` for these keys in the catalog)
  - new engine recipients: `recipient_type=creator` resolved from `created_by_user_id` in the emitted context
  - intentional differences: none

- `clarification.made_public`
  - legacy internal recipients: all invited supplier users on the RFQ via `NotificationService->notifyUsers(...)`
  - legacy email recipients: none (`send_email` is `false` for this key in the catalog)
  - new engine recipients: `recipient_type=supplier_user` resolved from `supplier_user_ids` in the emitted context
  - intentional differences: none

### 2) Outbox alignment strategy (policy key mapping)
Phase 4 introduces a centralized outbox→notification-policy mapping helper:
- `NotificationOutboxEventKeyMapper`

Outbox payloads were updated for migrated RFQ events to include:
- `notification_event_key` (notification policy event key)
- `quote_event_key` (for `rfq.quote_submitted`, so mapping can distinguish `quote.submitted` vs `quote.revised`)

Mapping rules (explicit + non-guessing):
- if `notification_event_key` exists in payload, use it
- for `rfq.quote_submitted`, use `quote_event_key` when present
- otherwise fallback to explicit known 1:1 mappings for `rfq.evaluation` and `rfq.clarification_public`

Important note:
- outbox processing is not a full notification dispatcher yet; Phase 4 aligns keys/payloads so a future outbox processor can safely dispatch through the engine without drift.

### 3) Recipient coverage expansion (resolver support)
Phase 4 adds resolver support for:
- `recipient_type = creator`

Implementation detail:
- `creator` resolves using the same runtime context keys as `record_creator` (primarily `created_by_user_id`, optionally `record_creator_user_id`).

### 4) Bridge/dispatcher hardening decisions
- Duplicate prevention remains unchanged:
  - engine-first dispatch suppresses legacy only when the engine successfully dispatches at least one channel.
- Fallback remains intentionally narrow:
  - legacy fallback only happens for `skipped_policy_missing` (disabled/conditions failed/recipient-resolution skips do not re-enable legacy).

### 5) Admin UI alignment for newly supported recipient types
- The Notification Configuration recipient type selector now includes `creator` (with localized labels).
- This type is safe to expose because the engine resolver now supports it in Phase 4.

### 6) Tests and verification
Added coverage includes:
- creator recipient resolution in `NotificationRecipientResolver`
- engine-first dispatch + legacy suppression for:
  - `rfq.evaluation`
  - `quote.submitted`
  - `quote.revised`
  - `clarification.made_public`
- unit tests for `NotificationOutboxEventKeyMapper`

### Known gaps / deferred cases
- Additional recipient types like `assigned_user`, `approver`, and `subject_owner` are still not resolved in Phase 4; they can be migrated safely in later phases once resolver + UI validation are expanded.
- Phase 4 aligns outbox payloads, but it does not yet switch notification sending to outbox processing.

## Phase 4.5 (Outbox-driven Dispatch)
Phase 4.5 makes selected migrated outbox events dispatch through the new notification engine, while keeping rollback simple and preventing duplicates.

### Scope (what gets dispatched)
Only outbox event keys on the configured allow-list are dispatched:
- `rfq.evaluation` -> `rfq.evaluation`
- `rfq.quote_submitted` -> mapped to `quote.submitted` or `quote.revised` via outbox payload `quote_event_key`
- `rfq.clarification_public` -> mapped to `clarification.made_public`

### Enable / disable controls
In `config/notifications.php`:
- `notifications.notification_engine.outbox_dispatch.enabled`
- `notifications.notification_engine.outbox_dispatch.allowed_event_keys` (comma list)

By default, outbox dispatch is disabled to preserve legacy behavior.

### Centralized outbox->notification mapping
All outbox-to-notification event resolution is done via:
- `NotificationOutboxEventKeyMapper`

No other mapping logic is duplicated in the outbox command.

### Duplicate-prevention strategy
Outbox dispatch uses the engine, but is protected against duplicates (e.g. legacy already wrote the same notification) via:
- `SendInternalNotificationAction` idempotency:
  - checks for existing `SystemNotification` rows for the same `user_id` + `event_key`
  - compares a safe metadata subset (`rfq_id`, `supplier_id`, `clarification_id`, etc.)
  - skips creation when an exact match is found

This makes outbox dispatch reversible/safer during rollout without requiring a hard cutover of the synchronous legacy code paths.

## Phase 5 (Recipient Coverage Expansion + Next Safe Event Migration)
Phase 5 expands recipient resolver coverage to support seeded internal procurement audiences and migrates the next safe event batch through the engine-first bridge.

### 1) Recipient coverage expansion (resolver support)
This phase adds support for:
- `recipient_type = approver`

Resolver logic:
- `NotificationRecipientResolver` resolves `approver` recipients by treating `recipient.role_name` as a Spatie *permission* name (example: `suppliers.approve`)
- it queries users who have that permission and returns them as internal recipients

### 2) Admin UI alignment / safety
`approver` is supported by the resolver, but is intentionally not exposed in the recipient type selector for manual editing in v1.

UI safety behavior:
- seeded `approver` recipient rows are treated as read-only (edit/delete disabled in the recipient rules list)

This avoids permission-name editing UX risks until a dedicated permissions-based picker is implemented.

### 3) Migrated event keys (engine-first dispatch)
The next safe event batch migrated (pilot gated) is the internal supplier document expiry audience:
- `supplier.document_expiring_soon.internal`
- `supplier.document_expired.internal`

Source flow change:
- `NotifySupplierDocumentExpiry` now dispatches these internal events through `NotificationEngineBridge->dispatchOrLegacy(...)`
- internal recipients are resolved by the engine (resolver `approver` type), while legacy delivery is suppressed on engine success

Rollout controls:
- migration is gated by the existing Notification Engine pilot allow-list:
  - add/remove the internal event keys in `notifications.notification_engine.pilot.pilot_event_keys`

### 4) Parity checks (legacy vs new engine)
For both internal migrated event keys:
- Legacy internal recipients:
  - all users with permission `suppliers.approve`
  - delivered via `NotificationService->notifyUsers(...)` using `eventKeyBase . '.internal'`
- Legacy email recipients:
  - none (these internal events are seeded with `send_email = false`)
- New engine recipients:
  - resolved via `recipient_type = approver` using permission name stored in `recipient.role_name`
- Intentional differences:
  - none expected for title/message/link/metadata content; both paths use the same `NotificationEventContext` title/message/link and the same metadata payload

### 5) Duplicate prevention
Duplicate prevention strategy remains unchanged:
- engine-first dispatch suppresses the legacy closure only when the engine successfully dispatches at least one channel
- no new dedupe-key expansions were introduced in this phase

### 6) Tests and verification
Added coverage includes:
- unit test: `approver` recipient resolution from a permission name
- feature test: engine-first dispatch for:
  - `supplier.document_expiring_soon.internal` (legacy suppressed)
  - `supplier.document_expired.internal` (legacy suppressed)

### Known gaps / deferred cases
- Other resolver types (e.g. `subject_owner`, `project_manager`) are still not migrated in Phase 5 (or 5.5).
- UI remains intentionally conservative for runtime-context recipient types (like `assigned_user` and `approver`).

## Phase 5.5 (assigned_user + Next Task Event Migration)
Phase 5.5 expands recipient resolver coverage and migrates the next small safe batch of events.

### 1) Recipient coverage expansion
Added resolver support for:
- `recipient_type = assigned_user`

Resolver logic (fail-safe, context-first):
- resolves from `NotificationEventContext.assigned_user_ids` (array) or `assigned_user_id` (scalar) when present
- otherwise, if `task_id` exists in context, derives assignees from `task_assignees.user_id`

### 2) Admin UI alignment / edit safety
- `assigned_user` remains intentionally NOT exposed in the v1 recipient type selector for manual editing.
- it is dynamically resolved from runtime context (task assignment), so manual editing is unsafe in v1 without a task-based picker.
- existing seeded `assigned_user` recipient rows are treated as read-only (edit/delete disabled in the UI list).

### 3) Newly migrated event keys
Engine-first migration (pilot-gated) includes:
- `task.assigned`

Source flow change:
- `CreateTaskCommand` and `UpdateTaskCommand` now use `NotificationEngineBridge->dispatchOrLegacy()` for `task.assigned`.

### 4) Parity checks (legacy vs new engine)
For `task.assigned`:
- Legacy internal recipients:
  - all task assignees, excluding the actor/assigner (same target filtering used by the command)
- Legacy email recipients:
  - none (notification_settings seeded with `send_email = false`)
- New engine recipients:
  - resolved via `recipient_type = assigned_user` using context `assigned_user_ids`
- Intentional differences:
  - both paths use the same `TaskAssignedNotification` template rendering to generate `title`, `message` (body), and `link`, so user-facing content should match

### 5) Duplicate prevention / dedupe keys
Extended internal notification dedupe metadata keys to include:
- `task_id`

This enables idempotency for engine-first replays/overlap when notification metadata provides the same task identifier.

### 6) Tests and verification
Added coverage includes:
- unit test for `assigned_user` recipient resolution from `assigned_user_ids`
- feature tests for:
  - engine success dispatch + legacy suppression for `task.assigned`
  - policy-missing fallback behavior
  - dedupe skip behavior using `task_id`

## Phase 6 (Task Due Soon/Overdue Migration)
Phase 6 expands the task-event rollout by introducing engine-first dispatch for internal task reminders.

### 1) Migrated event keys
Pilot-gated engine-first dispatch covers:
- `task.due_soon`
- `task.overdue`

### 2) New recipient type(s)
No new recipient types were required:
- both events use `recipient_type = assigned_user`
- `assigned_user` is already resolved from `NotificationEventContext.assigned_user_ids` (or derived via `task_id`)

### 3) How notifications are emitted (migration)
New scheduled command `tasks:notify-due-soon-overdue` computes:
- due soon: `due_at` within next `task_due_soon_warning_days` (admin SystemSetting) and status not done/cancelled
- overdue: `due_at` in the past and status not done/cancelled

For each affected task, the command routes via:
- `NotificationEngineBridge->dispatchOrLegacy(...)`

Precedence for the reminder window:
- DB SystemSetting `task_due_soon_warning_days`
- env fallback `TASK_DUE_SOON_WARNING_DAYS`
- hard fallback default `7`

### 4) Parity checks (legacy vs engine)
For both new migrated task events:
- Legacy internal recipients:
  - all task assignees (scheduled job has no “actor” filtering)
  - delivered via the command’s legacy closure using `NotificationService->notifyUsers(...)`
- Legacy email recipients:
  - none (send_email is false in seeded defaults)
- New engine recipients:
  - resolved via `recipient_type = assigned_user` using the command-provided context `assigned_user_ids`
- Intentional differences:
  - none expected (title/message/link and metadata are generated once in the command and passed to both legacy + engine paths)

### 5) Dedupe implications
No new dedupe metadata keys were added in Phase 6.
- internal dedupe continues to use `task_id` (included in the command metadata)

### 6) Tests and verification
Added feature tests for:
- engine success + legacy suppression for `task.due_soon`
- engine success + legacy suppression for `task.overdue`
- missing-policy fallback behavior for `task.due_soon`
- internal dedupe skip behavior for `task.due_soon`

## Phase 6.5 (Task Reminder Settings Polish)
This phase improves operational control of the task reminder window without introducing new notification event flows.

### 1) Admin-manageable setting
- Added an admin input on `Settings/NotificationSettings` to manage `task_due_soon_warning_days`.
- The scheduled command reads the SystemSetting first, with safe env fallback and a default.

### 2) What changed operationally
- `NotifyTaskDueSoonAndOverdue` no longer relies on env-only configuration for the warning window.
- Changes are validated in the controller (`1..365`) before storing.

### 3) Tests
- Added coverage for precedence: DB overrides env, and env is used when DB is missing.

## Phase 7 (Reminder Operational Control)
Phase 7 adds safe operational controls to pause overdue reminders without changing the event flows.

### 1) Admin-manageable toggle
- Added `task_overdue_reminders_enabled` on `Settings/NotificationSettings`.

### 2) Command behavior
- `NotifyTaskDueSoonAndOverdue`:
  - always evaluates due-soon tasks using the configured warning days
  - only evaluates and dispatches `task.overdue` when overdue reminders are enabled

### 3) Tests
- Added a feature test verifying that when overdue reminders are disabled, `task.overdue` notifications are not created.

## Phase 7.5 (Operational Visibility & Safety)
This phase improves operator visibility for reminder-driven notifications and adds concise, testable guardrails.

### 1) Notification settings operational visibility
- The `Settings/NotificationSettings` page now shows a read-only operational context card for task reminders:
  - effective `task_due_soon_warning_days`
  - whether overdue reminders are enabled
  - whether the notification engine + pilot are enabled
  - whether `task.due_soon` / `task.overdue` are present in pilot keys
  - whether `notification_settings` policies exist and are enabled for each event key

### 2) Reminder command observability
- `NotifyTaskDueSoonAndOverdue` now produces a single concise summary for each run:
  - due-soon attempted/dispatched/skipped counts
  - overdue attempted/dispatched/skipped counts
  - explicit message + log when overdue dispatch is skipped due to operational setting

### 3) Validation / guardrails
- Reminder window warning days are validated (`1..365`) before persisting.
- Overdue reminder enablement is persisted as a boolean-like setting (`task_overdue_reminders_enabled`).

### 4) Tests
- Added tests for warning-days bounds and reminder settings visibility on the settings page.
- Preserved the overdue-disabled skip-path test.

