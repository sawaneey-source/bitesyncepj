<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include "../../dbconnect/dbconnect.php";

$sql = "SELECT 
            COUNT(OdrId) as totalOrders,
            SUM(OdrFoodPrice) as totalFoodPrice,
            SUM(OdrDelFee) as totalDelFee,
            SUM(OdrGP) as totalGP,
            SUM(OdrRiderFee) as totalRiderFee,
            SUM(OdrAdminFee) as totalAdminProfit
        FROM tbl_order 
        WHERE OdrStatus IN (1, 2, 3, 4, 5, 6)"; // Exclude cancelled (7)

$res = $conn->query($sql);
$data = $res->fetch_assoc();

echo json_encode(['success' => true, 'data' => $data]);
?>
