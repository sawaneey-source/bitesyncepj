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

$sql = "SELECT o.OdrId, o.OdrGrandTotal as total, o.OdrDelFee as fee, o.OdrDistance as distance,
               s.ShopName, s.ShopBannerPath as img,
               sa.Province as shopProv, sa.District as shopDist, sa.SubDistrict as shopSub, sa.HouseNo as shopHouse, sa.Road as shopRoad, sa.Village as shopVillage,
               sa.AdrLat as shopLat, sa.AdrLng as shopLng,
               a.Province as custProv, a.District as custDist, a.SubDistrict as custSub, a.HouseNo as custHouse
        FROM tbl_order o
        LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
        LEFT JOIN tbl_address sa ON s.AdrId = sa.AdrId
        LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
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
        $img = $row['img'] ? "http://localhost/bitesync/public" . $row['img'] : "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=100&q=70";

        $jobs[] = [
            'id' => "#" . $row['OdrId'],
            'rawId' => $row['OdrId'],
            'shopName' => $row['ShopName'],
            'shopAddr' => $shopAddr,
            'custAddr' => $custAddr,
            'items' => $itemsCountStr,
            'total' => number_format((float)$row['total'], 2),
            'distance' => number_format((float)$row['distance'], 1) . ' กม.',
            'fee' => number_format((float)$row['fee'], 0),
            'img' => $img,
            'shopLat' => $row['shopLat'],
            'shopLng' => $row['shopLng']
        ];
    }
}

echo json_encode(['success' => true, 'data' => $jobs]);
?>
