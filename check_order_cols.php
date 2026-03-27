<?php
include "dbconnect/dbconnect.php";
$result = $conn->query("DESCRIBE tbl_order");
while($row = $result->fetch_assoc()) {
    echo $row['Field'] . " - " . $row['Type'] . "\n";
}
$conn->close();
?>
