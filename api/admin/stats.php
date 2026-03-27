<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include "../../dbconnect/dbconnect.php";

$sql = "SELECT 
            COUNT(OdrId) as totalOrders,
            COALESCE(SUM(OdrFoodPrice), 0) as totalFoodPrice,
            COALESCE(SUM(OdrDelFee), 0) as totalDelFee,
            COALESCE(SUM(CASE WHEN OdrShopSettled = 1 THEN OdrGP ELSE 0 END), 0) as totalGP,
            COALESCE(SUM(CASE WHEN OdrRiderSettled = 1 THEN OdrRiderFee ELSE 0 END), 0) as totalRiderFee,
            COALESCE(SUM(CASE WHEN OdrShopSettled = 1 AND OdrRiderSettled = 1 THEN OdrAdminFee ELSE 0 END), 0) as totalAdminProfit,
            (SELECT COALESCE(SUM(OdrDelFee), 0) FROM tbl_order WHERE OdrStatus = 6 AND RiderId IS NOT NULL AND RiderId > 0) as totalRiderGross,
            (SELECT COALESCE(SUM(CASE WHEN OdrRiderSettled = 1 THEN OdrRiderFee ELSE 0 END), 0) FROM tbl_order WHERE OdrStatus = 6 AND RiderId IS NOT NULL AND RiderId > 0) as totalRiderNet
        FROM tbl_order 
        WHERE OdrStatus = 6"; 

$res = $conn->query($sql);
$data = $res->fetch_assoc();

// Add User Counts
$data['shopCount']     = $conn->query("SELECT COUNT(*) as cnt FROM tbl_shop")->fetch_assoc()['cnt'];
$data['riderCount']    = $conn->query("SELECT COUNT(*) as cnt FROM tbl_rider")->fetch_assoc()['cnt'];
$data['customerCount'] = $conn->query("SELECT COUNT(*) as cnt FROM tbl_userinfo WHERE UsrRole = 'customer'")->fetch_assoc()['cnt'];

// Add Total Pending Balances (The "Real Money" currently in the system)
$data['totalPendingShop']  = $conn->query("SELECT COALESCE(SUM(ShopBalance), 0) as cnt FROM tbl_shop")->fetch_assoc()['cnt'];
$data['totalPendingRider'] = $conn->query("SELECT COALESCE(SUM(RiderBalance), 0) as cnt FROM tbl_rider")->fetch_assoc()['cnt'];

echo json_encode(['success' => true, 'data' => $data]);
?>
