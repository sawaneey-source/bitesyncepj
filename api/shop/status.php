<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$data = json_decode(file_get_contents("php://input"), true);
$usrId = $data['usrId'] ?? null;
$status = isset($data['status']) ? (int)$data['status'] : 1; // 1=Open, 0=Closed

if (!$usrId) {
    echo json_encode(["success" => false, "message" => "User ID required"]);
    exit();
}

// If trying to close (status=0), check for active orders
if ($status === 0) {
    // Check for orders with status: 2(Pending), 3(Preparing), 4(Ready), 5(Delivering)
    $checkSql = "SELECT COUNT(*) as active FROM tbl_order o 
                JOIN tbl_shop s ON o.ShopId = s.ShopId 
                WHERE s.UsrId = ? AND o.OdrStatus IN (2, 3, 4, 5)";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $usrId);
    $checkStmt->execute();
    $activeCount = $checkStmt->get_result()->fetch_assoc()['active'];

    if ($activeCount > 0) {
        echo json_encode([
            "success" => false, 
            "message" => "Cannot close shop while there are active orders.",
            "activeCount" => $activeCount
        ]);
        exit();
    }
}

$sql = "UPDATE tbl_shop SET ShopStatus = ? WHERE UsrId = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $status, $usrId);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "status" => $status]);
} else {
    echo json_encode(["success" => false, "message" => $conn->error]);
}

$conn->close();
?>
