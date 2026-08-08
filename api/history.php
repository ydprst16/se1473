<?php
// Mematikan output error HTML bawaan PHP
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Menangkap Fatal Error dan mengubahnya menjadi format JSON
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error', 
            'message' => 'PHP Fatal Error: ' . $err['message'] . ' in ' . basename($err['file']) . ' line ' . $err['line']
        ]);
        exit;
    }
});
/*
| SE Monitoring Center — api/history.php v4
| - Support role: pencacah | pengawas
| - Auto-detect role dari isi JSON saat upload
| - Paths: Pencacah = latest.json/history/; Pengawas = latest_pengawas.json/history_pengawas/
*/

// Auto-load config lokal untuk XAMPP dev
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}
require_once __DIR__ . '/lib_security.php';   //

date_default_timezone_set('Asia/Jakarta');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$SUPABASE_URL = getenv('SUPABASE_URL') ?: '';
$SUPABASE_KEY = getenv('SUPABASE_SERVICE_KEY') ?: '';
$BUCKET = getenv('SUPABASE_BUCKET') ?: 'data';

if (!$SUPABASE_URL || !$SUPABASE_KEY) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Supabase belum dikonfigurasi.']);
    exit;
}

function normalize_role($r)
{
    $r = strtolower(trim((string) $r));
    return $r === 'pengawas' ? 'pengawas' : 'pencacah';
}

function paths_for_role($role)
{
    if ($role === 'pengawas') {
        return ['latest' => 'latest_pengawas.json', 'history_dir' => 'history_pengawas/'];
    }
    return ['latest' => 'latest.json', 'history_dir' => 'history/'];
}

function detect_role_from_json($decoded)
{
    if (!is_array($decoded) || empty($decoded))
        return null;
    $first = $decoded[0] ?? null;
    if (!is_array($first))
        return null;
    if (isset($first['isPencacah']))
        return $first['isPencacah'] === true ? 'pencacah' : 'pengawas';
    if (isset($first['roleName'])) {
        $rn = strtolower((string) $first['roleName']);
        if (strpos($rn, 'pengawas') !== false)
            return 'pengawas';
        if (strpos($rn, 'pencacah') !== false)
            return 'pencacah';
    }
    return null;
}

function sb_request($method, $path, $extraHeaders = [], $body = null)
{
    global $SUPABASE_URL, $SUPABASE_KEY;
    $url = rtrim($SUPABASE_URL, '/') . '/storage/v1' . $path;
    $headers = array_merge([
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'apikey: ' . $SUPABASE_KEY,
    ], $extraHeaders);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    if ($body !== null)
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return ['status_code' => $code, 'body' => $response, 'error' => $err];
}

function sb_upload($remotePath, $content)
{
    global $BUCKET;
    return sb_request(
        'POST',
        "/object/{$BUCKET}/" . $remotePath,
        ['Content-Type: application/json', 'x-upsert: true'],
        $content
    );
}
function sb_download($p)
{
    global $BUCKET;
    return sb_request('GET', "/object/{$BUCKET}/" . $p);
}
function sb_info($p)
{
    global $BUCKET;
    return sb_request('GET', "/object/info/{$BUCKET}/" . $p);
}
function sb_list($prefix = '')
{
    global $BUCKET;
    $body = json_encode([
        'prefix' => $prefix,
        'limit' => 1000,
        'offset' => 0,
        'sortBy' => ['column' => 'name', 'order' => 'desc']
    ]);
    return sb_request(
        'POST',
        "/object/list/{$BUCKET}",
        ['Content-Type: application/json'],
        $body
    );
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$role = normalize_role($_GET['role'] ?? $_POST['role'] ?? 'pencacah');
$P = paths_for_role($role);

try {
        switch ($action) {

        case 'upload-latest':
        case 'upload': {
            if ($method !== 'POST')
                throw new Exception('Method not allowed', 405);

            $rawFilename = isset($_FILES['file']['name']) ? basename($_FILES['file']['name']) : null;
            $safeFilename = $rawFilename ? preg_replace('/[^A-Za-z0-9._-]/', '_', $rawFilename) : null;
            $sizeGuess = isset($_FILES['file']['size']) ? (int) $_FILES['file']['size'] : null;

            // === Password guard ===
            $password = $_POST['password'] ?? '';
            $auth = sec_verify_upload_password($password);
            if (!$auth['ok']) {
                sec_audit_write([
                    'action'   => 'login_failed',
                    'filename' => $safeFilename,
                    'size'     => $sizeGuess,
                    'status'   => 'failed',
                    'error'    => $auth['error'],
                ]);
                throw new Exception($auth['error'], $auth['code']);
            }

            try {
                if (!isset($_FILES['file']))
                    throw new Exception('File tidak ditemukan');
                if (isset($_FILES['file']['error']) && $_FILES['file']['error'] !== UPLOAD_ERR_OK)
                    throw new Exception('Upload error: ' . $_FILES['file']['error']);

                // Batas ukuran
                $maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
                if ($sizeGuess !== null && $sizeGuess > $maxBytes)
                    throw new Exception('Ukuran file melebihi ' . MAX_FILE_SIZE_MB . ' MB');

                // Ekstensi
                if ($safeFilename && !preg_match('/\.json$/i', $safeFilename))
                    throw new Exception('Ekstensi harus .json');

                $content = file_get_contents($_FILES['file']['tmp_name']);
                if ($content === false || $content === '')
                    throw new Exception('File kosong.');
                if (strlen($content) > $maxBytes)
                    throw new Exception('Ukuran file melebihi ' . MAX_FILE_SIZE_MB . ' MB');

                $decoded = json_decode($content, true);
                if (!is_array($decoded))
                    throw new Exception('JSON tidak valid (harus Array).');

                $detected = detect_role_from_json($decoded);
                if ($detected === null)
                    throw new Exception('Tidak bisa deteksi role dari JSON.');
                $usePath = paths_for_role($detected);

                if ($action === 'upload-latest') {
                    $today = date('Y-m-d');
                    $r1 = sb_upload($usePath['latest'], $content);
                    if ($r1['status_code'] >= 400)
                        throw new Exception('Upload latest gagal: ' . $r1['body']);
                    $r2 = sb_upload($usePath['history_dir'] . $today . '.json', $content);
                    if ($r2['status_code'] >= 400)
                        throw new Exception('Upload snapshot gagal: ' . $r2['body']);
                    $usedDate = $today;
                    $okPayload = [
                        'status'        => 'ok',
                        'role'          => $detected,
                        'detected_role' => $detected,
                        'date'          => $today,
                        'message'       => "Latest+snapshot tersimpan sebagai {$detected}"
                    ];
                } else {
                    $date = $_POST['date'] ?? '';
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))
                        throw new Exception('Tanggal tidak valid.');
                    $r = sb_upload($usePath['history_dir'] . $date . '.json', $content);
                    if ($r['status_code'] >= 400)
                        throw new Exception('Upload gagal: ' . $r['body']);
                    $usedDate = $date;
                    $okPayload = [
                        'status'        => 'ok',
                        'role'          => $detected,
                        'detected_role' => $detected,
                        'date'          => $date,
                    ];
                }

                sec_audit_write([
                    'action'   => 'upload_success',
                    'filename' => $safeFilename,
                    'role'     => $detected,
                    'date'     => $usedDate,
                    'size'     => strlen($content),
                    'status'   => 'success',
                    'error'    => null,
                ]);

                echo json_encode($okPayload);
            } catch (Exception $ex) {
                sec_audit_write([
                    'action'   => 'upload_failed',
                    'filename' => $safeFilename,
                    'size'     => $sizeGuess,
                    'status'   => 'failed',
                    'error'    => $ex->getMessage(),
                ]);
                throw $ex;
            }
            break;
        }

        case 'get': {
            $date = $_GET['date'] ?? '';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))
                throw new Exception('Tanggal tidak valid.');
            $r = sb_download($P['history_dir'] . $date . '.json');
            if ($r['status_code'] === 404 || $r['status_code'] === 400)
                throw new Exception("Snapshot {$role}/{$date} tidak ditemukan", 404);
            if ($r['status_code'] >= 400)
                throw new Exception('Gagal ambil: ' . $r['body']);
            header('Content-Type: application/json; charset=utf-8');
            echo $r['body'];
            break;
        }

        case 'list': {
            $r = sb_list($P['history_dir']);
            if ($r['status_code'] >= 400)
                throw new Exception('Gagal list: ' . $r['body']);
            $files = json_decode($r['body'], true) ?: [];
            $items = [];
            foreach ($files as $f) {
                $name = $f['name'] ?? '';
                if (preg_match('/^(\d{4}-\d{2}-\d{2})\.json$/', $name, $m)) {
                    $items[] = [
                        'date' => $m[1],
                        'updated_at' => $f['updated_at'] ?? ($f['created_at'] ?? null)
                    ];
                }
            }
            usort($items, fn($a, $b) => strcmp($b['date'], $a['date']));
            echo json_encode(['status' => 'ok', 'role' => $role, 'items' => $items]);
            break;
        }

        case 'latest-raw': {
            if ($method === 'HEAD') {
                $r = sb_info($P['latest']);
                http_response_code($r['status_code'] === 200 ? 200 : 404);
                exit;
            }
            $r = sb_download($P['latest']);
            if ($r['status_code'] === 404 || $r['status_code'] === 400)
                throw new Exception("Belum ada data latest untuk {$role}", 404);
            if ($r['status_code'] >= 400)
                throw new Exception('Gagal: ' . $r['body']);
            header('Content-Type: application/json; charset=utf-8');
            echo $r['body'];
            break;
        }

        case 'latest': {
            $r = sb_download($P['latest']);
            if ($r['status_code'] === 200) {
                $data = json_decode($r['body'], true);
                echo json_encode(['status' => 'ok', 'source' => 'latest', 'role' => $role, 'data' => $data]);
                break;
            }
            $rList = sb_list($P['history_dir']);
            if ($rList['status_code'] >= 400)
                throw new Exception('Gagal list');
            $files = json_decode($rList['body'], true) ?: [];
            $dates = [];
            foreach ($files as $f) {
                if (preg_match('/^(\d{4}-\d{2}-\d{2})\.json$/', $f['name'] ?? '', $m))
                    $dates[] = $m[1];
            }
            if (!$dates)
                throw new Exception("Belum ada data {$role}");
            rsort($dates);
            $rGet = sb_download($P['history_dir'] . $dates[0] . '.json');
            if ($rGet['status_code'] >= 400)
                throw new Exception('Gagal ambil snapshot');
            echo json_encode([
                'status' => 'ok',
                'source' => 'history',
                'role' => $role,
                'date' => $dates[0],
                'data' => json_decode($rGet['body'], true)
            ]);
            break;
        }

        case 'latest-meta': {
            $rList = sb_list('');
            if ($rList['status_code'] >= 400) {
                echo json_encode(['status' => 'error', 'message' => 'Gagal list']);
                break;
            }
            $files = json_decode($rList['body'], true) ?: [];
            $mtime = $created = null;
            foreach ($files as $f) {
                if (($f['name'] ?? '') === $P['latest']) {
                    $mtime = $f['updated_at'] ?? null;
                    $created = $f['created_at'] ?? null;
                    break;
                }
            }
            if (!$mtime && !$created) {
                echo json_encode(['status' => 'error', 'message' => $P['latest'] . ' belum ada']);
                break;
            }
            echo json_encode([
                'status' => 'ok',
                'role' => $role,
                'mtime' => $mtime ?: $created,
                'created_at' => $created,
                'updated_at' => $mtime
            ]);
            break;
        }

        case 'snapshot-meta': {
            $date = $_GET['date'] ?? '';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))
                throw new Exception('Tanggal tidak valid.');
            $rList = sb_list($P['history_dir']);
            if ($rList['status_code'] >= 400)
                throw new Exception("Snapshot {$role}/{$date} tidak ditemukan", 404);
            $files = json_decode($rList['body'], true) ?: [];
            foreach ($files as $f) {
                if (($f['name'] ?? '') === "{$date}.json") {
                    $mtime = $f['updated_at'] ?? null;
                    $created = $f['created_at'] ?? null;
                    echo json_encode([
                        'status' => 'ok',
                        'role' => $role,
                        'date' => $date,
                        'mtime' => $mtime ?: $created,
                        'created_at' => $created,
                        'updated_at' => $mtime,
                        'source' => 'list'
                    ]);
                    exit;
                }
            }
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => "Snapshot {$role}/{$date} tidak ditemukan"]);
            break;
        }

        case 'previous': {
            $before = $_GET['before'] ?? date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $before))
                throw new Exception('before tidak valid');
            $rList = sb_list($P['history_dir']);
            if ($rList['status_code'] >= 400)
                throw new Exception('Gagal list');
            $files = json_decode($rList['body'], true) ?: [];
            $candidates = [];
            foreach ($files as $f) {
                if (preg_match('/^(\d{4}-\d{2}-\d{2})\.json$/', $f['name'] ?? '', $m))
                    if ($m[1] < $before)
                        $candidates[] = $m[1];
            }
            if (!$candidates) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'No previous snapshot']);
                break;
            }
            rsort($candidates);
            $rGet = sb_download($P['history_dir'] . $candidates[0] . '.json');
            if ($rGet['status_code'] >= 400)
                throw new Exception('Gagal ambil');
            echo json_encode([
                'status' => 'ok',
                'role' => $role,
                'date' => $candidates[0],
                'data' => json_decode($rGet['body'], true)
            ]);
            break;
        }

        case 'snapshot': {
            if ($method !== 'POST')
                throw new Exception('Method not allowed', 405);
            $today = date('Y-m-d');
            $rCheck = sb_info($P['history_dir'] . $today . '.json');
            if ($rCheck['status_code'] === 200) {
                echo json_encode(['status' => 'ok', 'message' => 'sudah ada', 'role' => $role, 'date' => $today]);
                break;
            }
            $rList = sb_list('');
            if ($rList['status_code'] >= 400) {
                echo json_encode(['status' => 'error', 'message' => 'Gagal list']);
                break;
            }
            $files = json_decode($rList['body'], true) ?: [];
            $updatedAt = null;
            foreach ($files as $f) {
                if (($f['name'] ?? '') === $P['latest']) {
                    $updatedAt = $f['updated_at'] ?? ($f['created_at'] ?? null);
                    break;
                }
            }
            if (!$updatedAt) {
                echo json_encode(['status' => 'error', 'message' => $P['latest'] . ' belum ada']);
                break;
            }
            try {
                $updatedYMD = (new DateTime($updatedAt))->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Y-m-d');
            } catch (Exception $ex) {
                echo json_encode(['status' => 'skip', 'message' => 'updated_at tidak bisa di-parse']);
                break;
            }
            if ($updatedYMD !== $today) {
                echo json_encode([
                    'status' => 'skip',
                    'role' => $role,
                    'date' => $today,
                    'message' => "{$P['latest']} bukan data hari ini (mtime={$updatedYMD})"
                ]);
                break;
            }
            $rLatest = sb_download($P['latest']);
            if ($rLatest['status_code'] >= 400) {
                echo json_encode(['status' => 'error', 'message' => $P['latest'] . ' belum ada']);
                break;
            }
            $rSave = sb_upload($P['history_dir'] . $today . '.json', $rLatest['body']);
            if ($rSave['status_code'] >= 400)
                throw new Exception('Snapshot gagal');
            echo json_encode(['status' => 'ok', 'role' => $role, 'date' => $today]);
            break;
        }

        default:
            throw new Exception('Action tidak dikenal: ' . htmlspecialchars($action), 400);
    }
} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    if ($code < 400 || $code > 599)
        $code = 500;
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
