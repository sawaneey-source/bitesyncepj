<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
$res = $conn->query("DESC tbl_userinfo");
$data = [];
while($row = $res->fetch_assoc()) $data[] = $row;
echo json_encode($data);
?>
