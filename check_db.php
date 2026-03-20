<?php
require 'dbconnect/dbconnect.php';
$res = $conn->query("SELECT UsrId, ShopId, ShopLogoPath, ShopBannerPath FROM tbl_shop LIMIT 5");
$data = [];
while($row = $res->fetch_assoc()) {
    $data[] = $row;
}
echo json_encode($data, JSON_PRETTY_PRINT);
?>
