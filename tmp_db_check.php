<?php
include "c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== RIDER STATUS ===\n";
$res = $conn->query("SELECT UsrId, RiderStatus, RiderLat, RiderLng FROM tbl_rider");
while($row = $res->fetch_assoc()) {
    echo "User ID: {$row['UsrId']} | Status: {$row['RiderStatus']} | Lat: {$row['RiderLat']} | Lng: {$row['RiderLng']}\n";
}

echo "\n=== ORDERS (STATUS 4) ===\n";
$res = $conn->query("SELECT OdrId, RiderId, OdrStatus, ShopId FROM tbl_order WHERE OdrStatus = 4");
while($row = $res->fetch_assoc()) {
    echo "Order ID: {$row['OdrId']} | RiderId: {$row['RiderId']} | Status: {$row['OdrStatus']} | ShopId: {$row['ShopId']}\n";
}

$conn->close();
?>
