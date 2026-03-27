<?php
include "dbconnect/dbconnect.php";
$res = $conn->query("SELECT OdrId, OdrDelFee, OdrRiderFee FROM tbl_order WHERE RiderId = 1 AND OdrStatus = 6 LIMIT 5");
echo "ORDER DATA:\n";
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
