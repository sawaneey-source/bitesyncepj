<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
$r=$conn->query('SELECT UsrId, ShopId, ShopName FROM tbl_shop');
while($row=$r->fetch_assoc()) echo json_encode($row) . "\n";
?>
