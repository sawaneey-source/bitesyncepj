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
$orderId = (int)str_replace('#', '', $rawOrderId);
$usrIdFromFrontend = $data['riderId'] ?? 0;

if (!$orderId || !$usrIdFromFrontend) {
    echo json_encode(['success' => false, 'message' => 'Missing order or user ID']);
    exit();
}

// 1. Find actual RiderId from UsrId
$rStmt = $conn->prepare("SELECT RiderId FROM tbl_rider WHERE UsrId = ?");
$rStmt->bind_param("i", $usrIdFromFrontend);
$rStmt->execute();
$rRes = $rStmt->get_result();
if ($rRow = $rRes->fetch_assoc()) {
    $actualRiderId = $rRow['RiderId'];
} else {
    echo json_encode(['success' => false, 'message' => 'Rider not found']);
    exit();
}

// 2. Unassign the job logically: clear RiderId, ensure Status is 3 so others can pick it up
$updateStmt = $conn->prepare("UPDATE tbl_order SET RiderId = NULL, OdrStatus = 3 WHERE OdrId = ? AND RiderId = ?");
$updateStmt->bind_param("ii", $orderId, $actualRiderId);

if ($updateStmt->execute()) {
    if ($updateStmt->affected_rows > 0) {
        // 3. Log the cancellation so this rider cannot see/pick this job again
        $logStmt = $conn->prepare("INSERT INTO tbl_order_cancel_history (OdrId, RiderId) VALUES (?, ?)");
        $logStmt->bind_param("ii", $orderId, $actualRiderId);
        $logStmt->execute();

        // 4. Update Rider Statistics (Cancel Rate) in DB
        // formula: cancels / (cancels + completed)
        $qComp = $conn->prepare("SELECT COUNT(*) as completed FROM tbl_order WHERE RiderId = ? AND OdrStatus = 6");
        $qComp->bind_param("i", $actualRiderId); $qComp->execute();
        $completedCount = (int)($qComp->get_result()->fetch_assoc()['completed'] ?? 0);
        
        $qCan = $conn->prepare("SELECT COUNT(*) as cancels FROM tbl_order_cancel_history WHERE RiderId = ?");
        $qCan->bind_param("i", $actualRiderId); $qCan->execute();
        $cancelCount = (int)($qCan->get_result()->fetch_assoc()['cancels'] ?? 0);
        
        $totalEngagements = $completedCount + $cancelCount;
        $newCancelRate = ($totalEngagements > 0) ? round(($cancelCount / $totalEngagements) * 100, 2) : 0;
        $newAcceptRate = 100 - $newCancelRate;
        
        $uRate = $conn->prepare("UPDATE tbl_rider SET RiderCancelRate = ?, RiderAcceptRate = ? WHERE RiderId = ?");
        $uRate->bind_param("ddi", $newCancelRate, $newAcceptRate, $actualRiderId);
        $uRate->execute();

        echo json_encode(['success' => true, 'message' => 'ยกเลิกงานเรียบร้อยแล้ว งานนี้จะถูกส่งต่อให้ไรเดอร์ท่านอื่น']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Order not found or not assigned to you']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to unassign job: ' . $conn->error]);
}
?>
