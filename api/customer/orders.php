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
    $distance   = $data['distance'] ?? 0;
    $noteShop   = $data['noteShop'] ?? '';
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

    // --- BAN CHECK ---
    $banStmt = $conn->prepare("SELECT UsrStatus FROM tbl_userinfo WHERE UsrId = ?");
    $banStmt->bind_param("i", $userId);
    $banStmt->execute();
    $banRow = $banStmt->get_result()->fetch_assoc();
    if ($banRow && (int)$banRow['UsrStatus'] === 0) {
        echo json_encode(['success' => false, 'message' => 'บัญชีของคุณถูกระงับการใช้งาน ไม่สามารถสั่งซื้อได้']);
        exit;
    }

    // ── Pre-check: Verify Shop is Open ──
    $shopStmt = $conn->prepare("SELECT ShopStatus FROM tbl_shop WHERE ShopId = ?");
    $shopStmt->bind_param("i", $shopId);
    $shopStmt->execute();
    $shopRow = $shopStmt->get_result()->fetch_assoc();
    if ($shopRow && (int)$shopRow['ShopStatus'] === 0) {
        echo json_encode(['success' => false, 'message' => 'ขออภัย ขณะนี้ร้านค้าปิดรับออเดอร์ชั่วคราว']);
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
        $lat = (float)($addressRec['lat'] ?? 0);
        $lng = (float)($addressRec['lng'] ?? 0);
        
        $checkA = $conn->prepare("SELECT AdrId FROM tbl_address WHERE UsrId = ? AND HouseNo = ? AND Village = ? AND Road = ? AND Soi = ? AND Moo = ? AND SubDistrict = ? AND District = ? AND Province = ? AND Zipcode = ? AND AdrLat = ? AND AdrLng = ? LIMIT 1");
        $checkA->bind_param("isssssssssdd", $userId, $addressRec['houseNo'], $addressRec['village'], $addressRec['road'], $addressRec['soi'], $addressRec['moo'], $addressRec['tambon'], $addressRec['amphure'], $addressRec['province'], $addressRec['zip'], $lat, $lng);
        $checkA->execute();
        $exist = $checkA->get_result()->fetch_assoc();
        
        if ($exist) {
            $adrId = $exist['AdrId'];
        } else {
            // Insert new address
            $stmt = $conn->prepare("INSERT INTO tbl_address (UsrId, HouseNo, Village, Road, Soi, Moo, SubDistrict, District, Province, Zipcode, AdrLat, AdrLng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssssssssdd", $userId, $addressRec['houseNo'], $addressRec['village'], $addressRec['road'], $addressRec['soi'], $addressRec['moo'], $addressRec['tambon'], $addressRec['amphure'], $addressRec['province'], $addressRec['zip'], $lat, $lng);
            $stmt->execute();
            $adrId = $stmt->insert_id;
        }

        // 2. Insert into tbl_order
        $status = 1; 

        // Fetch Platform Fee from settings
        $setRes = $conn->query("SELECT SettingValue FROM tbl_settings WHERE SettingKey = 'platform_fee'");
        $platformFee = ($setRes && $setRes->num_rows > 0) ? (float)$setRes->fetch_assoc()['SettingValue'] : 12;

        $foodPrice = $total - $delFee - $platformFee;
        
        // Calculate Financial Splits
        $gpRate = 0.25; // 25% Shop GP
        $riderShareRate = 0.80; // 80% of Delivery Fee for Rider
        
        $odrGP       = $foodPrice * $gpRate;
        $odrRiderFee = $delFee * $riderShareRate;
        // Platform Revenue = GP + Platform's Delivery share (20%) + Platform Service Fee
        $odrAdminFee = $odrGP + ($delFee - $odrRiderFee) + $platformFee;

        $stmt = $conn->prepare("INSERT INTO tbl_order (UsrId, ShopId, AdrId, OdrStatus, OdrFoodPrice, OdrDelFee, OdrPlatformFee, OdrGrandTotal, OdrGP, OdrRiderFee, OdrAdminFee, OdrNote, OdrShopSettled, OdrRiderSettled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)");
        $stmt->bind_param("iiiiddddddds", $userId, $shopId, $adrId, $status, $foodPrice, $delFee, $platformFee, $total, $odrGP, $odrRiderFee, $odrAdminFee, $noteShop);
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

        // 4. Initial tbl_payment record (Status 0 = Pending)
        $pmtStmt = $conn->prepare("INSERT INTO tbl_payment (OdrId, PmtMethod, PmtAmount, PmtStatus) VALUES (?, 'PromptPay', ?, 0)");
        $pmtStmt->bind_param("id", $orderId, $total);
        $pmtStmt->execute();

        $conn->commit();
        echo json_encode(['success' => true, 'orderId' => $orderId]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else if ($method === 'GET') {
    $orderId = $_GET['id'] ?? 0;
    
    if ($orderId) {
        $sql = "SELECT o.*, s.ShopName, s.ShopPhone, s.ShopPrepTime, s.ShopLogoPath AS ShopLogo,
                       sa.AdrLat as ShopLat, sa.AdrLng as ShopLng,
                       a.Province, a.District, a.SubDistrict, a.HouseNo, a.Zipcode, a.AdrLat, a.AdrLng,
                       ur.UsrFullName as RiderName, ur.UsrPhone as RiderPhone, ur.UsrImagePath as RiderImage,
                       r.RiderVehicleType, r.RiderVehiclePlate, r.RiderLat, r.RiderLng, r.RiderRatingAvg,
                       uc.UsrFullName as CustName
                FROM tbl_order o 
                LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
                LEFT JOIN tbl_address sa ON s.AdrId = sa.AdrId
                LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
                LEFT JOIN tbl_rider r ON o.RiderId = r.RiderId
                LEFT JOIN tbl_userinfo ur ON r.UsrId = ur.UsrId
                LEFT JOIN tbl_userinfo uc ON o.UsrId = uc.UsrId
                WHERE o.OdrId = ? LIMIT 1";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $res = $stmt->get_result();
        $order = $res->fetch_assoc();

        if ($order) {
            // Get Items
            $itemStmt = $conn->prepare("SELECT od.*, f.FoodName, f.FoodPrepTime FROM tbl_order_detail od 
                                      LEFT JOIN tbl_food f ON od.FoodId = f.FoodId 
                                      WHERE od.OdrId = ?");
            $itemStmt->bind_param("i", $orderId);
            $itemStmt->execute();
            $itemRes = $itemStmt->get_result();
            $items = [];
            $maxPrep = 0;
            while ($it = $itemRes->fetch_assoc()) {
                $prep = (int)($it['FoodPrepTime'] ?? 0);
                if ($prep > $maxPrep) $maxPrep = $prep;

                $items[] = [
                    'id'   => $it['FoodId'],
                    'foodId' => $it['FoodId'],
                    'name' => $it['FoodName'],
                    'qty'  => (int)$it['OdtQty'],
                    'price' => (float)$it['OdtUnitPrice'],
                    'prepTime' => $prep
                ];
            }
            $order['ShopLogo'] = $order['ShopLogo'] ? 'http://localhost/bitesync/public' . $order['ShopLogo'] : null;
            $order['RiderImage'] = $order['RiderImage'] ? 'http://localhost/bitesync/public' . $order['RiderImage'] : null;
            $order['items'] = $items;
            $order['MaxPrepTime'] = $maxPrep;

            $os = (int)$order['OdrStatus'];
            $step = 0; // Default: Waiting/Unpaid
            if ($os === 1) $step = 0; // Unpaid
            else if ($os === 2) $step = 0; // Paid, waiting for shop to accept
            else if ($os === 3) $step = 1; // Shop accepted and is preparing
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

    $sql = "SELECT o.*, s.ShopName as shopName, s.ShopLogoPath as shopLogo, a.Province, a.District, a.SubDistrict, a.HouseNo, a.Zipcode 
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
        $row['shopLogo'] = $row['shopLogo'] ? 'http://localhost/bitesync/public' . $row['shopLogo'] : null;
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
    // Allow self-cancel if unpaid (1) or paid but shop hasn't accepted yet (2)
    if ($currentOS > 2) {
        echo json_encode(['success' => false, 'message' => 'ไม่สามารถยกเลิกได้ เนื่องจากทางร้านได้รับออเดอร์และเริ่มดำเนินการแล้วครับ']);
        exit;
    }

    // Perform cancellation (New Cancelled Status = 7)
    $stmt = $conn->prepare("UPDATE tbl_order SET OdrStatus = 7, OdrCancelBy = 'customer' WHERE OdrId = ?");
    $stmt->bind_param("i", $orderId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'ยกเลิกออเดอร์เรียบร้อยแล้ว']);
    } else {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการยกเลิก']);
    }
}
?>
