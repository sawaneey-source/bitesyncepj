<?php
include "c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== FIXING RiderStatus COLUMN ===\n";

// 1. Alter table to VARCHAR
$sql1 = "ALTER TABLE tbl_rider MODIFY COLUMN RiderStatus VARCHAR(20) DEFAULT 'Offline'";
if ($conn->query($sql1)) {
    echo "Column type changed to VARCHAR(20).\n";
} else {
    echo "Error changing column type: " . $conn->error . "\n";
}

// 2. Map existing numeric values to strings
$conn->query("UPDATE tbl_rider SET RiderStatus = 'Offline' WHERE RiderStatus = '0'");
$conn->query("UPDATE tbl_rider SET RiderStatus = 'Online' WHERE RiderStatus = '1'");

echo "Data migration complete.\n";

$conn->close();
?>
