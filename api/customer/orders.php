<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Suppress HTML errors to prevent JSON corruption, but allow logical processing
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED); 
include "../../dbconnect/dbconnect.php";

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) {
        echo json_encode(['success' => false, 'message' => 'Invalid data']);
        exit;
    }

    $userId     = $data['userId'] ?? 0;
    $items      = $data['items'] ?? [];
    $addressRec = $data['addressRecord'] ?? null;
    $total      = $data['total'] ?? 0;
    $delFee     = $data['deliveryFee'] ?? 0;
    $shopId     = $items[0]['shopId'] ?? $items[0]['ShopId'] ?? 0;

    if (!$userId || !$shopId || empty($items) || !$addressRec) {
        $missing = [];
        if (!$userId) $missing[] = 'userId';
        if (!$shopId) $missing[] = 'shopId';
        if (empty($items)) $missing[] = 'items';
        if (!$addressRec) $missing[] = 'addressRecord';
        echo json_encode(['success' => false, 'message' => 'Missing fields: ' . implode(', ', $missing)]);
        exit;
    }

    $conn->begin_transaction();
    try {
        // 0. Pre-check: Verify all items are still available
        foreach ($items as $item) {
            $fId = $item['id'] ?? $item['FoodId'] ?? 0;
            $checkStmt = $conn->prepare("SELECT FoodStatus, FoodName FROM tbl_food WHERE FoodId = ?");
            $checkStmt->bind_param("i", $fId);
            $checkStmt->execute();
            $checkRes = $checkStmt->get_result()->fetch_assoc();
            if ($checkRes && $checkRes['FoodStatus'] == 0) {
                echo json_encode(['success' => false, 'message' => 'ขออภัย ' . $checkRes['FoodName'] . ' หมดแล้ว กรุณาลบออกก่อนสั่งซื้อ']);
                $conn->rollback();
                exit;
            }
        }

        // 1. Check if identical address already exists for this user
        $checkA = $conn->prepare("SELECT AdrId FROM tbl_address WHERE UsrId = ? AND HouseNo = ? AND Village = ? AND Road = ? AND Soi = ? AND Moo = ? AND SubDistrict = ? AND District = ? AND Province = ? AND Zipcode = ? LIMIT 1");
        $checkA->bind_param("isssssssss", $userId, $addressRec['houseNo'], $addressRec['village'], $addressRec['road'], $addressRec['soi'], $addressRec['moo'], $addressRec['tambon'], $addressRec['amphure'], $addressRec['province'], $addressRec['zip']);
        $checkA->execute();
        $exist = $checkA->get_result()->fetch_assoc();
        
        if ($exist) {
            $adrId = $exist['AdrId'];
        } else {
            // Insert new address
            $stmt = $conn->prepare("INSERT INTO tbl_address (UsrId, HouseNo, Village, Road, Soi, Moo, SubDistrict, District, Province, Zipcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssssssss", $userId, $addressRec['houseNo'], $addressRec['village'], $addressRec['road'], $addressRec['soi'], $addressRec['moo'], $addressRec['tambon'], $addressRec['amphure'], $addressRec['province'], $addressRec['zip']);
            $stmt->execute();
            $adrId = $stmt->insert_id;
        }

        // 2. Insert into tbl_order
        $status = 1; 
        $foodPrice = $total - $delFee;
        $stmt = $conn->prepare("INSERT INTO tbl_order (UsrId, ShopId, AdrId, OdrStatus, OdrFoodPrice, OdrDelFee, OdrGrandTotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iiiiddd", $userId, $shopId, $adrId, $status, $foodPrice, $delFee, $total);
        $stmt->execute();
        $orderId = $stmt->insert_id;

        // 3. Insert into tbl_order_detail
        $stmt = $conn->prepare("INSERT INTO tbl_order_detail (OdrId, FoodId, OdtUnitPrice, OdtQty) VALUES (?, ?, ?, ?)");
        foreach ($items as $item) {
            $fId   = $item['id'] ?? $item['FoodId'] ?? 0;
            $price = $item['price'] ?? 0;
            $qty   = $item['qty'] ?? 1;
            $stmt->bind_param("iidi", $orderId, $fId, $price, $qty);
            $stmt->execute();
        }

        $conn->commit();
        echo json_encode(['success' => true, 'orderId' => $orderId]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else if ($method === 'GET') {
    $orderId = $_GET['id'] ?? 0;
    
    if ($orderId) {
        $sql = "SELECT o.*, s.ShopName, s.ShopLat, s.ShopLng, a.Province, a.District, a.SubDistrict, a.HouseNo, a.Zipcode,
                       u.UsrFullName as RiderName, u.UsrPhone as RiderPhone,
                       r.RiderVehicleType, r.RiderVehiclePlate, r.RiderLat, r.RiderLng, r.RiderRatingAvg
                FROM tbl_order o 
                LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
                LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
                LEFT JOIN tbl_rider r ON o.RiderId = r.RiderId
                LEFT JOIN tbl_userinfo u ON r.UsrId = u.UsrId
                WHERE o.OdrId = ? LIMIT 1";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $res = $stmt->get_result();
        $order = $res->fetch_assoc();

        if ($order) {
            // Get Items
            $itemStmt = $conn->prepare("SELECT od.*, f.FoodName FROM tbl_order_detail od LEFT JOIN tbl_food f ON od.FoodId = f.FoodId WHERE od.OdrId = ?");
            $itemStmt->bind_param("i", $orderId);
            $itemStmt->execute();
            $itemRes = $itemStmt->get_result();
            $items = [];
            while($it = $itemRes->fetch_assoc()) {
                $items[] = [
                    'id'   => $it['FoodId'],
                    'foodId' => $it['FoodId'],
                    'name' => $it['FoodName'],
                    'qty'  => (int)$it['OdtQty'],
                    'price' => (float)$it['OdtUnitPrice']
                ];
            }
            $order['items'] = $items;

            $step = 0;
            $os = (int)$order['OdrStatus'];
            if ($os === 2 || $os === 3) $step = 1; // Preparing
            else if ($os === 4) $step = 2; // Ready (Waiting for rider)
            else if ($os === 5) $step = 4; // Delivering (Picked up)
            else if ($os === 6) $step = 5; // Completed
            else if ($os === 7) $step = -1; // Cancelled
            
            // If rider assigned but not picked up yet (At Shop / Heading to Shop)
            if (($os === 3 || $os === 4) && !empty($order['RiderId'])) $step = 3;

            $order['currentStep'] = $step;
            
            echo json_encode(['success' => true, 'data' => $order]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Order not found']);
        }
        exit;
    }

    $userId = $_GET['userId'] ?? 0;
    if (!$userId) {
        echo json_encode(['success' => false, 'message' => 'User ID required']);
        exit;
    }

    $sql = "SELECT o.*, s.ShopName as shopName, a.Province, a.District, a.SubDistrict, a.HouseNo, a.Zipcode 
            FROM tbl_order o 
            LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
            LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
            WHERE o.UsrId = ? ORDER BY o.OdrId DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $orders = [];
    while ($row = $res->fetch_assoc()) {
        $orderId = $row['OdrId'];
        $itemStmt = $conn->prepare("SELECT od.*, f.FoodName, f.FoodImagePath FROM tbl_order_detail od LEFT JOIN tbl_food f ON od.FoodId = f.FoodId WHERE od.OdrId = ?");
        $itemStmt->bind_param("i", $orderId);
        $itemStmt->execute();
        $itemRes = $itemStmt->get_result();
        $items = [];
        while($it = $itemRes->fetch_assoc()) {
            $items[] = [
                'id'    => $it['FoodId'],
                'foodId' => $it['FoodId'],
                'name'  => $it['FoodName'],
                'qty'   => (int)$it['OdtQty'],
                'price' => (float)$it['OdtUnitPrice'],
                'img'   => $it['FoodImagePath'] ? 'http://localhost:3000' . $it['FoodImagePath'] : null
            ];
        }
        $row['items'] = $items;
        $orders[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $orders]);
} else if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $orderId = $data['id'] ?? 0;
    $status  = $data['status'] ?? 0;
    $userId  = $data['userId'] ?? 0;

    if (!$orderId || $status != 6 || !$userId) {
        echo json_encode(['success' => false, 'message' => 'Invalid cancellation request']);
        exit;
    }

    // Check if order is still pending (Status 1 or 2)
    $stmt = $conn->prepare("SELECT OdrStatus FROM tbl_order WHERE OdrId = ? AND UsrId = ?");
    $stmt->bind_param("ii", $orderId, $userId);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();

    if (!$res) {
        echo json_encode(['success' => false, 'message' => 'Order not found']);
        exit;
    }

    $currentOS = (int)$res['OdrStatus'];
    // Only allow self-cancel if unpaid (Status 1)
    if ($currentOS !== 1) {
        echo json_encode(['success' => false, 'message' => 'ไม่สามารถยกเลิกได้ เนื่องจากออเดอร์เข้าสู่ระบบของร้านค้าแล้ว']);
        exit;
    }

    // Perform cancellation (New Cancelled Status = 7)
    $stmt = $conn->prepare("UPDATE tbl_order SET OdrStatus = 7 WHERE OdrId = ?");
    $stmt->bind_param("i", $orderId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'ยกเลิกออเดอร์เรียบร้อยแล้ว']);
    } else {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการยกเลิก']);
    }
}
?>
