<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";

// For demo/dev: get the first active order
// 1. Get UsrId from frontend
$usrId = $_GET['usrId'] ?? 0;

if (!$usrId) {
    echo json_encode(['success' => false, 'message' => 'Missing User ID']);
    exit();
}

// 2. Lookup RiderId
$rStmt = $conn->prepare("SELECT RiderId FROM tbl_rider WHERE UsrId = ?");
$rStmt->bind_param("i", $usrId);
$rStmt->execute();
$rRes = $rStmt->get_result();
if ($rRow = $rRes->fetch_assoc()) {
    $actualRiderId = $rRow['RiderId'];
} else {
    echo json_encode(['success' => false, 'message' => 'No Rider profile found']);
    exit();
}

// 3. Find active job strictly for this rider
$sql = "SELECT o.OdrId as id, o.OdrStatus as status, o.OdrFoodPrice as subtotal, o.OdrDelFee as fee, o.OdrGrandTotal as total,
               a.Province as custProv, a.District as custDist, a.SubDistrict as custSub, a.HouseNo as custHouse, a.Zipcode as custZip,
               u.UsrFullName as custName, u.UsrPhone as custPhone,
               s.ShopName as shopName, s.ShopPhone as shopPhone,
               sa.Province as shopProv, sa.District as shopDist, sa.SubDistrict as shopSub, sa.HouseNo as shopHouse, sa.Zipcode as shopZip, sa.Village as shopVillage, sa.Road as shopRoad
        FROM tbl_order o
        LEFT JOIN tbl_address a ON o.AdrId = a.AdrId
        LEFT JOIN tbl_userinfo u ON o.UsrId = u.UsrId
        LEFT JOIN tbl_shop s ON o.ShopId = s.ShopId
        LEFT JOIN tbl_address sa ON s.AdrId = sa.AdrId
        WHERE o.RiderId = ? AND o.OdrStatus IN (3, 4, 5)
        ORDER BY o.OdrId DESC LIMIT 1";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $actualRiderId);
$stmt->execute();
$res = $stmt->get_result();
$job = $res->fetch_assoc();

if ($job) {
    // Fetch items
    $orderId = $job['id'];
    $stmtItems = $conn->prepare("SELECT f.FoodName as name, od.OdtQty as qty, od.OdtUnitPrice as price 
                                 FROM tbl_order_detail od 
                                 LEFT JOIN tbl_food f ON od.FoodId = f.FoodId 
                                 WHERE od.OdrId = ?");
    $stmtItems->bind_param("i", $orderId);
    $stmtItems->execute();
    $resItems = $stmtItems->get_result();
    $items = [];
    while ($row = $resItems->fetch_assoc()) {
        $items[] = $row;
    }
    $job['items'] = $items;
    
    // Map status to rider step (0: assigned/at shop, 1: delivering to customer)
    // OdrStatus: 3=Preparing, 4=Ready, 5=Delivering
    if ($job['status'] == 5) {
        $job['step'] = 1; // Delivering
    } else {
        $job['step'] = 0; // Preparing or Ready (Go to Shop)
    }
    
    // Status text for UI logic
    $statusMap = [1=>'Pending', 2=>'New', 3=>'Preparing', 4=>'Ready', 5=>'Delivering'];
    $job['statusLabel'] = $statusMap[$job['status']] ?? 'Processing';
    
    // Prepend '#' for UI
    $job['idRaw'] = $job['id'];
    $job['id'] = '#' . $job['id'];
    
    // Format full addresses
    $job['custAddr'] = $job['custHouse'] . ' ' . $job['custSub'] . ' ' . $job['custDist'] . ' ' . $job['custProv'] . ' ' . $job['custZip'];
    $job['shopAddr'] = $job['shopHouse'] . ' ' . ($job['shopVillage'] ? $job['shopVillage'].' ' : '') . ($job['shopRoad'] ? $job['shopRoad'].' ' : '') . $job['shopSub'] . ' ' . $job['shopDist'] . ' ' . $job['shopProv'];

    echo json_encode(['success' => true, 'data' => $job]);
} else {
    echo json_encode(['success' => false, 'message' => 'No active job found']);
}
?>
