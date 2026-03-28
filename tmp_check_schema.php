<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
echo "--- tbl_order schema ---\n";
$res = $conn->query("DESCRIBE tbl_order");
while($row = $res->fetch_assoc()) {
    if(in_array($row['Field'], ['OdrShopSettled', 'OdrRiderSettled', 'OdrStatus'])) {
        echo "Field: " . $row['Field'] . " | Type: " . $row['Type'] . " | Default: " . ($row['Default'] === null ? 'NULL' : $row['Default']) . "\n";
    }
}
?>
