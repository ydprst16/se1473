<?php
/*
| SE2026 Monitoring Center — api/audit.php
| Endpoint list audit log. Protected by admin password (session atau POST body).
|
| Actions:
|   POST action=login       body: password             → set session, respond ok
|   POST action=logout                                 → clear session
|   GET  action=list       (session required)          → return entries JSON
|   GET  action=status                                 → { logged_in: bool }
*/

if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}
require_once __DIR__ . '/lib_security.php';

date_default_timezone_set('Asia/Jakarta');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('SE_AUDIT_SID');
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];

function respond($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

try {
    switch ($action) {
        case 'status': {
            respond(['status' => 'ok', 'logged_in' => !empty($_SESSION['audit_admin'])]);
        }

        case 'login': {
            if ($method !== 'POST') respond(['status' => 'error', 'message' => 'Method not allowed'], 405);
            $ip = sec_client_ip();
            $rl = sec_check_rate_limit($ip);
            if ($rl['blocked']) {
                sec_audit_write([
                    'action' => 'admin_login_failed',
                    'status' => 'failed',
                    'error'  => 'rate_limited',
                ]);
                respond(['status' => 'error', 'message' => 'Terlalu banyak percobaan. Coba lagi nanti.'], 403);
            }
            $password = $_POST['password'] ?? '';
            if (!sec_verify_admin_password($password)) {
                sec_record_failed_attempt($ip);
                sec_audit_write([
                    'action' => 'admin_login_failed',
                    'status' => 'failed',
                    'error'  => 'wrong_password',
                ]);
                respond(['status' => 'error', 'message' => 'Password admin salah.'], 401);
            }
            sec_clear_failed_attempts($ip);
            $_SESSION['audit_admin'] = true;
            $_SESSION['audit_admin_at'] = time();
            sec_audit_write([
                'action' => 'admin_login_success',
                'status' => 'success',
                'error'  => null,
            ]);
            respond(['status' => 'ok']);
        }

        case 'logout': {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $p = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
            }
            session_destroy();
            respond(['status' => 'ok']);
        }

        case 'list': {
            if (empty($_SESSION['audit_admin'])) {
                respond(['status' => 'error', 'message' => 'unauthorized'], 401);
            }
            $entries = sec_audit_load_all();
            // Terbaru dulu
            usort($entries, fn($a, $b) => strcmp($b['ts'] ?? '', $a['ts'] ?? ''));
            respond([
                'status'  => 'ok',
                'count'   => count($entries),
                'entries' => $entries,
            ]);
        }

        default:
            respond(['status' => 'error', 'message' => 'Action tidak dikenal: ' . htmlspecialchars((string)$action)], 400);
    }
} catch (Throwable $e) {
    respond(['status' => 'error', 'message' => $e->getMessage()], 500);
}

