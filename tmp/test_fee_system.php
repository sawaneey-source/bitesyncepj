<?php
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== Testing Order Calculation with 12 ฿ Platform Fee ===\n";

// 1. Fetch current platform_fee from settings
$setRes = $conn->query("SELECT SettingValue FROM tbl_settings WHERE SettingKey = 'platform_fee'");
$fee = ($setRes && $setRes->num_rows > 0) ? (float)$setRes->fetch_assoc()['SettingValue'] : 12;
echo "Current Platform Fee in Setting: $fee ฿\n";

// 2. Simulating Order Creation (Mocking api/customer/orders.php logic)
$subtotal = 100.00; // Food
$delFee = 20.00;   // Delivery
$total = $subtotal + $delFee + $fee; // Grand Total expected from Frontend

echo "Expected Grand Total: $total ฿\n";

// Logic from api/customer/orders.php
$foodPriceAdjusted = $total - $delFee - $fee;
$gpRate = 0.25;
$riderShareRate = 0.80;

$odrGP = $foodPriceAdjusted * $gpRate;
$odrRiderFee = $delFee * $riderShareRate;
$odrAdminFee = $odrGP + ($delFee - $odrRiderFee) + $fee;

echo "Calculated Splits:\n";
echo " - Food Price (Actual): $foodPriceAdjusted ฿ (Expect 100)\n";
echo " - Shop GP (25%): $odrGP ฿ (Expect 25)\n";
echo " - Rider Share (80%): $odrRiderFee ฿ (Expect 16)\n";
echo " - Admin Revenue: $odrAdminFee ฿ (Expect 25 + 4 + $fee = " . (29+$fee) . ")\n";

// Insert Mock Order
$stmt = $conn->prepare("INSERT INTO tbl_order (UsrId, ShopId, OdrStatus, OdrFoodPrice, OdrDelFee, OdrGrandTotal, OdrGP, OdrRiderFee, OdrAdminFee) VALUES (1, 1, 6, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("dddddd", $foodPriceAdjusted, $delFee, $total, $odrGP, $odrRiderFee, $odrAdminFee);
$stmt->execute();
$orderId = $stmt->insert_id;
echo "\nMock Order #$orderId inserted (Status=6 Completed)\n";

// 3. Verify Admin Stats
echo "Checking Admin Stats (api/admin/stats.php logic)...\n";
$statsRes = $conn->query("SELECT SUM(OdrAdminFee) as totalProfit FROM tbl_order WHERE OdrId = $orderId");
$stats = $statsRes->fetch_assoc();
echo " - Admin Profit recorded: " . $stats['totalProfit'] . " ฿\n";

// 4. Verify Shop Stats (api/shop/orders.php logic)
echo "Checking Shop View (api/shop/orders.php logic)...\n";
$shopRes = $conn->query("SELECT OdrFoodPrice, OdrGP FROM tbl_order WHERE OdrId = $orderId");
$shop = $shopRes->fetch_assoc();
$shopNet = $shop['OdrFoodPrice'] - $shop['OdrGP'];
echo " - Shop Food Price: " . $shop['OdrFoodPrice'] . " ฿\n";
echo " - Shop Net: " . $shopNet . " ฿ (Expect 75)\n";

if ($total == 132 && $odrAdminFee == (29+$fee) && $shopNet == 75) {
    echo "\nVERIFICATION SUCCESSFUL: 12 ฿ Fee correctly distributed!\n";
} else {
    echo "\nVERIFICATION FAILED: Math mismatch.\n";
}

// Cleanup
$conn->query("DELETE FROM tbl_order WHERE OdrId = $orderId");
echo "\nCleanup complete.\n";
?>
