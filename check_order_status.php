<?php
include "dbconnect/dbconnect.php";
$result = $conn->query("SELECT OdrStatus, COUNT(*) as count FROM tbl_order GROUP BY OdrStatus");
while($row = $result->fetch_assoc()) {
    echo "Status: " . $row['OdrStatus'] . " | Count: " . $row['count'] . "\n";
}
$conn->close();
?>
