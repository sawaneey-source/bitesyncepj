<?php
require 'dbconnect/dbconnect.php';
if ($conn->query('ALTER TABLE tbl_userinfo ADD COLUMN UsrImageOri VARCHAR(255) DEFAULT NULL')) {
    echo "Column added successfully";
} else {
    echo "Error adding column: " . $conn->error;
}
?>
