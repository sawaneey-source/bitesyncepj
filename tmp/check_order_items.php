<?php
include "dbconnect/dbconnect.php";
$tables = ['tbl_order_detail', 'tbl_order_items', 'tbl_order_food'];
foreach($tables as $t) {
    echo "\n--- Table: $t ---\n";
    $res = $conn->query("DESCRIBE $t");
    if($res) {
        while($row = $res->fetch_assoc()) {
            print_r($row);
        }
    } else {
        echo "Table $t does not exist.\n";
    }
}
?>
