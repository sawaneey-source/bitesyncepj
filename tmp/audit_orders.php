<?php
include "dbconnect/dbconnect.php";

echo "--- SYSTEM TIME ---\n";
$res = $conn->query("SELECT NOW() as now, CURDATE() as curdate");
print_r($res->fetch_assoc());

echo "\n--- ORDER DATA (LAST 10) ---\n";
// Trying OdrCreatedAt instead of OdrDate
$res = $conn->query("SELECT OdrId, OdrCreatedAt, OdrUpdatedAt, OdrStatus, OdrDelFee FROM tbl_order WHERE RiderId = 1 ORDER BY OdrId DESC LIMIT 10");
while($row = $res->fetch_assoc()) {
    print_r($row);
}

echo "\n--- STATS CHECK (3 DAYS) ---\n";
$res = $conn->query("SELECT COUNT(*) as cnt, SUM(OdrDelFee) as sum_module FROM tbl_order WHERE RiderId = 1 AND OdrStatus = 6 AND DATE(OdrUpdatedAt) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)");
print_r($res->fetch_assoc());

echo "\n--- RAW DATA FOR 3 DAYS ---\n";
$res = $conn->query("SELECT OdrId, OdrUpdatedAt, OdrDelFee FROM tbl_order WHERE RiderId = 1 AND OdrStatus = 6 AND DATE(OdrUpdatedAt) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)");
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
