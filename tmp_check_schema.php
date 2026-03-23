<?php
include "dbconnect/dbconnect.php";
$tables = ["tbl_shop", "tbl_userinfo", "tbl_order", "tbl_address"];
foreach ($tables as $t) {
    echo "\nTable: $t\n";
    $res = $conn->query("DESCRIBE $t");
    if ($res) {
        while($row = $res->fetch_assoc()) {
            echo $row['Field'] . " - " . $row['Type'] . "\n";
        }
    } else {
        echo "Error: " . $conn->error . "\n";
    }
}
?>
