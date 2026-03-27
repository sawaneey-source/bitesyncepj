<?php
include "dbconnect/dbconnect.php";
$res = $conn->query("SELECT OdrId, OdrCreatedAt, OdrUpdatedAt FROM tbl_order ORDER BY OdrId ASC LIMIT 10");
echo "OLDEST ORDERS:\n";
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
