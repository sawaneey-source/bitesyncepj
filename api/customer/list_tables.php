<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
$res = $conn->query("DESC tbl_userinfo");
$cols = [];
while($r = $res->fetch_assoc()) $cols[] = $r['Field'];
echo json_encode($cols);
?>
