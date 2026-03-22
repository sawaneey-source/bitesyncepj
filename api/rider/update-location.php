<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents("php://input"), true);
$usrId = $data['usrId'] ?? 0;
$lat   = $data['lat'] ?? 0;
$lng   = $data['lng'] ?? 0;

if (!$usrId) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit();
}

// Update tbl_rider based on UsrId
$stmt = $conn->prepare("UPDATE tbl_rider SET RiderLat = ?, RiderLng = ? WHERE UsrId = ?");
$stmt->bind_param("ddi", $lat, $lng, $usrId);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}
