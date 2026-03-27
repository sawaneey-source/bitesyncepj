<?php
$c = new mysqli('localhost', 'root', '', 'bitesync');
if ($c->connect_error) die("Connection failed: " . $c->connect_error);
$r = $c->query('SELECT UsrId, UsrFullName, UsrImagePath FROM tbl_userinfo WHERE UsrImagePath IS NOT NULL LIMIT 10');
while($row = $r->fetch_assoc()) {
    echo "ID: " . $row['UsrId'] . " | Name: " . $row['UsrFullName'] . " | Path: [" . $row['UsrImagePath'] . "]\n";
}
$c->close();
?>
