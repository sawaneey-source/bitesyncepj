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
               u.UsrFullName as customer, u.UsrPhone as phone, u.UsrImagePath as customerImage,
               a.HouseNo, a.SubDistrict, a.District, a.Province, a.AdrLat as custLat, a.AdrLng as custLng,
               r.RiderId, r.RiderVehicleType, r.RiderVehiclePlate, r.RiderLat, r.RiderLng, r.RiderRatingAvg,
               ru.UsrFullName as riderName, ru.UsrPhone as riderPhone, ru.UsrImagePath as riderImage,
               sa.AdrLat as ShopLat, sa.AdrLng as ShopLng, s.ShopLogoPath
        FROM tbl_order o
        LEFT JOIN tbl_userinfo u ON o.UsrId = u.UsrId
        LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
        LEFT JOIN tbl_rider r ON o.RiderId = r.RiderId
        LEFT JOIN tbl_userinfo ru ON r.UsrId = ru.UsrId
        LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
        LEFT JOIN tbl_address sa ON s.AdrId = sa.AdrId
        WHERE o.ShopId = ? AND (o.OdrStatus IN (3, 4, 5) OR (o.OdrStatus = 6 AND o.OdrCreatedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)))
        ORDER BY o.OdrId DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $shopId);
$stmt->execute();
$res = $stmt->get_result();

function getDistancePHP($lat1, $lon1, $lat2, $lon2) {
    if (!$lat1 || !$lon1 || !$lat2 || !$lon2) return 0;
    $theta = $lon1 - $lon2;
    $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
    $dist = acos($dist);
    $dist = rad2deg($dist);
    $miles = $dist * 60 * 1.1515;
    return ($miles * 1.609344);
}

$jobs = [];
while ($row = $res->fetch_assoc()) {
    // Calculate status step for frontend
    // Frontend expects: 0:Received, 1:Preparing, 2:Waiting for Rider, 3:Rider Assigned, 4:Picked Up, 5:Delivered
    $os = (int)$row['OdrStatus'];
    $step = 1; // Default to Preparing (Status 3)
    if ($os === 4) $step = 2; // Waiting for Rider
    if ($os === 5) $step = 4; // Picked Up (Delivering)
    if ($os === 6) $step = 5; // Delivered (Completed)
    
    // If rider assigned but not picked up yet
    if ($os === 4 && !empty($row['RiderId'])) $step = 3;

    $ts = strtotime($row['OdrCreatedAt']);
    $odrId = $row['OdrId'];

    // Fetch items
    $items = [];
    $iStmt = $conn->prepare("SELECT od.OdtQty, od.OdtUnitPrice, f.FoodName, f.FoodImagePath 
                             FROM tbl_order_detail od 
                             JOIN tbl_food f ON od.FoodId = f.FoodId 
                             WHERE od.OdrId = ?");
    $iStmt->bind_param("i", $odrId);
    $iStmt->execute();
    $iRes = $iStmt->get_result();
    while($iRow = $iRes->fetch_assoc()) {
        $items[] = [
            'name' => $iRow['FoodName'],
            'qty' => (int)$iRow['OdtQty'],
            'price' => (float)$iRow['OdtUnitPrice'],
            'img' => $iRow['FoodImagePath'] ? 'http://localhost/bitesync/public' . $iRow['FoodImagePath'] : null
        ];
    }

    $riderDist = "0.0 km";
    if ($row['RiderId'] && $row['ShopLat'] && $row['RiderLat']) {
        $d = getDistancePHP((float)$row['ShopLat'], (float)$row['ShopLng'], (float)$row['RiderLat'], (float)$row['RiderLng']);
        $riderDist = number_format($d, 1) . ' km';
    }
    
    $jobs[] = [
        'OdrId' => '#' . $odrId,
        'address' => $row['HouseNo'] . ' ' . $row['SubDistrict'] . ' ' . $row['District'],
        'total' => (float)$row['OdrGrandTotal'],
        'createdAt' => date("H:i", $ts),
        'step' => $step,
        'status' => $os,
        'customer' => [
            'name' => $row['customer'],
            'phone' => $row['phone'],
            'image' => $row['customerImage'] ? 'http://localhost/bitesync/public' . $row['customerImage'] : null,
            'lat' => (float)$row['custLat'],
            'lng' => (float)$row['custLng']
        ],
        'shop' => [
            'lat' => (float)$row['ShopLat'],
            'lng' => (float)$row['ShopLng'],
            'logo' => $row['ShopLogoPath'] ? 'http://localhost/bitesync/public' . $row['ShopLogoPath'] : null
        ],
        'rider' => $row['RiderId'] ? [
            'name' => $row['riderName'],
            'phone' => $row['riderPhone'],
            'img' => $row['riderImage'] ? 'http://localhost/bitesync/public' . $row['riderImage'] : null,
            'rating' => (float)$row['RiderRatingAvg'],
            'lat' => (float)$row['RiderLat'],
            'lng' => (float)$row['RiderLng'],
            'vehicle' => [
                'type' => $row['RiderVehicleType'],
                'plate' => $row['RiderVehiclePlate']
            ],
            'distance' => $riderDist
        ] : null,
        'items' => $items
    ];
}

echo json_encode(['success' => true, 'data' => $jobs]);
?>
