<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
$conn->query("UPDATE tbl_order SET OdrShopSettled = 0, OdrRiderSettled = 0 WHERE OdrStatus = 6");
echo "RESEST SUCCESS: All completed orders are now PENDING.";
?>
