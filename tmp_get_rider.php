<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
$res = $conn->query("SELECT UsrUsername FROM tbl_userinfo WHERE UsrRole = 'rider' LIMIT 1");
if($res) echo $res->fetch_assoc()['UsrUsername'];
?>
