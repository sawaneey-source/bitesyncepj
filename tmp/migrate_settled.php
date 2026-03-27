<?php
include "dbconnect/dbconnect.php";
if ($conn->query("ALTER TABLE tbl_rider ADD COLUMN RiderTotalSettled DECIMAL(10,2) DEFAULT 0.00 AFTER RiderBalance")) {
    echo "SUCCESS: Added RiderTotalSettled column\n";
} else {
    echo "ERROR: " . $conn->error . "\n";
}

if ($conn->query("ALTER TABLE tbl_shop ADD COLUMN ShopTotalSettled DECIMAL(10,2) DEFAULT 0.00 AFTER ShopBalance")) {
    echo "SUCCESS: Added ShopTotalSettled column\n";
} else {
    echo "ERROR: " . $conn->error . "\n";
}
?>
