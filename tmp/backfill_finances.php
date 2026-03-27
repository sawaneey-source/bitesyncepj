<?php
include "dbconnect/dbconnect.php";

echo "--- BACKFILLING RIDER BALANCES ---\n";
$riders = $conn->query("SELECT RiderId FROM tbl_rider");
while($r = $riders->fetch_assoc()) {
    $rid = $r['RiderId'];
    $q = $conn->query("SELECT SUM(OdrDelFee) as total FROM tbl_order WHERE RiderId = $rid AND OdrStatus = 6");
    $total = (float)$q->fetch_assoc()['total'];
    if ($total > 0) {
        $conn->query("UPDATE tbl_rider SET RiderTotalSettled = $total WHERE RiderId = $rid");
        echo "Rider ID $rid: Set TotalSettled to $total\n";
    }
}

echo "\n--- BACKFILLING SHOP BALANCES ---\n";
// GP is 25%, so shop gets 75%
$shops = $conn->query("SELECT ShopId FROM tbl_shop");
while($s = $shops->fetch_assoc()) {
    $sid = $s['ShopId'];
    $q = $conn->query("SELECT SUM(OdrFoodPrice) as total FROM tbl_order WHERE ShopId = $sid AND OdrStatus = 6");
    $gross = (float)$q->fetch_assoc()['total'];
    $net = $gross * 0.75;
    if ($net > 0) {
        $conn->query("UPDATE tbl_shop SET ShopTotalSettled = $net WHERE ShopId = $sid");
        echo "Shop ID $sid: Set TotalSettled to $net (from Gross $gross)\n";
    }
}

echo "\nDone backfill.\n";
?>
