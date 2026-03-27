<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$usrId = $_GET['usrId'] ?? null;
if (!$usrId) exit(json_encode(["success"=>false, "message"=>"User ID required"]));

$sql = "SELECT ShopId, ShopName, ShopLogoPath, ShopStatus FROM tbl_shop WHERE UsrId = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $usrId);
$stmt->execute();
$res = $stmt->get_result();
$shop = $res->fetch_assoc();

if (!$shop) {
    // Auto-create shop record for new restaurant users
    $uStmt = $conn->prepare("SELECT UsrFullName FROM tbl_userinfo WHERE UsrId = ?");
    $uStmt->bind_param("i", $usrId);
    $uStmt->execute();
    $uRes = $uStmt->get_result()->fetch_assoc();
    $defaultName = $uRes ? $uRes['UsrFullName'] : 'ร้านค้าของฉัน';

    $ins = $conn->prepare("INSERT INTO tbl_shop (UsrId, ShopName, ShopCatType, ShopStatus) VALUES (?, ?, 'อาหารตามสั่ง', 1)");
    $ins->bind_param("is", $usrId, $defaultName);
    if ($ins->execute()) {
        $shop = ["ShopId" => $conn->insert_id, "ShopName" => $defaultName, "ShopLogoPath" => null];
    }
}

if ($shop) {
    if (!empty($shop['ShopLogoPath'])) {
        $shop['ShopLogoPath'] = 'http://localhost/bitesync/public' . $shop['ShopLogoPath'];
    }
    echo json_encode(["success"=>true, "data"=>$shop]);
} else {
    echo json_encode(["success"=>false, "message"=>"Failed to create or find shop"]);
}

$conn->close();
?>
