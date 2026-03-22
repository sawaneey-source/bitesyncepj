<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include "../../dbconnect/dbconnect.php";

$data = json_decode(file_get_contents("php://input"), true);
$orderId = $data['orderId'] ?? null;
$method = $data['method'] ?? 'qr';
$amount = $data['amount'] ?? 0;

if ($orderId) {
    // Advancing status to 2 (Paid/New Order) so the shop can see it
    $stmt = $conn->prepare("UPDATE tbl_order SET OdrStatus = 2 WHERE OdrId = ? AND OdrStatus = 1");
    $stmt->bind_param("i", $orderId);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'ชำระเงินเรียบร้อย ออเดอร์กำลังส่งไปที่ร้านค้า']);
    } else {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการอัปเดตสถานะ']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Order ID missing']);
}
?>
