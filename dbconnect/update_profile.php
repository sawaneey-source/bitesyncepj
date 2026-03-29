<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

/* CORS */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

/* Handle Preflight */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "dbconnect.php";

/* รับ JSON หรือ FormData */
$data = json_decode(file_get_contents("php://input"), true);

if(!$data && empty($_POST)){
    echo json_encode([
        "success"=>false,
        "message"=>"No data received"
    ]);
    exit;
}

// Merge data if needed
if ($data) {
    foreach($data as $k => $v) $_POST[$k] = $v;
}

$usrId = $_POST["id"] ?? "";
$fullName = $_POST["name"] ?? ""; // Standard user name
$phone = $_POST["phone"] ?? "";

// Restaurant specific fields
$shopName = $_POST["shopName"] ?? "";
$shopPhone = $_POST["shopPhone"] ?? "";
$shopCatType = $_POST["shopCatType"] ?? "";
$shopStatus = $_POST["shopStatus"] ?? "";
$shopLat = $_POST["shopLat"] ?? "";
$shopLng = $_POST["shopLng"] ?? "";
$address = $_POST["address"] ?? "";

if(empty($usrId)) {
    echo json_encode(["success"=>false, "message"=>"User ID is required"]);
    exit;
}

$uploadDir = '../public/uploads/profiles/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Handle Logo (usr_image)
$logoPath = null;
if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
    $fileExt = pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION);
    $fileName = 'logo_' . $usrId . '_' . time() . '.' . $fileExt;
    if (move_uploaded_file($_FILES['logo']['tmp_name'], $uploadDir . $fileName)) {
        $logoPath = '/uploads/profiles/' . $fileName;
    }
} else if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) { // Legacy support
    $fileExt = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $fileName = 'profile_' . $usrId . '_' . time() . '.' . $fileExt;
    if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $fileName)) {
        $logoPath = '/uploads/profiles/' . $fileName;
    }
}

// Handle Original Image (UsrImageOri)
$logoOriPath = null;
if (isset($_FILES['imageOri']) && $_FILES['imageOri']['error'] === UPLOAD_ERR_OK) {
    $fileExt = pathinfo($_FILES['imageOri']['name'], PATHINFO_EXTENSION);
    $fileName = 'profile_ori_' . $usrId . '_' . time() . '.' . $fileExt;
    if (move_uploaded_file($_FILES['imageOri']['tmp_name'], $uploadDir . $fileName)) {
        $logoOriPath = '/uploads/profiles/' . $fileName;
    }
}

// Handle Banner
$bannerPath = null;
if (isset($_FILES['banner']) && $_FILES['banner']['error'] === UPLOAD_ERR_OK) {
    $fileExt = pathinfo($_FILES['banner']['name'], PATHINFO_EXTENSION);
    $fileName = 'banner_' . $usrId . '_' . time() . '.' . $fileExt;
    if (move_uploaded_file($_FILES['banner']['tmp_name'], $uploadDir . $fileName)) {
        $bannerPath = '/uploads/profiles/' . $fileName;
    }
}

// Update User Info
$userUpdates = [];
$userParams = [];
$userTypes = "";
// Password change
$oldPw = $_POST['oldPw'] ?? '';
$newPw = $_POST['usrPassword'] ?? '';

if ($fullName) { $userUpdates[] = "UsrFullName = ?"; $userParams[] = $fullName; $userTypes .= "s"; }
if ($phone) { $userUpdates[] = "UsrPhone = ?"; $userParams[] = $phone; $userTypes .= "s"; }
if ($logoPath) { $userUpdates[] = "UsrImagePath = ?"; $userParams[] = $logoPath; $userTypes .= "s"; }
if ($logoOriPath) { $userUpdates[] = "UsrImageOriPath = ?"; $userParams[] = $logoOriPath; $userTypes .= "s"; }
if (!empty($newPw)) {
    // Verify old password first
    $chk = $conn->prepare("SELECT UsrPassword FROM tbl_userinfo WHERE UsrId = ?");
    $chk->bind_param("i", $usrId);
    $chk->execute();
    $chkRow = $chk->get_result()->fetch_assoc();
    if (!$chkRow || !password_verify($oldPw, $chkRow['UsrPassword'])) {
        echo json_encode(["success" => false, "message" => "รหัสผ่านเดิมไม่ถูกต้อง ไม่สามารถเปลี่ยนรหัสผ่านได้"], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $userUpdates[] = "UsrPassword = ?"; $userParams[] = password_hash($newPw, PASSWORD_DEFAULT); $userTypes .= "s";
}

// Note: UsrAddress is deprecated and managed via tbl_address

if (!empty($userUpdates)) {
    $sqlUser = "UPDATE tbl_userinfo SET " . implode(", ", $userUpdates) . " WHERE UsrId = ?";
    $userParams[] = $usrId;
    $userTypes .= "i";
    $stmtUser = $conn->prepare($sqlUser);
    $stmtUser->bind_param($userTypes, ...$userParams);
    $stmtUser->execute();
}

// Update Shop Info (if user is restaurant/shop)
$shopUpdates = [];
$shopParams = [];
$shopTypes = "";
if ($shopName) { $shopUpdates[] = "ShopName = ?"; $shopParams[] = $shopName; $shopTypes .= "s"; }
if ($shopPhone) { $shopUpdates[] = "ShopPhone = ?"; $shopParams[] = $shopPhone; $shopTypes .= "s"; }
if ($shopCatType) { $shopUpdates[] = "ShopCatType = ?"; $shopParams[] = $shopCatType; $shopTypes .= "s"; }
if ($shopStatus) { $shopUpdates[] = "ShopStatus = ?"; $shopParams[] = $shopStatus; $shopTypes .= "s"; }
// ShopLat and ShopLng are now managed in tbl_address
if ($bannerPath) { $shopUpdates[] = "ShopBannerPath = ?"; $shopParams[] = $bannerPath; $shopTypes .= "s"; }

if (!empty($shopUpdates)) {
    $sqlShop = "UPDATE tbl_shop SET " . implode(", ", $shopUpdates) . " WHERE UsrId = ?";
    $shopParams[] = $usrId;
    $shopTypes .= "i";
    $stmtShop = $conn->prepare($sqlShop);
    $stmtShop->bind_param($shopTypes, ...$shopParams);
    $stmtShop->execute();
}

// Refresh User Data (Join tbl_userinfo and tbl_shop)
$sql_refresh = "SELECT u.UsrId as id, u.UsrFullName as name, u.UsrEmail as email, u.UsrPhone as phone, 
                       u.UsrRole as role, u.UsrImagePath as image, u.UsrImageOriPath as imageOri,
                       CONCAT(COALESCE(a.HouseNo,''), ' ', COALESCE(a.SubDistrict,''), ' ', COALESCE(a.District,''), ' ', COALESCE(a.Province,''), ' ', COALESCE(a.Zipcode,'')) as address,
                       s.ShopName as shopName, s.ShopPhone as shopPhone, s.ShopCatType as shopCatType, 
                       s.ShopStatus as shopStatus, a.AdrLat as shopLat, a.AdrLng as shopLng, 
                       s.ShopBannerPath as banner 
                FROM tbl_userinfo u 
                LEFT JOIN tbl_shop s ON u.UsrId = s.UsrId 
                LEFT JOIN tbl_address a ON u.UsrId = a.UsrId AND a.IsDefault = 1
                WHERE u.UsrId = ?";
$stmt_refresh = $conn->prepare($sql_refresh);
$stmt_refresh->bind_param("i", $usrId);
$stmt_refresh->execute();
$updated_user = $stmt_refresh->get_result()->fetch_assoc();

echo json_encode([
    "success" => true,
    "message" => "บันทึกข้อมูลสำเร็จเรียบร้อยแล้ว",
    "user" => $updated_user
]);

$conn->close();
?>
