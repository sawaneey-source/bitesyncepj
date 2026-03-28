<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Set Timezone to Thailand
date_default_timezone_set('Asia/Bangkok');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

$usrId = $_GET['usrId'] ?? 0;
$period = $_GET['period'] ?? 'วันนี้';

if (!$usrId) {
    echo json_encode(['success' => false, 'message' => 'Missing UsrId']);
    exit();
}

// Get RiderId
$rStmt = $conn->prepare("SELECT RiderId FROM tbl_rider WHERE UsrId = ?");
$rStmt->bind_param("i", $usrId);
$rStmt->execute();
$rRes = $rStmt->get_result();
if ($rRow = $rRes->fetch_assoc()) {
    $riderId = $rRow['RiderId'];
} else {
    echo json_encode(['success' => false, 'message' => 'Rider not found']);
    exit();
}

// Dynamic Rating for Summary Header
$qRate = $conn->prepare("SELECT AVG(RiderRating) as avgR FROM tbl_order WHERE RiderId = ? AND RiderRating IS NOT NULL");
$qRate->bind_param("i", $riderId);
$qRate->execute();
$currentRatingAvg = (float)($qRate->get_result()->fetch_assoc()['avgR'] ?? 0);
$qRate->close();

// Date Filter Clause using MySQL dates to be safe
$dateClause = "DATE(o.OdrCreatedAt) = CURDATE()";
if ($period === '3 วันล่าสุด') {
    $dateClause = "DATE(o.OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)";
} else if ($period === '7 วันล่าสุด') {
    $dateClause = "DATE(o.OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)";
} else if ($period === '30 วันล่าสุด') {
    $dateClause = "DATE(o.OdrCreatedAt) >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)";
} else if ($period === 'ทั้งหมด') {
    $dateClause = "1=1";
}

// 1. Fetch History List
$sql = "SELECT o.OdrId, o.OdrCreatedAt as date, o.OdrDelFee as fee, o.OdrRiderFee as riderFee, o.OdrDistance as distance, o.OdrStatus, o.RiderRating, o.OdrRiderSettled,
               s.ShopName, a.HouseNo, a.SubDistrict
        FROM tbl_order o
        LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
        LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
        WHERE o.RiderId = ? AND o.OdrStatus IN (6, 7) AND $dateClause
        ORDER BY o.OdrCreatedAt DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $riderId);
$stmt->execute();
$res = $stmt->get_result();

$history = [];
$summary = ['deliveries' => 0, 'earnings' => 0, 'distance' => 0, 'cancelled' => 0, 'rating' => $currentRatingAvg];

while ($row = $res->fetch_assoc()) {
    $isDelivered = $row['OdrStatus'] == 6;
    $statusStr = $isDelivered ? 'delivered' : 'cancelled';
    
    $ts = strtotime($row['date']);
    $dateStr = date("d/m/Y H:i", $ts);
    if ($period === 'วันนี้') {
        $dateStr = "วันนี้ " . date("H:i", $ts);
    }
    
    if ($isDelivered) {
        $summary['deliveries']++;
        $summary['gross'] = ($summary['gross'] ?? 0) + (float)$row['fee'];
        
        if ($row['OdrRiderSettled'] == 1) {
            $summary['settledEarnings'] = ($summary['settledEarnings'] ?? 0) + (float)$row['riderFee'];
        } else {
            $summary['pendingEarnings'] = ($summary['pendingEarnings'] ?? 0) + (float)$row['riderFee'];
        }
        
        $summary['earnings'] = ($summary['earnings'] ?? 0) + (float)$row['riderFee']; // Total possible
        $summary['distance'] += (float)$row['distance'];
    } else {
        $summary['cancelled']++;
    }

    $history[] = [
        'id' => '#' . $row['OdrId'],
        'date' => $dateStr,
        'shopName' => $row['ShopName'],
        'custAddr' => $row['HouseNo'] . ' ' . $row['SubDistrict'],
        'fee' => (int)$row['fee'],
        'status' => $statusStr,
        'settled' => (int)$row['OdrRiderSettled'],
        'distance' => number_format((float)$row['distance'], 1) . ' กม.',
        'rating' => $row['RiderRating']
    ];
}

$summary['distance'] = number_format($summary['distance'], 1);

// 2. Chart Data (Last 7 days earnings)
// Use DATE_SUB and CURDATE to ensure standard MySQL date matching
$chart = [];
for ($i = 6; $i >= 0; $i--) {
    $stmt = $conn->prepare("SELECT SUM(OdrDelFee) as total FROM tbl_order WHERE RiderId = ? AND OdrStatus = 6 AND DATE(OdrUpdatedAt) = DATE_SUB(CURDATE(), INTERVAL ? DAY)");
    $stmt->bind_param("ii", $riderId, $i);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $chart[] = (float)($row['total'] ?? 0);
}

echo json_encode([
    'success' => true,
    'data' => $history,
    'summary' => $summary,
    'chart' => $chart
]);
