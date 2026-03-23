<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

include "../../dbconnect/dbconnect.php";

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $usrId = $_GET['usrId'] ?? 0;
    if (!$usrId) {
        echo json_encode(['success' => false, 'message' => 'Missing User ID']);
        exit;
    }

    $stmt = $conn->prepare("SELECT * FROM tbl_address WHERE UsrId = ? AND IsDefault = 1 LIMIT 1");
    $stmt->bind_param("i", $usrId);
    $stmt->execute();
    $res = $stmt->get_result();
    $address = $res->fetch_assoc();

    if ($address) {
        echo json_encode(['success' => true, 'data' => $address]);
    } else {
        echo json_encode(['success' => false, 'message' => 'No default address found']);
    }

} else if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || !isset($data['usrId'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid data']);
        exit;
    }

    $usrId       = (int)$data['usrId'];
    $lat         = $data['lat']         ?? 0;
    $lng         = $data['lng']         ?? 0;
    $houseNo     = $data['houseNo']     ?? '';
    $village     = $data['village']     ?? '';
    $road        = $data['road']        ?? '';
    $subDistrict = $data['subDistrict'] ?? '';
    $district    = $data['district']    ?? '';
    $province    = $data['province']    ?? '';
    $zipcode     = $data['zipcode']     ?? '';

    // Check for existing default
    $chk = $conn->prepare("SELECT AdrId FROM tbl_address WHERE UsrId = ? AND IsDefault = 1 LIMIT 1");
    $chk->bind_param("i", $usrId);
    $chk->execute();
    $res = $chk->get_result();
    $existing = $res->fetch_assoc();

    if ($existing) {
        // Update
        $adrId = $existing['AdrId'];
        $stmt = $conn->prepare("UPDATE tbl_address SET AdrLat=?, AdrLng=?, HouseNo=?, Village=?, Road=?, SubDistrict=?, District=?, Province=?, Zipcode=? WHERE AdrId=?");
        $stmt->bind_param("ddsssssssi", $lat, $lng, $houseNo, $village, $road, $subDistrict, $district, $province, $zipcode, $adrId);
    } else {
        // Insert
        $stmt = $conn->prepare("INSERT INTO tbl_address (UsrId, AdrLat, AdrLng, HouseNo, Village, Road, SubDistrict, District, Province, Zipcode, IsDefault) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
        $stmt->bind_param("iddsssssss", $usrId, $lat, $lng, $houseNo, $village, $road, $subDistrict, $district, $province, $zipcode);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => $conn->error]);
    }
}
?>
