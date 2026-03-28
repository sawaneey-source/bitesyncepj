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

// 0. Check Rider Status
$riderStatus = 'Offline';
$riderLat = 0; $riderLng = 0;
$st = $conn->prepare("SELECT RiderStatus, RiderLat, RiderLng FROM tbl_rider WHERE UsrId = ?");
$st->bind_param("i", $usrId);
$st->execute();
$resSt = $st->get_result();
if ($rowSt = $resSt->fetch_assoc()) {
    $riderStatus = $rowSt['RiderStatus'];
    $riderLat = (float)$rowSt['RiderLat'];
    $riderLng = (float)$rowSt['RiderLng'];
}
if ($riderStatus !== 'Online') {
    echo json_encode(['success' => true, 'data' => [], 'status' => $riderStatus]);
    exit;
}

function getDistance($lat1, $lon1, $lat2, $lon2) {
    if (!$lat1 || !$lon1 || !$lat2 || !$lon2) return 999;
    $theta = $lon1 - $lon2;
    $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
    $dist = acos($dist);
    $dist = rad2deg($dist);
    $miles = $dist * 60 * 1.1515;
    return ($miles * 1.609344); // Kilometers
}

$sql = "SELECT o.OdrId, o.OdrGrandTotal as total, o.OdrDelFee as fee, o.OdrDistance as distance, o.OdrNote,
               s.ShopName, s.ShopLogoPath as logo, s.ShopBannerPath as img, s.ShopPhone as shopPhone,
               sa.Province as shopProv, sa.District as shopDist, sa.SubDistrict as shopSub, sa.HouseNo as shopHouse, sa.Road as shopRoad, sa.Village as shopVillage,
               sa.AdrLat as shopLat, sa.AdrLng as shopLng,
               a.Province as custProv, a.District as custDist, a.SubDistrict as custSub, a.HouseNo as custHouse,
               ui.UsrPhone as custPhone
        FROM tbl_order o
        LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
        LEFT JOIN tbl_address sa ON s.AdrId = sa.AdrId
        LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
        LEFT JOIN tbl_userinfo ui ON o.UsrId = ui.UsrId
        WHERE o.OdrStatus = 4 
          AND (o.RiderId IS NULL OR o.RiderId = 0)
          AND o.OdrId NOT IN (SELECT OdrId FROM tbl_order_cancel_history WHERE RiderId = (SELECT RiderId FROM tbl_rider WHERE UsrId = ?))
        ORDER BY o.OdrCreatedAt ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $usrId);
$stmt->execute();
$result = $stmt->get_result();
$jobs = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $orderId = (int)$row['OdrId'];

        // Fetch Items summary
        $stmtItems = $conn->prepare("SELECT f.FoodName, od.OdtQty FROM tbl_order_detail od LEFT JOIN tbl_food f ON od.FoodId = f.FoodId WHERE od.OdrId = ?");
        $stmtItems->bind_param("i", $orderId);
        $stmtItems->execute();
        $resItems = $stmtItems->get_result();
        $itemsArr = [];
        while($it = $resItems->fetch_assoc()) {
            $itemsArr[] = (int)$it['OdtQty'] . "x " . $it['FoodName'];
        }
        $itemsCountStr = implode(", ", $itemsArr);

        // Format addresses
        $shopAddr = $row['shopHouse'] . ' ' . ($row['shopVillage'] ? $row['shopVillage'].' ' : '') . ($row['shopRoad'] ? $row['shopRoad'].' ' : '') . $row['shopSub'] . ' ' . $row['shopDist'] . ' ' . $row['shopProv'];
        $custAddr = $row['custHouse'] . ' ' . $row['custSub'] . ' ' . $row['custDist'] . ' ' . $row['custProv'];

        // Determine image
        $img = $row['img'] ? "http://localhost/bitesync/public" . $row['img'] : null;

        // Distance from Rider to Shop
        $distToShop = getDistance($riderLat, $riderLng, (float)$row['shopLat'], (float)$row['shopLng']);

        // Only show jobs within 15km
        if ($distToShop > 15.0) continue;

        $jobs[] = [
            'id' => "#" . $row['OdrId'],
            'rawId' => $row['OdrId'],
            'shopName' => $row['ShopName'],
            'shopAddr' => $shopAddr,
            'shopPhone' => $row['shopPhone'] ?? null,
            'custAddr' => $custAddr,
            'custPhone' => $row['custPhone'] ?? null,
            'items' => $itemsCountStr,
            'total' => number_format((float)$row['total'], 2),
            'distance' => number_format((float)$row['distance'], 1) . ' กม.',
            'fee' => number_format((float)$row['fee'], 0),
            'img' => $img,
            'logo' => $row['logo'] ? "http://localhost/bitesync/public" . $row['logo'] : null,
            'shopLat' => $row['shopLat'],
            'shopLng' => $row['shopLng'],
            'riderToShopDist' => round($distToShop, 2),
            'note' => $row['OdrNote']
        ];
    }
}

echo json_encode([
    'success' => true, 
    'data' => $jobs, 
    'status' => $riderStatus,
    'riderPos' => ['lat' => $riderLat, 'lng' => $riderLng]
]);
?>
