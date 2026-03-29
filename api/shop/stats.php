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

$usrId = $_GET['usrId'] ?? 0;
$period = $_GET['period'] ?? 'today';

// Get ShopId from UsrId
$sStmt = $conn->prepare("SELECT ShopId FROM tbl_shop WHERE UsrId = ?");
$sStmt->bind_param("i", $usrId);
$sStmt->execute();
$sRes = $sStmt->get_result();
if ($sRow = $sRes->fetch_assoc()) {
    $shopId = $sRow['ShopId'];
} else {
    echo json_encode(['success' => false, 'message' => 'Shop not found']);
    exit();
}

// Define Date Clause
$dateClause = "AND DATE(OdrCreatedAt) = CURDATE()";
if ($period === '3days')  $dateClause = "AND DATE(OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)";
if ($period === '7days')  $dateClause = "AND DATE(OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)";
if ($period === '30days') $dateClause = "AND DATE(OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)";
if ($period === 'all')    $dateClause = ""; // No date filter

// 1. Sales for Period (Status 6 = Completed)
// Gross is all completed, Net is only settled
$stmt = $conn->prepare("SELECT SUM(OdrFoodPrice) as gross, 
                               SUM(CASE WHEN OdrShopSettled = 1 THEN OdrFoodPrice - OdrGP ELSE 0 END) as settled_net,
                               SUM(CASE WHEN OdrShopSettled = 0 THEN OdrFoodPrice - OdrGP ELSE 0 END) as pending_net
                        FROM tbl_order 
                        WHERE ShopId = ? AND OdrStatus = 6 $dateClause");
$stmt->bind_param("i", $shopId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$grossSales = (float)($row['gross'] ?? 0);
$settledNet = (float)($row['settled_net'] ?? 0);
$pendingNet = (float)($row['pending_net'] ?? 0);

// 1.1 Fetch current historical total settled amount
$stmt = $conn->prepare("SELECT ShopTotalSettled FROM tbl_shop WHERE ShopId = ?");
$stmt->bind_param("i", $shopId);
$stmt->execute();
$totalSettledAmt = (float)($stmt->get_result()->fetch_assoc()['ShopTotalSettled'] ?? 0);

// 2. Total Orders for Period (Paid, Status 2-6, exclude 7 cancelled)
$orders = 0;
$stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM tbl_order WHERE ShopId = ? AND OdrStatus BETWEEN 2 AND 6 $dateClause");
$stmt->bind_param("i", $shopId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$orders = (int)($row['cnt'] ?? 0);

// 3. Pending Orders Count (Always Global Status 2)
$pendingCount = 0;
$stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM tbl_order WHERE ShopId = ? AND OdrStatus = 2");
$stmt->bind_param("i", $shopId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$pendingCount = (int)($row['cnt'] ?? 0);

// 4. Recent Orders (Last 5) - Always showing last 5 regardless of period
$recent = [];
$stmt = $conn->prepare("SELECT o.OdrId, o.OdrCreatedAt, u.UsrFullName as customer, o.OdrFoodPrice as total, o.OdrStatus, u.UsrImagePath as customerImage
                        FROM tbl_order o
                        LEFT JOIN tbl_userinfo u ON o.UsrId = u.UsrId
                        WHERE o.ShopId = ? AND o.OdrStatus >= 2
                        ORDER BY o.OdrId DESC LIMIT 5");
$stmt->bind_param("i", $shopId);
$stmt->execute();
$res = $stmt->get_result();
$statusMap = [1 => 'Unpaid', 2 => 'Pending', 3 => 'Preparing', 4 => 'Ready', 5 => 'Delivering', 6 => 'Complete', 7 => 'Cancelled'];
while($r = $res->fetch_assoc()) {
    $ts = strtotime($r['OdrCreatedAt']);
    $recent[] = [
        'id' => '#' . $r['OdrId'],
        'date' => date("d M Y", $ts),
        'customer' => $r['customer'],
        'customerImage' => $r['customerImage'] ? 'http://localhost/bitesync/public' . $r['customerImage'] : null,
        'total' => (float)$r['total'],
        'status' => $statusMap[$r['OdrStatus']] ?? 'Pending'
    ];
}

// 5. Daily Sales Chart (Last 7 days)
$chart = [];
for ($i = 6; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-$i days"));
    $stmt = $conn->prepare("SELECT SUM(OdrFoodPrice) as total FROM tbl_order WHERE ShopId = ? AND OdrStatus = 6 AND DATE(OdrCreatedAt) = ?");
    $stmt->bind_param("is", $shopId, $date);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $chart[] = (float)($row['total'] ?? 0);
}

echo json_encode([
    'success' => true,
    'data' => [
        'totalSales' => $grossSales,
        'settledNetSales' => $settledNet,
        'pendingNetSales' => $pendingNet,
        'totalSettled' => $totalSettledAmt,
        'totalOrders' => $orders,
        'pendingOrdersCount' => $pendingCount,
        'recentOrders' => $recent,
        'chart' => $chart
    ]
]);
