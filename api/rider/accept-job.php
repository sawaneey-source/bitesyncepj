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
$rawOrderId = $data['orderId'] ?? '';
// Clean up ID if it came from the UI as "#1025"
$orderId = (int)str_replace('#', '', $rawOrderId);
$usrIdFromFrontend = $data['riderId'] ?? 0;

if (!$orderId || !$usrIdFromFrontend) {
    echo json_encode(['success' => false, 'message' => 'Missing order or user ID']);
    exit();
}

// 0. Find the actual RiderId and Check Status
$rStmt = $conn->prepare("SELECT RiderId, RiderStatus FROM tbl_rider WHERE UsrId = ?");
$rStmt->bind_param("i", $usrIdFromFrontend);
$rStmt->execute();
$rRes = $rStmt->get_result();
if ($rRow = $rRes->fetch_assoc()) {
    $actualRiderId = $rRow['RiderId'];
    if ($rRow['RiderStatus'] !== 'Online') {
        echo json_encode(['success' => false, 'message' => 'กรุณาเปิดสถานะ Online ก่อนรับงานครับ']);
        exit();
    }
} else {
    echo json_encode(['success' => false, 'message' => 'โปรไฟล์ไรเดอร์ไม่สมบูรณ์ (Rider not found)']);
    exit();
}

// 1. Check if this rider already has an active job
$activeSql = "SELECT OdrId FROM tbl_order WHERE RiderId = ? AND OdrStatus IN (3, 4, 5) LIMIT 1";
$activeStmt = $conn->prepare($activeSql);
$activeStmt->bind_param("i", $actualRiderId);
$activeStmt->execute();
if ($activeStmt->get_result()->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'คุณมีงานที่ยังทำไม่เสร็จอยู่! กรุณาส่งงานปัจจุบันให้เสร็จก่อนรับงานใหม่ครับ']);
    exit();
}

// 2. Check if the job is still available
$checkSql = "SELECT OdrStatus, RiderId FROM tbl_order WHERE OdrId = ? FOR UPDATE";
$checkStmt = $conn->prepare($checkSql);
if (!$checkStmt) {
    echo json_encode(['success' => false, 'message' => 'DB Error']);
    exit();
}
$checkStmt->bind_param("i", $orderId);
$checkStmt->execute();
$res = $checkStmt->get_result();

if ($row = $res->fetch_assoc()) {
    if ($row['OdrStatus'] != 4) {
        echo json_encode(['success' => false, 'message' => 'ออเดอร์นี้ยังไม่พร้อมสำหรับการจัดส่งครับ']);
        exit();
    }
    if (!empty($row['RiderId']) && $row['RiderId'] != 0) {
        echo json_encode(['success' => false, 'message' => 'เสียใจด้วย ไรเดอร์ท่านอื่นรับงานนี้ไปแล้ว!']);
        exit();
    }

    // 2. Assign the job
    // Keeps status as 3 (Ready / At shop), but assigns actual RiderId
    $updateStmt = $conn->prepare("UPDATE tbl_order SET RiderId = ? WHERE OdrId = ?");
    $updateStmt->bind_param("ii", $actualRiderId, $orderId);
    
    if ($updateStmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Assigned successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to assign job: ' . $conn->error]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Order not found']);
}
?>
