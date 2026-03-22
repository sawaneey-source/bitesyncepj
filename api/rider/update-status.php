<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
    exit;
}

$orderIdRaw = $data['orderId'] ?? '';
$statusKey  = $data['status'] ?? '';
$orderId    = (int)str_replace('#', '', $orderIdRaw);

if (!$orderId || !$statusKey) {
    echo json_encode(['success' => false, 'message' => 'Missing ID or Status']);
    exit;
}

// 5=Delivering, 6=Completed
$odrStatus = 2; // Default to Pending if unknown
if ($statusKey === 'pickup')    $odrStatus = 5;
if ($statusKey === 'delivered') $odrStatus = 6;

$stmt = $conn->prepare("UPDATE tbl_order SET OdrStatus = ? WHERE OdrId = ?");
$stmt->bind_param("ii", $odrStatus, $orderId);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}
?>
