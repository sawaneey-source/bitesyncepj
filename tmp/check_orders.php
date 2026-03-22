<?php
include "dbconnect/dbconnect.php";
$tables = ['tbl_order', 'tbl_orders', 'tbl_customer_order'];
foreach($tables as $t) {
    echo "\n--- Table: $t ---\n";
    $res = $conn->query("DESCRIBE $t");
    if($res) {
        while($row = $res->fetch_assoc()) {
            print_r($row);
        }
    } else {
        echo "Table does not exist.\n";
    }
}
?>
