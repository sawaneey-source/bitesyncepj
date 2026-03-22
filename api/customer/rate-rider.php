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
$orderId = $data['orderId'] ?? 0;
$rating = $data['rating'] ?? 0; // 1-5

if (!$orderId || !$rating || $rating < 1 || $rating > 5) {
    echo json_encode(['success' => false, 'message' => 'ข้อมูลไม่ถูกต้อง']);
    exit();
}

$conn->begin_transaction();

try {
    // 1. Get current order info to check if already rated and get RiderId
    $stmt = $conn->prepare("SELECT RiderId, RiderRating FROM tbl_order WHERE OdrId = ?");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $res = $stmt->get_result();
    $order = $res->fetch_assoc();

    if (!$order) {
        throw new Exception("ไม่พบออเดอร์");
    }

    if ($order['RiderRating'] !== null) {
        throw new Exception("คุณให้คะแนนออเดอร์นี้ไปแล้ว");
    }

    $riderId = $order['RiderId'];
    if (!$riderId) {
        throw new Exception("ออเดอร์นี้ไม่มีไรเดอร์");
    }

    // 2. Update order rating
    $updOrder = $conn->prepare("UPDATE tbl_order SET RiderRating = ? WHERE OdrId = ?");
    $updOrder->bind_param("ii", $rating, $orderId);
    $updOrder->execute();

    // 3. Update rider aggregate stats
    // We'll fetch current stats first to be precise
    $riderStmt = $conn->prepare("SELECT RiderRatingAvg, RiderRatingCount FROM tbl_rider WHERE RiderId = ?");
    $riderStmt->bind_param("i", $riderId);
    $riderStmt->execute();
    $riderData = $riderStmt->get_result()->fetch_assoc();

    $oldCount = $riderData['RiderRatingCount'] ?? 0;
    $oldAvg = $riderData['RiderRatingAvg'] ?? 0;

    $newCount = $oldCount + 1;
    $newAvg = (($oldAvg * $oldCount) + $rating) / $newCount;

    $updRider = $conn->prepare("UPDATE tbl_rider SET RiderRatingAvg = ?, RiderRatingCount = ? WHERE RiderId = ?");
    $updRider->bind_param("dii", $newAvg, $newCount, $riderId);
    $updRider->execute();

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'บันทึกคะแนนเรียบร้อยแล้ว']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
