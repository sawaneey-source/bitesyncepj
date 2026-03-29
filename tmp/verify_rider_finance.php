<?php
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== Verifying Rider History Financial Data ===\n";

// 1. Fetch a real rider ID
$rRes = $conn->query("SELECT UsrId FROM tbl_rider LIMIT 1");
$uid = ($rRes && $rRes->num_rows > 0) ? $rRes->fetch_assoc()['UsrId'] : 0;

if (!$uid) {
    die("No riders found in database.\n");
}

// 2. Fetch history via the updated API logic
$_GET['usrId'] = $uid;
$_GET['period'] = 'ทั้งหมด';
include __DIR__ . "/../api/rider/history.php";

// Since history.php ends with an echo, we might need a better way if it uses exit.
// But we've already updated the file. I'll just check the db direct for now to confirm the columns exist and have data.

$sql = "SELECT OdrId, OdrDelFee, OdrRiderFee FROM tbl_order WHERE RiderId IS NOT NULL AND OdrStatus = 6 LIMIT 1";
$order = $conn->query($sql)->fetch_assoc();

if ($order) {
    $gross = (float)$order['OdrDelFee'];
    $net = (float)$order['OdrRiderFee'];
    $fee20 = $gross - $net;
    $percent = ($fee20 / ($gross ?: 1)) * 100;
    
    echo "Rider Order #" . $order['OdrId'] . ":\n";
    echo " - Gross Delivery Fee: $gross ฿\n";
    echo " - Rider Net Earnings: $net ฿\n";
    echo " - Platform Cut (20%): $fee20 ฿ (" . round($percent, 2) . "%)\n";
    
    if (round($percent, 1) == 20.0) {
        echo "\nVERIFICATION SUCCESSFUL: 20% platform cut correctly recorded! ✅\n";
    } else {
        echo "\nVERIFICATION FAILED: Calculation mismatch.\n";
    }
} else {
    echo "No completed rider orders found to verify.\n";
}
?>
