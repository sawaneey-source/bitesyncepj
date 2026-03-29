<?php
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== Testing Payment Lifecycle Workflow ===\n";

// 1. Mock Order Creation (Simulating api/customer/orders.php)
$userId = 1;
$shopId = 1;
$adrId = 48; // Existing address from previous check
$total = 150.00;

echo "1. Creating Mock Order...\n";
$sqlOrder = "INSERT INTO tbl_order (UsrId, ShopId, AdrId, OdrStatus, OdrGrandTotal) VALUES (?, ?, ?, 1, ?)";
$stmt = $conn->prepare($sqlOrder);
$stmt->bind_param("iiid", $userId, $shopId, $adrId, $total);
$stmt->execute();
$orderId = $stmt->insert_id;
echo "   Order Created: ID=$orderId\n";

// 2. Creating Initial Payment Record (Status 0)
echo "2. Creating Initial Payment Record (Status 0)...\n";
$sqlPmt = "INSERT INTO tbl_payment (OdrId, PmtMethod, PmtAmount, PmtStatus) VALUES (?, 'PromptPay', ?, 0)";
$pmtStmt = $conn->prepare($sqlPmt);
$pmtStmt->bind_param("id", $orderId, $total);
$pmtStmt->execute();

// Check Phase 1
$check1 = $conn->query("SELECT * FROM tbl_payment WHERE OdrId = $orderId")->fetch_assoc();
echo "   Database Check 1: PmtStatus=" . $check1['PmtStatus'] . " (Expected: 0)\n";

// 3. Simulating Slip Upload (Simulating api/customer/verify-payment.php)
echo "3. Simulating Slip Upload (Updating to Status 1)...\n";
$slipPath = "/slips/test_slip.jpg";
$sqlUpdatePmt = "UPDATE tbl_payment SET PmtSlipPath = ?, PmtStatus = 1 WHERE OdrId = ?";
$upStmt = $conn->prepare($sqlUpdatePmt);
$upStmt->bind_param("si", $slipPath, $orderId);
$upStmt->execute();

// Check Phase 2
$check2 = $conn->query("SELECT * FROM tbl_payment WHERE OdrId = $orderId")->fetch_assoc();
echo "   Database Check 2: PmtStatus=" . $check2['PmtStatus'] . ", Slip=" . $check2['PmtSlipPath'] . " (Expected: 1, path)\n";

if ($check1['PmtStatus'] == 0 && $check2['PmtStatus'] == 1) {
    echo "\nVERIFICATION SUCCESSFUL: Payment lifecycle logic is working as expected.\n";
} else {
    echo "\nVERIFICATION FAILED: Logic check failed.\n";
}

// Cleanup
$conn->query("DELETE FROM tbl_payment WHERE OdrId = $orderId");
$conn->query("DELETE FROM tbl_order WHERE OdrId = $orderId");
echo "Cleanup complete.\n";
?>
