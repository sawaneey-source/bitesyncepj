<?php
include "dbconnect/dbconnect.php";
$res = $conn->query("DESCRIBE tbl_food");
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
