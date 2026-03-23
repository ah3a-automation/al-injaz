# RFQ supplier quote — currency precision (hardening note)

**Phase 6 prep — March 2026**

- Line **unit prices** and **totals** in this flow use **up to 4 decimal places** in persistence (`RfqQuoteItem`, snapshot strings) to support fractional rates and BOQ math.
- **Display** on the supplier portal uses `Intl.NumberFormat` with **2–4** fraction digits for money (`formatMoney` in `Show.tsx`).
- **No change** was made in this hardening pass to force a single global 2-decimal rule: unifying rounding everywhere would touch validation, snapshots, and comparison read models and was deferred in favor of **stability**.

When building buyer comparison UIs (Phase 6), align displayed totals with the same rounding policy as internal evaluation services.
