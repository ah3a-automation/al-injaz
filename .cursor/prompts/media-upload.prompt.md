# CCP — Media Upload Prompt (V3.2 FORENSIC)

## READ FIRST (MANDATORY)
- /.cursorrules
- /.cursor/docs/MEDIA_ARCHITECTURE.md
- /.cursor/docs/AUDIT_LOG_STANDARD.md

If conflict exists → STOP.

---

## TASK

Implement image upload and preview strictly using standard pipeline.

---

## CLIENT REQUIREMENTS

- Crop (react-easy-crop)
- Resize (max 2000px longest side)
- Compress (quality 0.80–0.85)
- Deterministic rename
- Use <ImageUploader /> only

---

## SERVER REQUIREMENTS

- Validate MIME via finfo
- Normalize orientation BEFORE stripping EXIF
- Strip EXIF
- Convert to WebP
- Generate 300x300 thumbnail
- Compute SHA256 for dedupe
- Store normalized + thumb
- Write platform_files record
- Attach via file_attachments

---

## UI RULES

- List pages show thumbnail only (<ImageThumb />).
- Clicking opens <ImageLightbox />.
- No raw <img> for uploaded content.
- No SVG uploads.
- No user-controlled filenames.

---

## OUTPUT FORMAT

1. Files changed
2. Component code
3. Backend processing code
4. Storage + DB write details
5. Confirmation SHA256 + EXIF stripping implemented