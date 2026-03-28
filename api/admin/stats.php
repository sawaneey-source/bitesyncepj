<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include "../../dbconnect/dbconnect.php";

$sql = "SELECT 
            COUNT(OdrId) as totalOrders,
            COALESCE(SUM(OdrFoodPrice), 0) as totalFoodPrice,
            COALESCE(SUM(OdrDelFee), 0) as totalDelFee,
            
            -- Settled Amounts (Realized Profit)
            COALESCE(SUM(CASE WHEN OdrShopSettled = 1 THEN OdrGP ELSE 0 END), 0) as settledGP,
            COALESCE(SUM(CASE WHEN OdrRiderSettled = 1 THEN OdrRiderFee ELSE 0 END), 0) as settledRiderFee,
            COALESCE(SUM(CASE WHEN OdrShopSettled = 1 AND OdrRiderSettled = 1 THEN OdrAdminFee ELSE 0 END), 0) as settledAdminProfit,
            
            -- Total Potential Amounts (Pending + Settled)
            COALESCE(SUM(OdrGP), 0) as totalGP,
            COALESCE(SUM(OdrRiderFee), 0) as totalRiderFee,
            COALESCE(SUM(OdrAdminFee), 0) as totalAdminProfit,

            (SELECT COALESCE(SUM(OdrDelFee), 0) FROM tbl_order WHERE OdrStatus = 6 AND RiderId IS NOT NULL AND RiderId > 0) as totalRiderGross
        FROM tbl_order 
        WHERE OdrStatus = 6"; 

$res = $conn->query($sql);
$data = $res->fetch_assoc();

// Add User Counts
$data['shopCount']     = $conn->query("SELECT COUNT(*) as cnt FROM tbl_shop")->fetch_assoc()['cnt'];
$data['riderCount']    = $conn->query("SELECT COUNT(*) as cnt FROM tbl_rider")->fetch_assoc()['cnt'];
$data['customerCount'] = $conn->query("SELECT COUNT(*) as cnt FROM tbl_userinfo WHERE UsrRole = 'customer'")->fetch_assoc()['cnt'];

// Add Total Pending Payouts (Money the admin hasn't transferred yet)
$data['totalPendingShop']  = $conn->query("SELECT COALESCE(SUM(OdrFoodPrice - OdrGP), 0) FROM tbl_order WHERE OdrStatus = 6 AND OdrShopSettled = 0")->fetch_row()[0];
$data['totalPendingRider'] = $conn->query("SELECT COALESCE(SUM(OdrRiderFee), 0) FROM tbl_order WHERE OdrStatus = 6 AND OdrRiderSettled = 0")->fetch_row()[0];

echo json_encode(['success' => true, 'data' => $data]);
?>
