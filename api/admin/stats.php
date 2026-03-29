<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

$period = $_GET['period'] ?? 'today';

// Define Date Clause
$dateClause = "AND DATE(OdrCreatedAt) = CURDATE()";
if ($period === '3days')  $dateClause = "AND DATE(OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)";
if ($period === '7days')  $dateClause = "AND DATE(OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)";
if ($period === '30days') $dateClause = "AND DATE(OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)";
if ($period === 'all')    $dateClause = ""; // No date filter

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
            COALESCE(SUM(OdrPlatformFee), 0) as totalPlatformFee,
            COALESCE(SUM(OdrAdminFee), 0) as totalAdminProfit,

            (SELECT COALESCE(SUM(OdrDelFee), 0) FROM tbl_order WHERE OdrStatus = 6 AND RiderId IS NOT NULL AND RiderId > 0 $dateClause) as totalRiderGross
        FROM tbl_order 
        WHERE OdrStatus = 6 $dateClause"; 

$res = $conn->query($sql);
$data = $res->fetch_assoc();

// Add User Counts (Contextual stats, usually not filtered by period unless specified)
$data['shopCount']     = $conn->query("SELECT COUNT(*) as cnt FROM tbl_shop")->fetch_assoc()['cnt'];
$data['riderCount']    = $conn->query("SELECT COUNT(*) as cnt FROM tbl_rider")->fetch_assoc()['cnt'];
$data['customerCount'] = $conn->query("SELECT COUNT(*) as cnt FROM tbl_userinfo WHERE UsrRole = 'customer'")->fetch_assoc()['cnt'];

// Add Total Pending Payouts (Money the admin hasn't transferred yet)
$data['totalPendingShop']  = $conn->query("SELECT COALESCE(SUM(OdrFoodPrice - OdrGP), 0), COUNT(*) FROM tbl_order WHERE OdrStatus = 6 AND OdrShopSettled = 0 $dateClause")->fetch_row()[0];
$data['totalPendingRider'] = $conn->query("SELECT COALESCE(SUM(OdrRiderFee), 0), COUNT(*) FROM tbl_order WHERE OdrStatus = 6 AND OdrRiderSettled = 0 $dateClause")->fetch_row()[0];

// Daily Platform Fee Chart (Last 7 days)
$chart = [];
for ($i = 6; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-$i days"));
    $stmt = $conn->prepare("SELECT SUM(OdrPlatformFee) as total FROM tbl_order WHERE OdrStatus = 6 AND DATE(OdrCreatedAt) = ?");
    $stmt->bind_param("s", $date);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $chart[] = (float)($row['total'] ?? 0);
}
$data['chartPlatformFee'] = $chart;

echo json_encode(['success' => true, 'data' => $data]);
?>
