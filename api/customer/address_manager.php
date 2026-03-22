<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include "../../dbconnect/dbconnect.php";

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_GET['userId'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT * FROM tbl_address WHERE UsrId = ? ORDER BY IsDefault DESC, AdrId DESC");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode(['success' => true, 'data' => $data]);
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $conn->prepare("INSERT INTO tbl_address (UsrId, HouseNo, Village, Road, Soi, Moo, SubDistrict, District, Province, Zipcode, IsDefault) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $isDef = isset($data['isDefault']) && $data['isDefault'] ? 1 : 0;
    
    if ($isDef) {
        $conn->query("UPDATE tbl_address SET IsDefault = 0 WHERE UsrId = " . (int)$userId);
    }

    $stmt->bind_param("isssssssssi", $userId, $data['houseNo'], $data['village'], $data['road'], $data['soi'], $data['moo'], $data['subDistrict'], $data['district'], $data['province'], $data['zipcode'], $isDef);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Address added']);
    } else {
        echo json_encode(['success' => false, 'message' => $conn->error]);
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $adrId = $data['adrId'];
    
    if (isset($data['setDefault'])) {
        $conn->query("UPDATE tbl_address SET IsDefault = 0 WHERE UsrId = " . (int)$userId);
        $stmt = $conn->prepare("UPDATE tbl_address SET IsDefault = 1 WHERE AdrId = ? AND UsrId = ?");
        $stmt->bind_param("ii", $adrId, $userId);
        $stmt->execute();
    }
    
    echo json_encode(['success' => true, 'message' => 'Address updated']);
}
elseif ($method === 'DELETE') {
    $adrId = $_GET['adrId'];
    $stmt = $conn->prepare("DELETE FROM tbl_address WHERE AdrId = ? AND UsrId = ?");
    $stmt->bind_param("ii", $adrId, $userId);
    $stmt->execute();
    echo json_encode(['success' => true, 'message' => 'Address deleted']);
}
?>
