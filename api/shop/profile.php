<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

/* ── GET: Fetch shop profile ── */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $usrId  = $_GET['usrId']  ?? null;
    $shopId = $_GET['shopId'] ?? null;
    
    if (!$usrId && !$shopId) exit(json_encode(["success"=>false, "message"=>"usrId or shopId required"]));

    $sql = "SELECT s.ShopId, s.ShopName, s.ShopPhone, s.ShopCatType, s.ShopStatus,
                   s.ShopLogoPath, s.ShopBannerPath, s.ShopLogoOriPath, s.ShopBannerOriPath, s.ShopPrepTime,
                   a.AdrId, a.HouseNo, a.Village, a.Road, a.Soi, a.Moo,
                   a.SubDistrict, a.District, a.Province, a.Zipcode, a.AdrLat, a.AdrLng,
                   s.ShopBankName, s.ShopBankAccount, s.ShopBalance, s.ShopTotalSettled,
                   u.UsrFullName, u.UsrEmail, u.UsrPhone
            FROM tbl_shop s
            LEFT JOIN tbl_address a ON s.AdrId = a.AdrId
            LEFT JOIN tbl_userinfo u ON s.UsrId = u.UsrId
            WHERE " . ($shopId ? "s.ShopId = ?" : "s.UsrId = ?");
    
    $stmt = $conn->prepare($sql);
    $idParam = $shopId ? $shopId : $usrId;
    $stmt->bind_param("i", $idParam);
    $stmt->execute();
    $shop = $stmt->get_result()->fetch_assoc();

    if (!$shop) {
        $uStmt = $conn->prepare("SELECT UsrFullName FROM tbl_userinfo WHERE UsrId = ?");
        $uStmt->bind_param("i", $usrId);
        $uStmt->execute();
        $uRes = $uStmt->get_result()->fetch_assoc();
        $defaultName = $uRes ? $uRes['UsrFullName'] : 'ร้านค้าของฉัน';

        $ins = $conn->prepare("INSERT INTO tbl_shop (UsrId, ShopName, ShopCatType, ShopStatus) VALUES (?, ?, 'อาหารตามสั่ง', 1)");
        $ins->bind_param("is", $usrId, $defaultName);
        $ins->execute();

        // Re-fetch
        $stmt->execute();
        $shop = $stmt->get_result()->fetch_assoc();
    }

    if (!$shop) exit(json_encode(["success"=>false, "message"=>"Shop not found and could not be created"]));

    // Apache serves from htdocs — <img> tags can load cross-origin without CORS issues
    $pub = 'http://localhost/bitesync/public';
    if (!empty($shop['ShopLogoPath']))       $shop['ShopLogoPath']      = $pub . $shop['ShopLogoPath'];
    if (!empty($shop['ShopBannerPath']))     $shop['ShopBannerPath']    = $pub . $shop['ShopBannerPath'];
    if (!empty($shop['ShopLogoOriPath']))    $shop['ShopLogoOriPath']   = $pub . $shop['ShopLogoOriPath'];
    if (!empty($shop['ShopBannerOriPath']))  $shop['ShopBannerOriPath'] = $pub . $shop['ShopBannerOriPath'];

    echo json_encode(["success"=>true, "data"=>$shop], JSON_UNESCAPED_UNICODE);
    exit();
}

/* ── POST: Update shop profile ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usrId      = $_POST['usrId']      ?? null;
    $shopName   = $_POST['shopName']   ?? null;
    $shopPhone  = $_POST['shopPhone']  ?? null;
    $shopCat    = $_POST['shopCatType']?? null;
    $shopStatusVal = $_POST['status'] ?? $_POST['shopStatus'] ?? null;
    $shopStatus = null;
    if ($shopStatusVal !== null) {
        if ($shopStatusVal === 'available' || $shopStatusVal === '1' || $shopStatusVal === 1) $shopStatus = 1;
        else $shopStatus = 0;
    }
    $prepTime   = $_POST['shopPrepTime'] ?? null;
    $bankName   = $_POST['shopBankName'] ?? null;
    $bankAcc    = $_POST['shopBankAccount'] ?? null;

    // Address fields
    $houseNo     = $_POST['houseNo']     ?? '';
    $village     = $_POST['village']     ?? '';
    $road        = $_POST['road']        ?? '';
    $soi         = $_POST['soi']         ?? '';
    $moo         = $_POST['moo']         ?? '';
    $subDistrict = $_POST['subDistrict'] ?? '';
    $district    = $_POST['district']    ?? '';
    $province    = $_POST['province']    ?? '';
    $zipcode     = $_POST['zipcode']     ?? '';
    $adrLat      = $_POST['adrLat']      ?? null;
    $adrLng      = $_POST['adrLng']      ?? null;

    // User info fields
    $usrFullName = $_POST['usrFullName'] ?? null;
    $usrPhone    = $_POST['usrPhone'] ?? null;
    $oldPw       = $_POST['oldPw'] ?? null;
    $usrPassword = $_POST['usrPassword'] ?? null;

    if (!$usrId) exit(json_encode(["success"=>false, "message"=>"usrId required"]));

    // Get ShopId and AdrId
    $r = $conn->prepare("SELECT ShopId, AdrId FROM tbl_shop WHERE UsrId = ?");
    $r->bind_param("i", $usrId);
    $r->execute();
    $row = $r->get_result()->fetch_assoc();
    if (!$row) exit(json_encode(["success"=>false, "message"=>"Shop not found for this user"]));
    $shopId = $row['ShopId'];
    $adrId  = $row['AdrId'];

    // ── Handle logo upload ──
    $uploadDir = dirname(__FILE__) . "/../../public/uploads/profiles/";
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    $logoPath   = null;
    $bannerPath = null;
    $logoOriPath = null;
    $bannerOriPath = null;

    if (!empty($_FILES['logo']['name'])) {
        $ext  = strtolower(pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION));
        $name = 'logo_' . $shopId . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['logo']['tmp_name'], $uploadDir . $name)) {
            $logoPath = '/uploads/profiles/' . $name;
        }
    }
    if (!empty($_FILES['logoOri']['name'])) {
        $ext  = strtolower(pathinfo($_FILES['logoOri']['name'], PATHINFO_EXTENSION));
        $name = 'logo_ori_' . $shopId . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['logoOri']['tmp_name'], $uploadDir . $name)) {
            $logoOriPath = '/uploads/profiles/' . $name;
        }
    }

    if (!empty($_FILES['banner']['name'])) {
        $ext  = strtolower(pathinfo($_FILES['banner']['name'], PATHINFO_EXTENSION));
        $name = 'banner_' . $shopId . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['banner']['tmp_name'], $uploadDir . $name)) {
            $bannerPath = '/uploads/profiles/' . $name;
        }
    }
    if (!empty($_FILES['bannerOri']['name'])) {
        $ext  = strtolower(pathinfo($_FILES['bannerOri']['name'], PATHINFO_EXTENSION));
        $name = 'banner_ori_' . $shopId . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['bannerOri']['tmp_name'], $uploadDir . $name)) {
            $bannerOriPath = '/uploads/profiles/' . $name;
        }
    }

    // ── Update tbl_shop ──
    $shopUpdates = [];
    $shopParams  = [];
    $shopTypes   = "";

    if ($shopName   !== null) { $shopUpdates[] = "ShopName = ?";    $shopParams[] = $shopName;   $shopTypes .= "s"; }
    if ($shopPhone  !== null) { $shopUpdates[] = "ShopPhone = ?";   $shopParams[] = $shopPhone;  $shopTypes .= "s"; }
    if ($shopCat    !== null) { $shopUpdates[] = "ShopCatType = ?"; $shopParams[] = $shopCat;    $shopTypes .= "s"; }
    if ($shopStatus !== null) { $shopUpdates[] = "ShopStatus = ?";  $shopParams[] = $shopStatus; $shopTypes .= "i"; }
    if ($prepTime   !== null) { $shopUpdates[] = "ShopPrepTime = ?";$shopParams[] = (int)$prepTime; $shopTypes .= "i"; }
    if ($logoPath)            { $shopUpdates[] = "ShopLogoPath = ?";$shopParams[] = $logoPath;   $shopTypes .= "s"; }
    if ($bannerPath)          { $shopUpdates[] = "ShopBannerPath = ?";$shopParams[] = $bannerPath;$shopTypes .= "s"; }
    if ($logoOriPath)         { $shopUpdates[] = "ShopLogoOriPath = ?";$shopParams[] = $logoOriPath; $shopTypes .= "s"; }
    if ($bannerOriPath)       { $shopUpdates[] = "ShopBannerOriPath = ?";$shopParams[] = $bannerOriPath;$shopTypes .= "s"; }
    if ($bankName   !== null) { $shopUpdates[] = "ShopBankName = ?";   $shopParams[] = $bankName;   $shopTypes .= "s"; }
    if ($bankAcc    !== null) { $shopUpdates[] = "ShopBankAccount = ?";$shopParams[] = $bankAcc;    $shopTypes .= "s"; }

    if (!empty($shopUpdates)) {
        $shopParams[] = $shopId;
        $shopTypes   .= "i";
        $sql = "UPDATE tbl_shop SET " . implode(", ", $shopUpdates) . " WHERE ShopId = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($shopTypes, ...$shopParams);
        $stmt->execute();
    }

    // ── Update tbl_userinfo ──
    $usrUpdates = [];
    $usrParams  = [];
    $usrTypes   = "";
    if ($usrFullName !== null && $usrFullName !== '') { 
        $usrUpdates[] = "UsrFullName = ?"; 
        $usrParams[] = $usrFullName; 
        $usrTypes .= "s"; 
    }
    if ($usrPhone !== null && $usrPhone !== '') { 
        $usrUpdates[] = "UsrPhone = ?"; 
        $usrParams[] = $usrPhone; 
        $usrTypes .= "s"; 
    }
    if (!empty($usrPassword)) { 
        // Verification step for old password
        $chk = $conn->prepare("SELECT UsrPassword FROM tbl_userinfo WHERE UsrId = ?");
        $chk->bind_param("i", $usrId);
        $chk->execute();
        $chkRow = $chk->get_result()->fetch_assoc();
        if (!$chkRow || !password_verify($oldPw, $chkRow['UsrPassword'])) {
            exit(json_encode(["success"=>false, "message"=>"รหัสผ่านเดิมไม่ถูกต้อง ไม่สามารถเปลี่ยนรหัสผ่านใหม่ได้"], JSON_UNESCAPED_UNICODE));
        }

        $usrUpdates[] = "UsrPassword = ?"; 
        $usrParams[] = password_hash($usrPassword, PASSWORD_DEFAULT); 
        $usrTypes .= "s"; 
    }

    if (!empty($usrUpdates)) {
        $usrParams[] = $usrId; 
        $usrTypes   .= "i";
        $uSql = "UPDATE tbl_userinfo SET " . implode(", ", $usrUpdates) . " WHERE UsrId = ?";
        $uStmt = $conn->prepare($uSql);
        $uStmt->bind_param($usrTypes, ...$usrParams);
        $uStmt->execute();
    }

    // ── Update tbl_address (upsert) ──
    if ($adrId) {
        $adrSql = "UPDATE tbl_address SET HouseNo=?, Village=?, Road=?, Soi=?, Moo=?,
                   SubDistrict=?, District=?, Province=?, Zipcode=?, AdrLat=?, AdrLng=? WHERE AdrId=?";
        $aStmt = $conn->prepare($adrSql);
        $aStmt->bind_param("sssssssssssi", $houseNo, $village, $road, $soi, $moo,
                           $subDistrict, $district, $province, $zipcode, $adrLat, $adrLng, $adrId);
        $aStmt->execute();
    } else {
        // Create new address row and link to shop
        $adrSql = "INSERT INTO tbl_address (HouseNo, Village, Road, Soi, Moo,
                   SubDistrict, District, Province, Zipcode, AdrLat, AdrLng) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
        $aStmt = $conn->prepare($adrSql);
        $aStmt->bind_param("sssssssssss", $houseNo, $village, $road, $soi, $moo,
                           $subDistrict, $district, $province, $zipcode, $adrLat, $adrLng);
        $aStmt->execute();
        $newAdrId = $conn->insert_id;
        $upd = $conn->prepare("UPDATE tbl_shop SET AdrId=? WHERE ShopId=?");
        $upd->bind_param("ii", $newAdrId, $shopId);
        $upd->execute();
    }

    // ── Return fresh data ──
    $sql2 = "SELECT s.ShopId, s.ShopName, s.ShopPhone, s.ShopCatType, s.ShopStatus,
                    s.ShopLogoPath, s.ShopBannerPath, s.ShopLogoOriPath, s.ShopBannerOriPath, s.ShopPrepTime,
                    a.AdrId, a.HouseNo, a.Village, a.Road, a.Soi, a.Moo,
                    a.SubDistrict, a.District, a.Province, a.Zipcode, a.AdrLat, a.AdrLng,
                    s.ShopBankName, s.ShopBankAccount, s.ShopBalance, s.ShopTotalSettled,
                    u.UsrFullName, u.UsrEmail, u.UsrPhone
             FROM tbl_shop s 
             LEFT JOIN tbl_address a ON s.AdrId = a.AdrId
             LEFT JOIN tbl_userinfo u ON s.UsrId = u.UsrId
             WHERE s.UsrId = ?";
    $s2 = $conn->prepare($sql2);
    $s2->bind_param("i", $usrId);
    $s2->execute();
    $updated = $s2->get_result()->fetch_assoc();

    $pub = 'http://localhost/bitesync/public';
    if (!empty($updated['ShopLogoPath']))       $updated['ShopLogoPath']      = $pub . $updated['ShopLogoPath'];
    if (!empty($updated['ShopBannerPath']))     $updated['ShopBannerPath']    = $pub . $updated['ShopBannerPath'];
    if (!empty($updated['ShopLogoOriPath']))    $updated['ShopLogoOriPath']   = $pub . $updated['ShopLogoOriPath'];
    if (!empty($updated['ShopBannerOriPath']))  $updated['ShopBannerOriPath'] = $pub . $updated['ShopBannerOriPath'];

    echo json_encode(["success"=>true, "message"=>"บันทึกข้อมูลสำเร็จ", "data"=>$updated], JSON_UNESCAPED_UNICODE);
}
?>
