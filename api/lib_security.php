<?php
/*
| SE2026 Monitoring Center — api/lib_security.php
|
| Helper untuk:
|   - Password verification (upload & admin)
|   - Rate limiting per IP  (state di Supabase: audit/rate.json)
|   - Audit log JSONL       (state di Supabase: audit/audit.jsonl)
|   - Auto-purge audit >90 hari
|
| Dependency: config.php (root), env SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_BUCKET
*/

// Auto-load config lokal untuk XAMPP dev (mirror pola history.php)
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}
require_once __DIR__ . '/../config.php';

/* ================= Supabase helpers (self-contained) ================= */

function sec_sb_env()
{
    return [
        'url'    => getenv('SUPABASE_URL') ?: '',
        'key'    => getenv('SUPABASE_SERVICE_KEY') ?: '',
        'bucket' => getenv('SUPABASE_BUCKET') ?: 'data',
    ];
}

function sec_sb_request($method, $path, $extraHeaders = [], $body = null)
{
    $env = sec_sb_env();
    if (!$env['url'] || !$env['key']) {
        return ['status_code' => 0, 'body' => '', 'error' => 'Supabase belum dikonfigurasi.'];
    }
    $url = rtrim($env['url'], '/') . '/storage/v1' . $path;
    $headers = array_merge([
        'Authorization: Bearer ' . $env['key'],
        'apikey: ' . $env['key'],
    ], $extraHeaders);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return ['status_code' => $code, 'body' => $response, 'error' => $err];
}

function sec_sb_get_text($path)
{
    $env = sec_sb_env();
    $r = sec_sb_request('GET', "/object/{$env['bucket']}/" . $path);
    if ($r['status_code'] === 200) return (string) $r['body'];
    return null;
}

function sec_sb_put_text($path, $content, $contentType = 'application/json')
{
    $env = sec_sb_env();
    return sec_sb_request(
        'POST',
        "/object/{$env['bucket']}/" . $path,
        ['Content-Type: ' . $contentType, 'x-upsert: true'],
        $content
    );
}

/* ================= Client info ================= */

function sec_client_ip()
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) {
            $ip = trim(explode(',', $_SERVER[$k])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return '0.0.0.0';
}

function sec_client_ua()
{
    return isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 300) : '';
}

/* ================= Rate limiter ================= */

function sec_load_rate_state()
{
    $raw = sec_sb_get_text(RATE_STORAGE_PATH);
    if (!$raw) return [];
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

function sec_save_rate_state($state)
{
    sec_sb_put_text(RATE_STORAGE_PATH, json_encode($state, JSON_UNESCAPED_SLASHES));
}

function sec_check_rate_limit($ip)
{
    $state  = sec_load_rate_state();
    $now    = time();
    $window = RATE_LIMIT_WINDOW_MINUTES * 60;
    $list   = isset($state[$ip]) && is_array($state[$ip]) ? $state[$ip] : [];
    $list   = array_values(array_filter($list, fn($ts) => ($now - (int)$ts) < $window));
    $blocked = count($list) >= RATE_LIMIT_MAX_ATTEMPTS;
    return ['blocked' => $blocked, 'attempts' => count($list), 'state' => $state, 'list' => $list, 'now' => $now];
}

function sec_record_failed_attempt($ip)
{
    $r = sec_check_rate_limit($ip);
    $r['list'][] = $r['now'];
    $r['state'][$ip] = $r['list'];
    // prune IP lain yang sudah kosong
    foreach ($r['state'] as $k => $v) {
        if (!is_array($v) || !count($v)) unset($r['state'][$k]);
    }
    sec_save_rate_state($r['state']);
}

function sec_clear_failed_attempts($ip)
{
    $state = sec_load_rate_state();
    if (isset($state[$ip])) {
        unset($state[$ip]);
        sec_save_rate_state($state);
    }
}

/* ================= Password verification ================= */

/**
 * Verifikasi password upload + enforce rate limit.
 * Return: ['ok'=>bool, 'code'=>int, 'error'=>string|null]
 */
function sec_verify_upload_password($password)
{
    $ip  = sec_client_ip();
    $rl  = sec_check_rate_limit($ip);
    if ($rl['blocked']) {
        return ['ok' => false, 'code' => 403, 'error' => 'Terlalu banyak percobaan gagal. Coba lagi nanti.'];
    }
    if (!is_string($password) || $password === '') {
        sec_record_failed_attempt($ip);
        return ['ok' => false, 'code' => 401, 'error' => 'Password wajib diisi.'];
    }
    if (!password_verify($password, UPLOAD_PASSWORD_HASH)) {
        sec_record_failed_attempt($ip);
        return ['ok' => false, 'code' => 401, 'error' => 'Password salah.'];
    }
    sec_clear_failed_attempts($ip);
    return ['ok' => true, 'code' => 200, 'error' => null];
}

function sec_verify_admin_password($password)
{
    if (!is_string($password) || $password === '') return false;
    return password_verify($password, ADMIN_PASSWORD_HASH);
}

/* ================= Audit log ================= */

function sec_audit_load_all()
{
    $raw = sec_sb_get_text(AUDIT_STORAGE_PATH);
    if (!$raw) return [];
    $lines = preg_split('/\r?\n/', trim($raw));
    $out = [];
    foreach ($lines as $ln) {
        $ln = trim($ln);
        if ($ln === '') continue;
        $j = json_decode($ln, true);
        if (is_array($j)) $out[] = $j;
    }
    return $out;
}

function sec_audit_save_all($entries)
{
    $lines = [];
    foreach ($entries as $e) {
        if (is_array($e)) $lines[] = json_encode($e, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    sec_sb_put_text(AUDIT_STORAGE_PATH, implode("\n", $lines) . "\n", 'application/x-ndjson');
}

/**
 * Tulis event audit + auto-purge (>90 hari).
 * $event fields umum: action, filename, role, date, size, status, error
 */
function sec_audit_write($event)
{
    $entry = array_merge([
        'ts'       => gmdate('Y-m-d\TH:i:s\Z'),
        'ip'       => sec_client_ip(),
        'ua'       => sec_client_ua(),
        'action'   => '',
        'filename' => null,
        'role'     => null,
        'date'     => null,
        'size'     => null,
        'status'   => null,
        'error'    => null,
    ], is_array($event) ? $event : []);

    $all = sec_audit_load_all();
    $cutoff = time() - (AUDIT_RETENTION_DAYS * 86400);
    $kept = [];
    foreach ($all as $e) {
        $ts = isset($e['ts']) ? strtotime($e['ts']) : false;
        if ($ts && $ts >= $cutoff) $kept[] = $e;
    }
    $kept[] = $entry;
    sec_audit_save_all($kept);
    return $entry;
}

