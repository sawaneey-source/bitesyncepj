<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

// 1. All Customers
$users = [];
$res = $conn->query("SELECT UsrId, UsrFullName, UsrEmail, UsrPhone, UsrRole, UsrStatus, UsrCreatedAt FROM tbl_userinfo WHERE UsrRole = 'customer' ORDER BY UsrId DESC");
while($row = $res->fetch_assoc()) $users[] = $row;

// 2. All Shops
$shops = [];
$res = $conn->query("
    SELECT s.*, u.UsrFullName as owner, u.UsrStatus as ownerStatus,
           (SELECT COALESCE(SUM(OdrFoodPrice), 0) FROM tbl_order WHERE ShopId = s.ShopId AND OdrStatus = 6) as totalGross,
           (SELECT COALESCE(SUM(OdrFoodPrice - OdrGP), 0) FROM tbl_order WHERE ShopId = s.ShopId AND OdrStatus = 6) as totalNet
    FROM tbl_shop s 
    LEFT JOIN tbl_userinfo u ON s.UsrId = u.UsrId 
    ORDER BY s.ShopId DESC");
while($row = $res->fetch_assoc()) $shops[] = $row;

// 3. All Riders
$riders = [];
$res = $conn->query("
    SELECT r.*, u.UsrFullName as name, u.UsrPhone as phone, u.UsrStatus as riderStatus,
           (SELECT COALESCE(SUM(OdrDelFee), 0) FROM tbl_order WHERE RiderId = r.RiderId AND OdrStatus = 6) as totalGross,
           (SELECT COALESCE(SUM(OdrRiderFee), 0) FROM tbl_order WHERE RiderId = r.RiderId AND OdrStatus = 6) as totalNet
    FROM tbl_rider r 
    LEFT JOIN tbl_userinfo u ON r.UsrId = u.UsrId 
    ORDER BY r.RiderId DESC");
while($row = $res->fetch_assoc()) $riders[] = $row;

echo json_encode([
    'success' => true, 
    'users' => $users,
    'shops' => $shops,
    'riders' => $riders
]);
?>
