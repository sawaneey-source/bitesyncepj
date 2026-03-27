<?php
include "dbconnect/dbconnect.php";
$res = $conn->query("SELECT * FROM tbl_rider");
echo "RIDERS IN TABLE:\n";
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
