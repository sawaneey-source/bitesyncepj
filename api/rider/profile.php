<?php
// Suppress HTML errors to prevent JSON corruption
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED); 

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";
mysqli_set_charset($conn, "utf8mb4");

function get_auth_header() {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) return $_SERVER['HTTP_AUTHORIZATION'];
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) return $headers['Authorization'];
    }
    return null;
}

/* ── GET: Fetch rider profile ── */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $usrId = $_GET['usrId'] ?? null;
    if (!$usrId || !is_numeric($usrId)) {
        $auth = get_auth_header();
        if ($auth) {
            $token = str_replace('Bearer ', '', $auth);
            if (is_numeric($token)) $usrId = $token;
        }
    }
    
    if (!$usrId || !is_numeric($usrId)) {
        exit(json_encode(["success"=>false, "message"=>"Valid numeric usrId required"]));
    }

    // 1. Get User Info (Portable method without get_result)
    $uSql = "SELECT UsrFullName, UsrPhone, UsrEmail, UsrImagePath FROM tbl_userinfo WHERE UsrId = ?";
    $uStmt = $conn->prepare($uSql);
    $uStmt->bind_param("i", $usrId);
    $uStmt->execute();
    $uStmt->store_result();
    
    $uRow = null;
    if ($uStmt->num_rows > 0) {
        $uStmt->bind_result($name, $phone, $email, $img);
        $uStmt->fetch();
        $uRow = ["UsrFullName"=>$name, "UsrPhone"=>$phone, "UsrEmail"=>$email, "UsrImagePath"=>$img];
    }
    $uStmt->close();

    if (!$uRow) {
        exit(json_encode(["success"=>false, "message"=>"UsrId $usrId not found in tbl_userinfo"]));
    }

    // 2. Get Rider Details
    $rSql = "SELECT RiderVehicleType, RiderVehiclePlate, RiderVehicleColor, RiderBankName, RiderBankAccount, EmergencyPhone, RiderRatingAvg, RiderRatingCount, RiderBalance, RiderStatus FROM tbl_rider WHERE UsrId = ?";
    $rStmt = $conn->prepare($rSql);
    $rStmt->bind_param("i", $usrId);
    $rStmt->execute();
    $rStmt->store_result();
    
    $rRow = null;
    if ($rStmt->num_rows > 0) {
        $rStmt->bind_result($vType, $vPlate, $vColor, $vBank, $vAcc, $vEmer, $rRating, $rCount, $rBalance, $rStatus);
        $rStmt->fetch();
        $rRow = [
            "RiderVehicleType"=>$vType, "RiderVehiclePlate"=>$vPlate, "RiderVehicleColor"=>$vColor, 
            "RiderBankName"=>$vBank, "RiderBankAccount"=>$vAcc, "EmergencyPhone"=>$vEmer, 
            "RiderRatingAvg"=>$rRating, "RiderRatingCount"=>$rCount, "RiderBalance"=>$rBalance, "RiderStatus"=>$rStatus
        ];
    }
    $rStmt->close();

    // Map DB to Frontend JSON
    $data = [
        "name" => $uRow['UsrFullName'] ?? '',
        "phone" => $uRow['UsrPhone'] ?? '',
        "vehicle" => $rRow['RiderVehicleType'] ?? '',
        "plate" => $rRow['RiderVehiclePlate'] ?? '',
        "color" => $rRow['RiderVehicleColor'] ?? '',
        "bankName" => $rRow['RiderBankName'] ?? '',
        "bankAccount" => $rRow['RiderBankAccount'] ?? '',
        "emergency" => $rRow['EmergencyPhone'] ?? '',
        "img" => $uRow['UsrImagePath'] ? 'http://localhost/bitesync/public' . $uRow['UsrImagePath'] : null,
        "rating" => $rRow['RiderRatingAvg'] ?? 0,
        "ratingCount" => $rRow['RiderRatingCount'] ?? 0,
        "balance" => $rRow['RiderBalance'] ?? 0,
        "status" => $rRow['RiderStatus'] ?? 'Offline'
    ];
    
    echo json_encode([
        "success" => true, 
        "data" => $data, 
        "debug" => [ "usrId" => $usrId, "user_found" => !!$uRow, "rider_found" => !!$rRow ]
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

/* ── PUT/POST: Update rider profile ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = $_POST;
    $usrId = $data['usrId'] ?? null;

    if (!is_numeric($usrId)) {
        $auth = get_auth_header();
        if ($auth) {
            $token = str_replace('Bearer ', '', $auth);
            if (is_numeric($token)) $usrId = $token;
        }
    }

    if (!$usrId || !is_numeric($usrId)) {
        exit(json_encode(["success"=>false, "message"=>"Numeric usrId required for saving"]));
    }

    // 1. Update User Info
    $uAffected = 0;
    if (isset($data['name']) || isset($data['phone'])) {
        $uSql = "UPDATE tbl_userinfo SET UsrFullName = ?, UsrPhone = ? WHERE UsrId = ?";
        $uStmt = $conn->prepare($uSql);
        if (!$uStmt) exit(json_encode(["success"=>false, "message" => "UserInfo Prepare failed: " . $conn->error]));
        $uStmt->bind_param("ssi", $data['name'], $data['phone'], $usrId);
        $uStmt->execute();
        $uAffected = $uStmt->affected_rows;
        $uStmt->close();
    }

    // 2. Handle Image Upload
    $imgPath = null; $iAffected = 0;
    if (!empty($_FILES['image']['name'])) {
        $uploadDir = dirname(__FILE__) . "/../../public/uploads/profiles/";
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
        $newName = 'rider_' . $usrId . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $newName)) {
            $imgPath = '/uploads/profiles/' . $newName;
            $iSql = "UPDATE tbl_userinfo SET UsrImagePath = ? WHERE UsrId = ?";
            $iStmt = $conn->prepare($iSql);
            $iStmt->bind_param("si", $imgPath, $usrId);
            $iStmt->execute();
            $iAffected = $iStmt->affected_rows;
            $iStmt->close();
        }
    }

    // 3. Update Rider Table
    $vType = $data['vehicle'] ?? '';
    $vPlate = $data['plate'] ?? '';
    $vColor = $data['color'] ?? '';
    $vBank = $data['bankName'] ?? '';
    $vAcc = $data['bankAccount'] ?? '';
    $vEmer = $data['emergency'] ?? '';

    $rSql = "UPDATE tbl_rider SET 
             RiderVehicleType = ?, 
             RiderVehiclePlate = ?, 
             RiderVehicleColor = ?, 
             RiderBankName = ?, 
             RiderBankAccount = ?, 
             EmergencyPhone = ? 
             WHERE UsrId = ?";
    $rStmt = $conn->prepare($rSql);
    if (!$rStmt) exit(json_encode(["success"=>false, "message" => "Rider Prepare failed: " . $conn->error]));
    $rStmt->bind_param("ssssssi", $vType, $vPlate, $vColor, $vBank, $vAcc, $vEmer, $usrId);
    
    $rAffected = 0;
    if ($rStmt->execute()) {
        $rAffected = $rStmt->affected_rows;
        if ($rAffected === 0) {
            $chk = $conn->prepare("SELECT UsrId FROM tbl_rider WHERE UsrId = ?");
            $chk->bind_param("i", $usrId);
            $chk->execute();
            $chk->store_result();
            if ($chk->num_rows === 0) {
                $ins = $conn->prepare("INSERT INTO tbl_rider (UsrId, RiderVehicleType, RiderVehiclePlate, RiderVehicleColor, RiderBankName, RiderBankAccount, EmergencyPhone, RiderStatus) VALUES (?, ?, ?, ?, ?, ?, ?, 'Offline')");
                $ins->bind_param("issssss", $usrId, $vType, $vPlate, $vColor, $vBank, $vAcc, $vEmer);
                $ins->execute();
                $rAffected = 1;
                $ins->close();
            }
            $chk->close();
        }
        $rStmt->close();
        echo json_encode(["success"=>true, "message"=>"บันทึกสำเร็จ UsrId: $usrId | User($uAffected) Rider($rAffected) Img($iAffected)"]);
    } else {
        echo json_encode(["success"=>false, "message" => "Rider Execute failed: " . $rStmt->error]);
    }
    exit();
}
?>
