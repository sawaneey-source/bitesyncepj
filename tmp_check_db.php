<?php
require 'dbconnect/dbconnect.php';
$res = $conn->query("SHOW COLUMNS FROM tbl_order");
while($row = $res->fetch_assoc()) {
    echo $row['Field'] . " - " . $row['Type'] . "\n";
}
?>
