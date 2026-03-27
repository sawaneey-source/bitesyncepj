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

if (!$usrId) {
    echo json_encode(['success' => false, 'message' => 'Missing UsrId']);
    exit();
}

// 1. Get RiderId and Current Rating
$rStmt = $conn->prepare("SELECT RiderId, RiderRatingAvg FROM tbl_rider WHERE UsrId = ?");
$rStmt->bind_param("i", $usrId);
$rStmt->execute();
$rRes = $rStmt->get_result();
if ($rRow = $rRes->fetch_assoc()) {
    $riderId = $rRow['RiderId'];
    $currentRating = (float)$rRow['RiderRatingAvg'];
} else {
    echo json_encode(['success' => false, 'message' => 'Rider not found']);
    exit();
}

// 2. Aggregate Stats by Period
$dateFilter = "DATE(OdrUpdatedAt) = CURDATE()"; // default today
if ($period === '3days') $dateFilter = "OdrUpdatedAt >= DATE_SUB(NOW(), INTERVAL 3 DAY)";
else if ($period === '7days') $dateFilter = "OdrUpdatedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
else if ($period === '30days') $dateFilter = "OdrUpdatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
else if ($period === 'all') $dateFilter = "1=1";

$sql = "SELECT COUNT(*) as deliveries, SUM(OdrDelFee) as earnings, SUM(OdrDistance) as distance
        FROM tbl_order 
        WHERE RiderId = ? AND OdrStatus = 6 AND $dateFilter";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $riderId);
$stmt->execute();
$res = $stmt->get_result();

$stats = [
    'deliveries' => 0,
    'earnings' => 0,
    'distance' => 0,
    'rating' => number_format($currentRating, 1)
];

if ($row = $res->fetch_assoc()) {
    $stats['deliveries'] = (int)$row['deliveries'];
    $stats['earnings'] = (int)$row['earnings'];
    $stats['distance'] = number_format((float)$row['distance'], 1);
}

echo json_encode(['success' => true, 'data' => $stats]);
?>
