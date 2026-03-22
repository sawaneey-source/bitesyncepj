<?php
include "dbconnect/dbconnect.php";
$tables = ['tbl_userinfo', 'tbl_address', 'tbl_user_address'];
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
