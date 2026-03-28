<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
echo "--- Checking MySQL Triggers on tbl_order ---\n";
$res = $conn->query("SHOW TRIGGERS LIKE 'tbl_order'");
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
