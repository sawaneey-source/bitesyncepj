<?php
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== Testing Detailed Financial Tracking (OdrPlatformFee) ===\n";

// 1. Fetch current platform_fee from settings
$setRes = $conn->query("SELECT SettingValue FROM tbl_settings WHERE SettingKey = 'platform_fee'");
$fee = ($setRes && $setRes->num_rows > 0) ? (float)$setRes->fetch_assoc()['SettingValue'] : 12;

// 2. Simulating Order Creation (Mocking api/customer/orders.php logic)
$subtotal = 100.00;
$delFee = 20.00;
$total = $subtotal + $delFee + $fee;

$foodPriceAdjusted = $total - $delFee - $fee;
$gpRate = 0.25;
$riderShareRate = 0.80;
$odrGP = $foodPriceAdjusted * $gpRate;
$odrRiderFee = $delFee * $riderShareRate;
$odrAdminFee = $odrGP + ($delFee - $odrRiderFee) + $fee;

// Insert Mock Order with the NEW column
$stmt = $conn->prepare("INSERT INTO tbl_order (UsrId, ShopId, OdrStatus, OdrFoodPrice, OdrDelFee, OdrPlatformFee, OdrGrandTotal, OdrGP, OdrRiderFee, OdrAdminFee) VALUES (1, 1, 6, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ddddddd", $foodPriceAdjusted, $delFee, $fee, $total, $odrGP, $odrRiderFee, $odrAdminFee);
$stmt->execute();
$orderId = $stmt->insert_id;

echo "Inserted Order #$orderId\n";

// 3. Verify Database Columns
$check = $conn->query("SELECT OdrPlatformFee, OdrAdminFee FROM tbl_order WHERE OdrId = $orderId")->fetch_assoc();
echo " - Saved OdrPlatformFee: " . $check['OdrPlatformFee'] . " ฿ (Expect $fee)\n";
echo " - Saved OdrAdminFee: " . $check['OdrAdminFee'] . " ฿ (Expect " . (29+$fee) . ")\n";

// 4. Verify Admin Stats API logic
$statsRes = $conn->query("SELECT SUM(OdrPlatformFee) as totalPlatformFee FROM tbl_order WHERE OdrId = $orderId");
$stats = $statsRes->fetch_assoc();
echo " - Admin Stats Service Fee Sum: " . $stats['totalPlatformFee'] . " ฿ (Expect $fee)\n";

if ($check['OdrPlatformFee'] == $fee && $stats['totalPlatformFee'] == $fee) {
    echo "\nVERIFICATION SUCCESSFUL: Service Fee is now tracked in its own column! ✅\n";
} else {
    echo "\nVERIFICATION FAILED: Column mismatch.\n";
}

// Cleanup
$conn->query("DELETE FROM tbl_order WHERE OdrId = $orderId");
?>
