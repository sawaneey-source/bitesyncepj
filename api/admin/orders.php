<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

$sql = "SELECT o.*, u.UsrFullName as customer, s.ShopName, ru.UsrFullName as riderName
        FROM tbl_order o
        LEFT JOIN tbl_userinfo u ON o.UsrId = u.UsrId
        LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
        LEFT JOIN tbl_rider r ON o.RiderId = r.RiderId
        LEFT JOIN tbl_userinfo ru ON r.UsrId = ru.UsrId
        ORDER BY o.OdrId DESC";

$res = $conn->query($sql);
$orders = [];
while($row = $res->fetch_assoc()) {
    $orders[] = $row;
}

echo json_encode(['success' => true, 'data' => $orders]);
?>
