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

/* รับ JSON */
$data = json_decode(file_get_contents("php://input"), true);

if(!$data){
    echo json_encode([
        "success"=>false,
        "message"=>"No data received"
    ]);
    exit;
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

// Handle Banner
$bannerPath = null;
if (isset($_FILES['banner']) && $_FILES['banner']['error'] === UPLOAD_ERR_OK) {
    $fileExt = pathinfo($_FILES['banner']['name'], PATHINFO_EXTENSION);
    $fileName = 'banner_' . $usrId . '_' . time() . '.' . $fileExt;
    if (move_uploaded_file($_FILES['banner']['tmp_name'], $uploadDir . $fileName)) {
        $bannerPath = '/uploads/profiles/' . $fileName;
    }
}

// Prepare Dynamic Update
$sql = "UPDATE tbl_userinfo SET ";
$updates = [];
$params = [];
$types = "";

if ($fullName) { $updates[] = "UsrFullName = ?"; $params[] = $fullName; $types .= "s"; }
if ($phone) { $updates[] = "UsrPhone = ?"; $params[] = $phone; $types .= "s"; }
if ($logoPath) { $updates[] = "UsrImage = ?"; $params[] = $logoPath; $types .= "s"; }

// Add restaurant fields if they are provided
if ($shopName) { $updates[] = "ShopName = ?"; $params[] = $shopName; $types .= "s"; }
if ($shopPhone) { $updates[] = "ShopPhone = ?"; $params[] = $shopPhone; $types .= "s"; }
if ($shopCatType) { $updates[] = "ShopCatType = ?"; $params[] = $shopCatType; $types .= "s"; }
if ($shopStatus) { $updates[] = "ShopStatus = ?"; $params[] = $shopStatus; $types .= "s"; }
if ($shopLat) { $updates[] = "ShopLat = ?"; $params[] = $shopLat; $types .= "s"; }
if ($shopLng) { $updates[] = "ShopLng = ?"; $params[] = $shopLng; $types .= "s"; }
if ($bannerPath) { $updates[] = "ShopBannerPath = ?"; $params[] = $bannerPath; $types .= "s"; }
if ($address) { $updates[] = "UsrAddress = ?"; $params[] = $address; $types .= "s"; }

if (empty($updates)) {
    echo json_encode(["success"=>false, "message"=>"No fields to update"]);
    exit;
}

$sql .= implode(", ", $updates);
$sql .= " WHERE UsrId = ?";
$params[] = $usrId;
$types .= "i";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if($stmt->execute()){
    // Refresh User Data (Include new Shop fields)
    $sql_refresh = "SELECT UsrId as id, UsrFullName as name, UsrEmail as email, UsrPhone as phone, UsrRole as role, UsrImage as image, 
                           ShopName as shopName, ShopPhone as shopPhone, ShopCatType as shopCatType, ShopStatus as shopStatus, 
                           ShopLat as shopLat, ShopLng as shopLng, ShopBannerPath as banner, UsrAddress as address 
                    FROM tbl_userinfo WHERE UsrId = ?";
    $stmt_refresh = $conn->prepare($sql_refresh);
    $stmt_refresh->bind_param("i", $usrId);
    $stmt_refresh->execute();
    $updated_user = $stmt_refresh->get_result()->fetch_assoc();

    echo json_encode([
        "success" => true,
        "message" => "บันทึกข้อมูลสำเร็จเรียบร้อยแล้ว",
        "user" => $updated_user
    ]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . $conn->error]);
}

$stmt->close();
$conn->close();
?>
