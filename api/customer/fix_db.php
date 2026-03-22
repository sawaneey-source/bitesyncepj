<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';

// Fix tbl_userinfo
$conn->query("ALTER TABLE tbl_userinfo ADD COLUMN UsrImage VARCHAR(255) DEFAULT NULL AFTER UsrRole");
$conn->query("ALTER TABLE tbl_userinfo ADD COLUMN UsrAddress TEXT DEFAULT NULL AFTER UsrImage");

// Fix tbl_address
$conn->query("ALTER TABLE tbl_address ADD COLUMN UsrId INT(11) DEFAULT NULL AFTER AdrId");
$conn->query("ALTER TABLE tbl_address ADD COLUMN IsDefault TINYINT(1) DEFAULT 0 AFTER AdrLng");

echo json_encode(["success"=>true, "message"=>"Database schema updated successfully"]);
?>
