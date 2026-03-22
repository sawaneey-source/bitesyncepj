<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
$res = $conn->query("SELECT a.* FROM tbl_order o JOIN tbl_address a ON o.AdrId = a.AdrId WHERE o.UsrId = 13 ORDER BY o.OdrId DESC LIMIT 1");
echo json_encode($res->fetch_assoc());
?>
