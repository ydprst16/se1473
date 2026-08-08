<?php
/*
| SE2026 Monitoring Center — config.php
| Konstanta keamanan & retensi. Hash bcrypt digenerate satu kali.
|
| Password plaintext (jangan di-commit di file lain):
|   - Upload           : Welcome.2026!
|   - Admin (audit)    : Jkmnhui@2026!
|
| Regenerate hash bila password diganti:
|   php -r "echo password_hash('PASSWORD_BARU', PASSWORD_BCRYPT).PHP_EOL;"
*/

if (!defined('UPLOAD_PASSWORD_HASH')) {
    define('UPLOAD_PASSWORD_HASH', '$2y$10$HmIgOqdRLS2TIvQl3q2mR.w.DxGz0aOgypwwpLtHcDxsHjPtnOGNq');
}
if (!defined('ADMIN_PASSWORD_HASH')) {
    define('ADMIN_PASSWORD_HASH', '$2y$10$UebKwfdgn.wABz.EC7SwPey.WXJ9avTHkAGK7z/jmf2Wg565SdPle');
}

// Retensi audit log (hari) — auto-purge saat write
if (!defined('AUDIT_RETENTION_DAYS')) define('AUDIT_RETENTION_DAYS', 90);

// Batasan upload
if (!defined('MAX_FILES_PER_BATCH')) define('MAX_FILES_PER_BATCH', 20);
if (!defined('MAX_FILE_SIZE_MB'))    define('MAX_FILE_SIZE_MB', 10);

// Rate limit password gagal
if (!defined('RATE_LIMIT_MAX_ATTEMPTS'))   define('RATE_LIMIT_MAX_ATTEMPTS', 5);
if (!defined('RATE_LIMIT_WINDOW_MINUTES')) define('RATE_LIMIT_WINDOW_MINUTES', 10);

// Path Supabase Storage untuk audit & rate-limit state
if (!defined('AUDIT_STORAGE_PATH')) define('AUDIT_STORAGE_PATH', 'audit/audit.jsonl');
if (!defined('RATE_STORAGE_PATH'))  define('RATE_STORAGE_PATH',  'audit/rate.json');

