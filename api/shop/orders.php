<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

if (!$conn) {
    die(json_encode(["success"=>false, "message"=>"DB Connection Failed"]));
}

$method = $_SERVER['REQUEST_METHOD'];

function getShopId($conn, $id) {
    $stmt = $conn->prepare("SELECT ShopId FROM tbl_shop WHERE UsrId = ? OR ShopId = ? LIMIT 1");
    if (!$stmt) return 0;
    $stmt->bind_param("ii", $id, $id);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    return $res ? (int)$res['ShopId'] : 0;
}

if ($method === 'GET') {
    $rawId = $_GET['shopId'] ?? $_GET['usrId'] ?? 0;
    $shopId = getShopId($conn, $rawId);

    if (!$shopId) {
        echo json_encode(['success' => true, 'data' => []]);
        exit();
    }

    $sql = "SELECT o.OdrId, u.UsrFullName as customer, o.OdrCreatedAt, 
                   o.OdrStatus, o.OdrGrandTotal as total, o.RiderId,
                   a.Province, a.District, a.SubDistrict, a.HouseNo as address, u.UsrPhone as phone,
                   ru.UsrFullName as riderName, ru.UsrPhone as riderPhone
            FROM tbl_order o
            LEFT JOIN tbl_userinfo u ON o.UsrId = u.UsrId
            LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
            LEFT JOIN tbl_rider r ON o.RiderId = r.RiderId
            LEFT JOIN tbl_userinfo ru ON r.UsrId = ru.UsrId
            WHERE o.ShopId = ? AND o.OdrStatus >= 2
            ORDER BY o.OdrId DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $res = $stmt->get_result();
    $orders = [];
    
    $statusMap = [1 => 'Unpaid', 2 => 'Pending', 3 => 'Preparing', 4 => 'Ready', 5 => 'Delivering', 6 => 'Completed', 7 => 'Cancelled'];

    while ($row = $res->fetch_assoc()) {
        $row['status'] = $statusMap[$row['OdrStatus']] ?? 'Pending';
        $ts = strtotime($row['OdrCreatedAt']);
        $row['time'] = date("H:i", $ts) . " (" . date("d/m", $ts) . ")";
        
        $orderId = (int)$row['OdrId'];
        $stmtItems = $conn->prepare("SELECT f.FoodName, od.OdtQty FROM tbl_order_detail od LEFT JOIN tbl_food f ON od.FoodId = f.FoodId WHERE od.OdrId = ?");
        $stmtItems->bind_param("i", $orderId);
        $stmtItems->execute();
        $resItems = $stmtItems->get_result();
        $itemsArr = [];
        while($it = $resItems->fetch_assoc()) {
            $itemsArr[] = (int)$it['OdtQty'] . "x " . $it['FoodName'];
        }
        $row['items'] = implode(", ", $itemsArr);
        $row['OdrId'] = "#" . $row['OdrId'];
        $row['img'] = "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=100&q=70";
        $orders[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $orders]);

} else if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $orderIdRaw = $_GET['id'] ?? '';
    // Use str_replace to handle the encoded # if it comes through as literal
    $orderId = (int)str_replace(['#', '%23'], '', $orderIdRaw);
    $statusStr = $data['status'] ?? '';

    $statusMapInvert = ['Unpaid'=>1, 'Pending'=>2, 'Preparing'=>3, 'Ready'=>4, 'Delivering'=>5, 'Completed'=>6, 'Cancelled'=>7];
    $odrStatus = $statusMapInvert[$statusStr] ?? 1;

    $stmt = $conn->prepare("UPDATE tbl_order SET OdrStatus = ? WHERE OdrId = ?");
    $stmt->bind_param("ii", $odrStatus, $orderId);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => $conn->error]);
    }
}
?>
