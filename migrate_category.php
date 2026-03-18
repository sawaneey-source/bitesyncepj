<?php
include "dbconnect/dbconnect.php";
$sql = "ALTER TABLE tbl_shop MODIFY COLUMN ShopCatType VARCHAR(100) DEFAULT 'อาหารตามสั่ง'";
if ($conn->query($sql) === TRUE) {
    echo "Table tbl_shop successfully migrated.";
} else {
    echo "Error updating table: " . $conn->error;
}
$conn->close();
?>
