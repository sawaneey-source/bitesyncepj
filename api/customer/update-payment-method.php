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

$data = json_decode(file_get_contents("php://input"), true);
$orderId = $data['orderId'] ?? null;
$method  = $data['method'] ?? 'PromptPay';

// Map frontend keys to DB values
if ($method === 'qr') $method = 'PromptPay';
if ($method === 'bank') $method = 'BankTransfer';

if (!$orderId) {
    echo json_encode(['success' => false, 'message' => 'Missing Order ID']);
    exit();
}

try {
    $stmt = $conn->prepare("UPDATE tbl_payment SET PmtMethod = ? WHERE OdrId = ?");
    $stmt->bind_param("si", $method, $orderId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Payment method updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update payment method']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
