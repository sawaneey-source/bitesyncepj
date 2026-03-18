<?php
include "dbconnect/dbconnect.php";
$sql = "ALTER TABLE tbl_food ADD COLUMN FoodPrepTime INT DEFAULT 30 AFTER FoodPrice";
if ($conn->query($sql) === TRUE) {
    echo "Column FoodPrepTime added to tbl_food successfully.";
} else {
    echo "Error updating table: " . $conn->error;
}
$conn->close();
?>
