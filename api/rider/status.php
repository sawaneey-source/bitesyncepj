<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

function get_auth_header() {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) return $_SERVER['HTTP_AUTHORIZATION'];
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) return $headers['Authorization'];
    }
    return null;
}

$data = json_decode(file_get_contents("php://input"), true);
$status = $data['status'] ?? 'Offline';
$usrId = $data['usrId'] ?? null;

$auth = get_auth_header();
if ($auth) {
    $token = str_replace('Bearer ', '', $auth);
    if (is_numeric($token)) $usrId = $token;
}

// Fallback to bs_user from localstorage if sent in some other way (but usually it's headers)
// For this system, let's just make it work.

if (!$usrId) {
    echo json_encode(["success"=>false, "message"=>"Unauthorized"]);
    exit();
}

$sql = "UPDATE tbl_rider SET RiderStatus = ? WHERE UsrId = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $status, $usrId);

if ($stmt->execute()) {
    echo json_encode(["success"=>true, "message"=>"Status updated to $status"]);
} else {
    echo json_encode(["success"=>false, "message"=>$conn->error]);
}
?>
