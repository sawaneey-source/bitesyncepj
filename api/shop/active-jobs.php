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

// Fetch active orders (Status 3, 4, 5)
$sql = "SELECT o.OdrId, o.OdrStatus, o.OdrGrandTotal, o.OdrCreatedAt, o.OdrDistance,
               u.UsrFullName as customer, u.UsrPhone as phone,
               a.HouseNo, a.SubDistrict, a.District, a.Province,
               r.RiderId, r.RiderVehicleType, r.RiderVehiclePlate, r.RiderLat, r.RiderLng, r.RiderRatingAvg,
               ru.UsrFullName as riderName, ru.UsrPhone as riderPhone, ru.UsrImage as riderImage
        FROM tbl_order o
        LEFT JOIN tbl_userinfo u ON o.UsrId = u.UsrId
        LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
        LEFT JOIN tbl_rider r ON o.RiderId = r.RiderId
        LEFT JOIN tbl_userinfo ru ON r.UsrId = ru.UsrId
        WHERE o.ShopId = ? AND o.OdrStatus IN (3, 4, 5)
        ORDER BY o.OdrId DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $shopId);
$stmt->execute();
$res = $stmt->get_result();

$jobs = [];
while ($row = $res->fetch_assoc()) {
    // Calculate status step for frontend
    // Frontend expects: 0:Received, 1:Preparing, 2:Waiting for Rider, 3:Rider Assigned, 4:Picked Up, 5:Delivered
    $os = (int)$row['OdrStatus'];
    $step = 1; // Default to Preparing (Status 3)
    if ($os === 4) $step = 2; // Waiting for Rider
    if ($os === 5) $step = 4; // Picked Up (Delivering)
    
    // If rider assigned but not picked up yet
    if ($os === 4 && !empty($row['RiderId'])) $step = 3;

    $ts = strtotime($row['OdrCreatedAt']);
    
    $jobs[] = [
        'OdrId' => '#' . $row['OdrId'],
        'customer' => $row['customer'],
        'phone' => $row['phone'],
        'address' => $row['HouseNo'] . ' ' . $row['SubDistrict'] . ' ' . $row['District'],
        'total' => (float)$row['OdrGrandTotal'],
        'createdAt' => date("H:i", $ts),
        'step' => $step,
        'status' => $os,
        'rider' => $row['RiderId'] ? [
            'name' => $row['riderName'],
            'phone' => $row['riderPhone'],
            'img' => $row['riderImage'] ? 'http://localhost/bitesync/public' . $row['riderImage'] : null,
            'rating' => $row['RiderRatingAvg'],
            'lat' => $row['RiderLat'],
            'lng' => $row['RiderLng'],
            'vehicle' => [
                'type' => $row['RiderVehicleType'],
                'plate' => $row['RiderVehiclePlate']
            ],
            'distance' => number_format((float)$row['OdrDistance'], 1) . ' km'
        ] : null,
        'items' => [] // Will populate if needed later, but Shop Dashboard usually has summaries
    ];
}

echo json_encode(['success' => true, 'data' => $jobs]);
