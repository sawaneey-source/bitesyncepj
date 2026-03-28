<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
echo "--- Last 5 Orders Settlement Check ---\n";
$sql = "SELECT OdrId, OdrStatus, OdrRiderSettled, OdrShopSettled, OdrCreatedAt FROM tbl_order ORDER BY OdrId DESC LIMIT 5";
$res = $conn->query($sql);
while($row = $res->fetch_assoc()) {
    echo "ID: #" . $row['OdrId'] . " | Status: " . $row['OdrStatus'] . " | RiderSettled: " . $row['OdrRiderSettled'] . " | ShopSettled: " . $row['OdrShopSettled'] . " | Time: " . $row['OdrCreatedAt'] . "\n";
}
?>
