# ============================================================
# MEDIA_ARCHITECTURE.md — Media Pipeline (V3.2 FORENSIC)
# ============================================================

## 1. Security Principles

- Never trust client file.
- Always re-validate server-side.
- Strip all EXIF metadata.
- Reject SVG (XSS vector).
- Reject zero-byte files.

---

## 2. Client Requirements

- Crop (react-easy-crop)
- Resize max 2000px
- Compress 0.80–0.85
- Deterministic rename

---

## 3. Server Pipeline

1. Validate MIME via finfo.
2. Normalize orientation.
3. Strip EXIF.
4. Convert to WebP.
5. Resize max 2000px.
6. Generate 300x300 square thumbnail.
7. Compute SHA256 for dedupe.
8. Store full + thumb.
9. Write platform_files.
10. Attach via file_attachments.

---

## 4. Naming Pattern

{entity}_{entity_id}_{field}_{location?}_{YYYYMMDD_HHMMSS}.webp

All lowercase.
Underscore separated.
Timestamp from server only.

---

## 5. Storage Structure

{disk}/storage/{entity}/{entity_id}/{field}/{YYYY}/{MM}/{DD}/

---

## 6. platform_files Structure

- id
- disk
- path
- stored_name
- original_name
- mime
- ext
- size_bytes
- width
- height
- sha256
- variants JSONB
- meta JSONB
- created_at
- updated_at