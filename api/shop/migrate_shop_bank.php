<?php
include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$sql1 = "ALTER TABLE tbl_shop ADD COLUMN IF NOT EXISTS ShopBankName VARCHAR(100) AFTER ShopPrepTime";
$sql2 = "ALTER TABLE tbl_shop ADD COLUMN IF NOT EXISTS ShopBankAccount VARCHAR(50) AFTER ShopBankName";

$res1 = $conn->query($sql1);
$res2 = $conn->query($sql2);

if ($res1 && $res2) {
    echo json_encode(["success" => true, "message" => "Added Bank columns to tbl_shop"]);
} else {
    echo json_encode(["success" => false, "message" => $conn->error]);
}
?>
