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

    // 1. Get User Info
    $uSql = "SELECT UsrFullName, UsrPhone, UsrEmail, UsrImagePath, UsrImageOriPath FROM tbl_userinfo WHERE UsrId = ?";
    $uStmt = $conn->prepare($uSql);
    $uStmt->bind_param("i", $usrId);
    $uStmt->execute();
    $uRow = $uStmt->get_result()->fetch_assoc();
    $uStmt->close();

    if (!$uRow) {
        exit(json_encode(["success"=>false, "message"=>"UsrId $usrId not found in tbl_userinfo"]));
    }

    // 2. Get Rider Details
    $rSql = "SELECT RiderId, RiderVehicleType, RiderVehiclePlate, RiderVehicleColor, RiderBankName, RiderBankAccount, EmergencyPhone, RiderStatus, RiderBalance, RiderTotalSettled FROM tbl_rider WHERE UsrId = ?";
    $rStmt = $conn->prepare($rSql);
    $rStmt->bind_param("i", $usrId);
    $rStmt->execute();
    $rStmt->store_result();
    
    $rRow = null; 
    $rId = 0; $currentBalance = 0; $totalPaid = 0;
    if ($rStmt->num_rows > 0) {
        $rStmt->bind_result($rId, $vType, $vPlate, $vColor, $vBank, $vAcc, $vEmer, $rStatus, $currentBalance, $totalPaid);
        $rStmt->fetch();
        $rRow = [
            "RiderId"=>$rId, "RiderVehicleType"=>$vType, "RiderVehiclePlate"=>$vPlate, "RiderVehicleColor"=>$vColor, 
            "RiderBankName"=>$vBank, "RiderBankAccount"=>$vAcc, "EmergencyPhone"=>$vEmer, "RiderStatus"=>$rStatus
        ];
    }
    $rStmt->close();

    // 3. Dynamically Calculate Stats from tbl_order (Rating and Jobs only)
    $rating = 0.0; $jobs = 0;
    if ($rId) {
        // Average Rating
        $q1 = $conn->prepare("SELECT AVG(RiderRating) as avgR, COUNT(RiderRating) as cntR FROM tbl_order WHERE RiderId = ? AND RiderRating IS NOT NULL");
        $q1->bind_param("i", $rId);
        $q1->execute();
        $res1 = $q1->get_result()->fetch_assoc();
        $rating = (float)($res1['avgR'] ?? 0);
        $q1->close();

        // Completed Jobs
        $q2 = $conn->prepare("SELECT COUNT(*) as totalJobs FROM tbl_order WHERE RiderId = ? AND OdrStatus = 6");
        $q2->bind_param("i", $rId);
        $q2->execute();
        $res2 = $q2->get_result()->fetch_assoc();
        $jobs = (int)($res2['totalJobs'] ?? 0);
        $q2->close();
    }

    // Map DB to Frontend JSON
    $data = [
        "name" => $uRow['UsrFullName'] ?? '',
        "phone" => $uRow['UsrPhone'] ?? '',
        "email" => $uRow['UsrEmail'] ?? '',
        "vehicle" => $rRow['RiderVehicleType'] ?? '',
        "plate" => $rRow['RiderVehiclePlate'] ?? '',
        "color" => $rRow['RiderVehicleColor'] ?? '',
        "bankName" => $rRow['RiderBankName'] ?? '',
        "bankAccount" => $rRow['RiderBankAccount'] ?? '',
        "emergency" => $rRow['EmergencyPhone'] ?? '',
        "img" => $uRow['UsrImagePath'] ? 'http://localhost/bitesync/public' . $uRow['UsrImagePath'] : null,
        "imgOri" => $uRow['UsrImageOriPath'] ? 'http://localhost/bitesync/public' . $uRow['UsrImageOriPath'] : null,
        "rating" => round($rating, 1),
        "ratingCount" => $jobs,
        "balance" => (float)$totalPaid,
        "outstanding" => (float)$currentBalance,
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

    // 1. Update User Info & Password
    $uAffected = 0;
    if (isset($data['name']) || isset($data['phone']) || isset($data['usrPassword'])) {
        // Password Change Logic
        $pwSql = "";
        $params = [];
        $types = "";

        if (!empty($data['usrPassword'])) {
            // Check Old Password
            $chk = $conn->prepare("SELECT UsrPassword FROM tbl_userinfo WHERE UsrId = ?");
            $chk->bind_param("i", $usrId);
            $chk->execute();
            $chkRes = $chk->get_result()->fetch_assoc();
            
            if (!$chkRes || !password_verify($data['oldPw'], $chkRes['UsrPassword'])) {
                exit(json_encode(["success" => false, "message" => "รหัสผ่านเดิมไม่ถูกต้อง ไม่สามารถเปลี่ยนรหัสผ่านได้"]));
            }
            
            $newHash = password_hash($data['usrPassword'], PASSWORD_DEFAULT);
            $uSql = "UPDATE tbl_userinfo SET UsrFullName = ?, UsrPhone = ?, UsrPassword = ? WHERE UsrId = ?";
            $uStmt = $conn->prepare($uSql);
            $uStmt->bind_param("sssi", $data['name'], $data['phone'], $newHash, $usrId);
        } else {
            $uSql = "UPDATE tbl_userinfo SET UsrFullName = ?, UsrPhone = ? WHERE UsrId = ?";
            $uStmt = $conn->prepare($uSql);
            $uStmt->bind_param("ssi", $data['name'], $data['phone'], $usrId);
        }

        if (!$uStmt) exit(json_encode(["success"=>false, "message" => "UserInfo Prepare failed: " . $conn->error]));
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

    // 2b. Handle Original Image Upload (for re-crop later)
    if (!empty($_FILES['imageOri']['name'])) {
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        $extOri = strtolower(pathinfo($_FILES['imageOri']['name'], PATHINFO_EXTENSION));
        $nameOri = 'rider_ori_' . $usrId . '_' . time() . '.' . $extOri;
        if (move_uploaded_file($_FILES['imageOri']['tmp_name'], $uploadDir . $nameOri)) {
            $imgOriPath = '/uploads/profiles/' . $nameOri;
            $ioSql = "UPDATE tbl_userinfo SET UsrImageOriPath = ? WHERE UsrId = ?";
            $ioStmt = $conn->prepare($ioSql);
            $ioStmt->bind_param("si", $imgOriPath, $usrId);
            $ioStmt->execute();
            $ioStmt->close();
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
    } else {
        exit(json_encode(["success"=>false, "message" => "Rider Execute failed: " . $rStmt->error]));
    }

    // 4. Return Fresh Data
    $sqlLoad = "SELECT u.UsrFullName, u.UsrPhone, u.UsrEmail, u.UsrImagePath, u.UsrImageOriPath, 
                       r.RiderVehicleType, r.RiderVehiclePlate, r.RiderVehicleColor, r.RiderBankName, r.RiderBankAccount, r.EmergencyPhone,
                       r.RiderBalance, r.RiderTotalSettled, r.RiderId
                FROM tbl_userinfo u 
                LEFT JOIN tbl_rider r ON u.UsrId = r.UsrId
                WHERE u.UsrId = ?";
    $sLoad = $conn->prepare($sqlLoad);
    $sLoad->bind_param("i", $usrId);
    $sLoad->execute();
    $r = $sLoad->get_result()->fetch_assoc();
    
    $rId = $r['RiderId'] ?? 0;
    $rating = 0.0; $jobs = 0;
    if ($rId) {
        $q1 = $conn->prepare("SELECT AVG(RiderRating) as avgR, COUNT(RiderRating) as cntR FROM tbl_order WHERE RiderId = ? AND RiderRating IS NOT NULL");
        $q1->bind_param("i", $rId); $q1->execute();
        $res1 = $q1->get_result()->fetch_assoc();
        $rating = (float)($res1['avgR'] ?? 0);
        $q1->close();

        $q2 = $conn->prepare("SELECT COUNT(*) as totalJobs FROM tbl_order WHERE RiderId = ? AND OdrStatus = 6");
        $q2->bind_param("i", $rId); $q2->execute();
        $res2 = $q2->get_result()->fetch_assoc();
        $jobs = (int)($res2['totalJobs'] ?? 0);
        $q2->close();
    }

    $fullData = [
        "name" => $r['UsrFullName'] ?? '',
        "phone" => $r['UsrPhone'] ?? '',
        "email" => $r['UsrEmail'] ?? '',
        "vehicle" => $r['RiderVehicleType'] ?? '',
        "plate" => $r['RiderVehiclePlate'] ?? '',
        "color" => $r['RiderVehicleColor'] ?? '',
        "bankName" => $r['RiderBankName'] ?? '',
        "bankAccount" => $r['RiderBankAccount'] ?? '',
        "emergency" => $r['EmergencyPhone'] ?? '',
        "img" => $r['UsrImagePath'] ? 'http://localhost/bitesync/public' . $r['UsrImagePath'] : null,
        "imgOri" => $r['UsrImageOriPath'] ? 'http://localhost/bitesync/public' . $r['UsrImageOriPath'] : null,
        "rawImg" => $r['UsrImagePath'] ?? null,
        "rawImgOri" => $r['UsrImageOriPath'] ?? null,
        "rating" => round($rating, 1),
        "ratingCount" => $jobs,
        "balance" => (float)($r['RiderTotalSettled'] ?? 0),
        "outstanding" => (float)($r['RiderBalance'] ?? 0)
    ];

    echo json_encode(["success"=>true, "message"=>"บันทึกข้อมูลส่วนตัวสำเร็จ ✅", "data"=>$fullData], JSON_UNESCAPED_UNICODE);
    exit();
}
?>
