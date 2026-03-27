<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents("php://input"), true);
$action = $data['action'] ?? ''; // 'ban', 'unban', 'delete'
$usrId  = $data['usrId'] ?? 0;

if (!$usrId || !$action) {
    echo json_encode(['success' => false, 'message' => 'Missing ID or Action']);
    exit;
}

if ($action === 'ban') {
    $stmt = $conn->prepare("UPDATE tbl_userinfo SET UsrStatus = 0 WHERE UsrId = ?");
    $stmt->bind_param("i", $usrId);
} else if ($action === 'unban') {
    $stmt = $conn->prepare("UPDATE tbl_userinfo SET UsrStatus = 1 WHERE UsrId = ?");
    $stmt->bind_param("i", $usrId);
} else if ($action === 'delete') {
    $conn->begin_transaction();
    try {
        // 1. If this user is a shop owner, we need to clean up shop-related tables (PK/FK)
        $shopResult = $conn->query("SELECT ShopId FROM tbl_shop WHERE UsrId = $usrId");
        if ($shopResult && $shopRow = $shopResult->fetch_assoc()) {
            $shopId = $shopRow['ShopId'];
            
            // Delete reviews, addons and sizes related to this shop's food
            $conn->query("DELETE FROM tbl_review WHERE FoodId IN (SELECT FoodId FROM tbl_food WHERE ShopId = $shopId)");
            $conn->query("DELETE FROM tbl_addon WHERE FoodId IN (SELECT FoodId FROM tbl_food WHERE ShopId = $shopId)");
            $conn->query("DELETE FROM tbl_size WHERE FoodId IN (SELECT FoodId FROM tbl_food WHERE ShopId = $shopId)");
            
            // Delete food and categories
            $conn->query("DELETE FROM tbl_food WHERE ShopId = $shopId");
            $conn->query("DELETE FROM tbl_menu_category WHERE ShopId = $shopId");
        }

        // 2. Clear common user data
        $conn->query("DELETE FROM tbl_review WHERE UsrId = $usrId");
        $conn->query("DELETE FROM tbl_address WHERE UsrId = $usrId");
        
        // 3. Keep order history but anonymize (User and Rider)
        $conn->query("UPDATE tbl_order SET UsrId = 0 WHERE UsrId = $usrId");

        // If this user is a rider, clear RiderId from orders and delete cancel history
        $riderRes = $conn->query("SELECT RiderId FROM tbl_rider WHERE UsrId = $usrId");
        if ($riderRes && $riderRow = $riderRes->fetch_assoc()) {
            $rId = $riderRow['RiderId'];
            $conn->query("UPDATE tbl_order SET RiderId = 0 WHERE RiderId = $rId");
            $conn->query("DELETE FROM tbl_order_cancel_history WHERE RiderId = $rId");
        }
        
        // 4. Delete core profiles
        $conn->query("DELETE FROM tbl_shop WHERE UsrId = $usrId");
        $conn->query("DELETE FROM tbl_rider WHERE UsrId = $usrId");
        $conn->query("DELETE FROM tbl_userinfo WHERE UsrId = $usrId");
        
        $conn->commit();
        echo json_encode(['success' => true]);
        exit;
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}
?>
