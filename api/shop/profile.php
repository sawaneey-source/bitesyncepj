<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

/* ── GET: Fetch shop profile ── */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $usrId = $_GET['usrId'] ?? null;
    if (!$usrId) exit(json_encode(["success"=>false, "message"=>"usrId required"]));

    $sql = "SELECT s.ShopId, s.ShopName, s.ShopPhone, s.ShopCatType, s.ShopStatus,
                   s.ShopLogoPath, s.ShopBannerPath, s.ShopPrepTime,
                   a.AdrId, a.HouseNo, a.Village, a.Road, a.Soi, a.Moo,
                   a.SubDistrict, a.District, a.Province, a.Zipcode,
                   u.UsrFullName, u.UsrEmail
            FROM tbl_shop s
            LEFT JOIN tbl_address a ON s.AdrId = a.AdrId
            LEFT JOIN tbl_userinfo u ON s.UsrId = u.UsrId
            WHERE s.UsrId = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $usrId);
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

    // Prefix logo/banner paths
    if (!empty($shop['ShopLogoPath']))   $shop['ShopLogoPath']   = 'http://localhost/bitesync/public' . $shop['ShopLogoPath'];
    if (!empty($shop['ShopBannerPath'])) $shop['ShopBannerPath'] = 'http://localhost/bitesync/public' . $shop['ShopBannerPath'];

    echo json_encode(["success"=>true, "data"=>$shop], JSON_UNESCAPED_UNICODE);
    exit();
}

/* ── POST: Update shop profile ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usrId      = $_POST['usrId']      ?? null;
    $shopName   = $_POST['shopName']   ?? null;
    $shopPhone  = $_POST['shopPhone']  ?? null;
    $shopCat    = $_POST['shopCatType']?? null;
    $shopStatus = isset($_POST['shopStatus']) ? (int)$_POST['shopStatus'] : null;
    $prepTime   = $_POST['shopPrepTime'] ?? null;

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

    // User info fields
    $usrFullName = $_POST['usrFullName'] ?? null;
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

    if (!empty($_FILES['logo']['name'])) {
        $ext  = strtolower(pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION));
        $name = 'logo_' . $shopId . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['logo']['tmp_name'], $uploadDir . $name))
            $logoPath = '/uploads/profiles/' . $name;
    }
    if (!empty($_FILES['banner']['name'])) {
        $ext  = strtolower(pathinfo($_FILES['banner']['name'], PATHINFO_EXTENSION));
        $name = 'banner_' . $shopId . '_' . time() . '.' . $ext;
        if (move_uploaded_file($_FILES['banner']['tmp_name'], $uploadDir . $name))
            $bannerPath = '/uploads/profiles/' . $name;
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
    if (!empty($usrPassword)) { 
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
                   SubDistrict=?, District=?, Province=?, Zipcode=? WHERE AdrId=?";
        $aStmt = $conn->prepare($adrSql);
        $aStmt->bind_param("sssssssssi", $houseNo, $village, $road, $soi, $moo,
                           $subDistrict, $district, $province, $zipcode, $adrId);
        $aStmt->execute();
    } else {
        // Create new address row and link to shop
        $adrSql = "INSERT INTO tbl_address (HouseNo, Village, Road, Soi, Moo,
                   SubDistrict, District, Province, Zipcode) VALUES (?,?,?,?,?,?,?,?,?)";
        $aStmt = $conn->prepare($adrSql);
        $aStmt->bind_param("sssssssss", $houseNo, $village, $road, $soi, $moo,
                           $subDistrict, $district, $province, $zipcode);
        $aStmt->execute();
        $newAdrId = $conn->insert_id;
        $upd = $conn->prepare("UPDATE tbl_shop SET AdrId=? WHERE ShopId=?");
        $upd->bind_param("ii", $newAdrId, $shopId);
        $upd->execute();
    }

    // ── Return fresh data ──
    $sql2 = "SELECT s.ShopId, s.ShopName, s.ShopPhone, s.ShopCatType, s.ShopStatus,
                    s.ShopLogoPath, s.ShopBannerPath, s.ShopPrepTime,
                    a.AdrId, a.HouseNo, a.Village, a.Road, a.Soi, a.Moo,
                    a.SubDistrict, a.District, a.Province, a.Zipcode,
                    u.UsrFullName, u.UsrEmail
             FROM tbl_shop s 
             LEFT JOIN tbl_address a ON s.AdrId = a.AdrId
             LEFT JOIN tbl_userinfo u ON s.UsrId = u.UsrId
             WHERE s.UsrId = ?";
    $s2 = $conn->prepare($sql2);
    $s2->bind_param("i", $usrId);
    $s2->execute();
    $updated = $s2->get_result()->fetch_assoc();

    echo json_encode(["success"=>true, "message"=>"บันทึกข้อมูลสำเร็จ", "data"=>$updated], JSON_UNESCAPED_UNICODE);
}
?>
