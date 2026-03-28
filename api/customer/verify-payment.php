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

$orderId = $_POST['orderId'] ?? 0;
$method  = $_POST['method'] ?? 'PromptPay';
$amount  = $_POST['amount'] ?? 0;

if (!$orderId || !isset($_FILES['slip'])) {
    echo json_encode(['success' => false, 'message' => 'Missing Order ID or Slip file']);
    exit();
}

// 1. Mock Verification Delay (2 seconds)
sleep(2);

// 2. Handle File Upload
$targetDir = "../../public/slips/";
$fileExt = pathinfo($_FILES["slip"]["name"], PATHINFO_EXTENSION);
$fileName = "slip_" . $orderId . "_" . time() . "." . $fileExt;
$targetFilePath = $targetDir . $fileName;

if (move_uploaded_file($_FILES["slip"]["tmp_name"], $targetFilePath)) {
    $dbPath = "/slips/" . $fileName;
    
    // 3. Update tbl_payment (Record the payment attempt)
    // Check if record exists
    $checkPmt = $conn->prepare("SELECT PmtId FROM tbl_payment WHERE OdrId = ?");
    $checkPmt->bind_param("i", $orderId);
    $checkPmt->execute();
    $pmtRes = $checkPmt->get_result();

    if ($pmtRes->num_rows > 0) {
        $stmt = $conn->prepare("UPDATE tbl_payment SET PmtMethod = ?, PmtSlipPath = ?, PmtAmount = ?, PmtStatus = 1 WHERE OdrId = ?");
        $stmt->bind_param("ssdi", $method, $dbPath, $amount, $orderId);
    } else {
        $stmt = $conn->prepare("INSERT INTO tbl_payment (OdrId, PmtMethod, PmtSlipPath, PmtAmount, PmtStatus) VALUES (?, ?, ?, ?, 1)");
        $stmt->bind_param("issd", $orderId, $method, $dbPath, $amount);
    }
    $stmt->execute();

    // 4. Update tbl_order Status to 2 (Paid / New Order)
    $updateOrder = $conn->prepare("UPDATE tbl_order SET OdrStatus = 2 WHERE OdrId = ?");
    $updateOrder->bind_param("i", $orderId);
    $updateOrder->execute();

    echo json_encode(['success' => true, 'message' => 'Payment verified successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to upload slip']);
}
?>
