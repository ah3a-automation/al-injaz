# ============================================================
# OUTBOX_PATTERN.md — Transactional Outbox (V3.2 HARDENED)
# ============================================================

## 1. Purpose

Guarantee reliable, after-commit event processing.

Ensure:
- No lost integrations
- No phantom events
- Retry-safe external calls

---

## 2. Flow

1. State mutation occurs.
2. Domain event created.
3. Event stored in outbox_events inside same DB transaction.
4. Transaction commits.
5. Horizon worker processes event.
6. Integration executes.

---

## 3. Rules

- Never dispatch external integration inside controller.
- Never send emails inside DB transaction.
- Outbox must be idempotent.
- Worker must retry safely.
- Events must include unique event_id.

---

## 4. Failure Handling

- Failed events retried.
- Exponential backoff recommended.
- Dead-letter support recommended for repeated failures.

---

## 5. Logging

All integration attempts must:
- Log success/failure in activity_logs.
- Include correlation id.