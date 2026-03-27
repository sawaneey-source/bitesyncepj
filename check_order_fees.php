<?php
include "dbconnect/dbconnect.php";
$result = $conn->query("SELECT COUNT(*) as count FROM tbl_order WHERE OdrGP > 0 OR OdrRiderFee > 0");
$row = $result->fetch_assoc();
echo "Orders with GP/Fee: " . $row['count'] . "\n";
$conn->close();
?>
