<?php
include "c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== TABLE STRUCTURE: tbl_rider ===\n";
$res = $conn->query("DESCRIBE tbl_rider");
while($row = $res->fetch_assoc()) {
    echo "Field: {$row['Field']} | Type: {$row['Type']} | Null: {$row['Null']} | Key: {$row['Key']} | Default: {$row['Default']}\n";
}

$conn->close();
?>
