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

    $sql = "SELECT o.OdrId, u.UsrFullName as customer, u.UsrImagePath as customerImage, o.OdrCreatedAt, 
                   o.OdrStatus, o.OdrFoodPrice as total, o.OdrGP, o.OdrDelFee as deliveryFee, o.RiderId,
                   o.OdrCancelBy, a.Province, a.District, a.SubDistrict, a.HouseNo, a.Village, a.Road, a.Soi, a.Moo, u.UsrPhone as phone,
                   ru.UsrFullName as riderName, ru.UsrPhone as riderPhone, o.OdrNote
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
        
        $addrParts = [];
        if (!empty($row['HouseNo'])) $addrParts[] = $row['HouseNo'];
        if (!empty($row['Moo'])) $addrParts[] = "ม." . $row['Moo'];
        if (!empty($row['Village'])) $addrParts[] = "มบ." . $row['Village'];
        if (!empty($row['Soi'])) $addrParts[] = "ซ." . $row['Soi'];
        if (!empty($row['Road'])) $addrParts[] = "ถ." . $row['Road'];
        if (!empty($row['SubDistrict'])) $addrParts[] = $row['SubDistrict'];
        if (!empty($row['District'])) $addrParts[] = $row['District'];
        if (!empty($row['Province'])) $addrParts[] = $row['Province'];
        $row['address'] = implode(' ', $addrParts);
        
        $orderId = (int)$row['OdrId'];
        $stmtItems = $conn->prepare("SELECT f.FoodName, f.FoodImagePath, od.OdtQty FROM tbl_order_detail od LEFT JOIN tbl_food f ON od.FoodId = f.FoodId WHERE od.OdrId = ?");
        $stmtItems->bind_param("i", $orderId);
        $stmtItems->execute();
        $resItems = $stmtItems->get_result();
        $itemsArr = [];
        $foodImg = null;
        while($it = $resItems->fetch_assoc()) {
            $itemsArr[] = (int)$it['OdtQty'] . "x " . $it['FoodName'];
            if (!$foodImg && !empty($it['FoodImagePath'])) {
                $foodImg = 'http://localhost/bitesync/public' . $it['FoodImagePath'];
            }
        }
        $row['items'] = implode(", ", $itemsArr);
        $row['OdrId'] = "#" . $row['OdrId'];
        if (!empty($row['customerImage'])) {
            $row['customerImage'] = 'http://localhost/bitesync/public' . $row['customerImage'];
        }
        $row['img'] = $foodImg; // Use food image for the card
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

    $sql = "UPDATE tbl_order SET OdrStatus = ?" . ($odrStatus === 7 ? ", OdrCancelBy = 'shop'" : "") . " WHERE OdrId = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $odrStatus, $orderId);
    if ($stmt->execute()) {
        if ($odrStatus === 6) {
            include_once "../common/settlement_helper.php";
            updateBalance($conn, $orderId);
        }

        // --- Start: Auto-update Shop Performance Stats ---
        // Fetch ShopId for this order
        $qS = $conn->prepare("SELECT ShopId FROM tbl_order WHERE OdrId = ?");
        $qS->bind_param("i", $orderId); $qS->execute();
        $sId = (int)($qS->get_result()->fetch_assoc()['ShopId'] ?? 0);
        
        if ($sId > 0) {
            // Total orders for this shop (status >= 2)
            $qTotal = $conn->prepare("SELECT COUNT(*) as total FROM tbl_order WHERE ShopId = ? AND OdrStatus >= 2");
            $qTotal->bind_param("i", $sId); $qTotal->execute();
            $tot = (int)($qTotal->get_result()->fetch_assoc()['total'] ?? 0);
            
            if ($tot > 0) {
                // Accepted (status >= 3 AND status != 7)
                $qAcc = $conn->prepare("SELECT COUNT(*) as accepted FROM tbl_order WHERE ShopId = ? AND OdrStatus >= 3 AND OdrStatus != 7");
                $qAcc->bind_param("i", $sId); $qAcc->execute();
                $acc = (int)($qAcc->get_result()->fetch_assoc()['accepted'] ?? 0);
                
                // Cancelled (status == 7 AND CancelBy = 'shop')
                $qCan = $conn->prepare("SELECT COUNT(*) as cancelled FROM tbl_order WHERE ShopId = ? AND OdrStatus = 7 AND OdrCancelBy = 'shop'");
                $qCan->bind_param("i", $sId); $qCan->execute();
                $can = (int)($qCan->get_result()->fetch_assoc()['cancelled'] ?? 0);
                
                $ar = round(($acc / $tot) * 100, 2);
                $cr = round(($can / $tot) * 100, 2);
                
                $uStat = $conn->prepare("UPDATE tbl_shop SET ShopAcceptRate = ?, ShopCancelRate = ? WHERE ShopId = ?");
                $uStat->bind_param("ddi", $ar, $cr, $sId);
                $uStat->execute();
            }
        }
        // --- End: Auto-update Shop Performance Stats ---

        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => $conn->error]);
    }
}
?>
