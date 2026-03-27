<?php
include "c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== CANCEL HISTORY (User 12) ===\n";
$res = $conn->query("SELECT * FROM tbl_order_cancel_history WHERE RiderId = (SELECT RiderId FROM tbl_rider WHERE UsrId = 12)");
while($row = $res->fetch_assoc()) {
    echo "OdrId: {$row['OdrId']} | Reason: {$row['CancelReason']}\n";
}

$conn->close();
?>
