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
    // Exclude IsDefault = 2 (Soft-deleted addresses tied to orders)
    $sql = "SELECT * FROM tbl_address WHERE UsrId = ? AND IsDefault != 2 ORDER BY IsDefault DESC, AdrId DESC";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode(['success' => true, 'data' => $data]);
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $isDef = isset($data['isDefault']) && $data['isDefault'] ? 1 : 0;

    // 1. Check if EXACT match already exists
    $chk = $conn->prepare("SELECT AdrId FROM tbl_address WHERE UsrId = ? AND HouseNo = ? AND SubDistrict = ? AND District = ? AND Province = ? AND AdrLat = ? AND AdrLng = ? LIMIT 1");
    $chk->bind_param("issssss", $userId, $data['houseNo'], $data['subDistrict'], $data['district'], $data['province'], $data['adrLat'], $data['adrLng']);
    $chk->execute();
    $existing = $chk->get_result()->fetch_assoc();

    if ($existing) {
        $adrId = $existing['AdrId'];
        if ($isDef) {
            $conn->query("UPDATE tbl_address SET IsDefault = 0 WHERE UsrId = " . (int)$userId);
            $conn->query("UPDATE tbl_address SET IsDefault = 1 WHERE AdrId = " . (int)$adrId);
        }
        echo json_encode(['success' => true, 'message' => 'Address already exists, updated default status']);
        exit;
    }

    // 2. Insert new if not found
    if ($isDef) {
        $conn->query("UPDATE tbl_address SET IsDefault = 0 WHERE UsrId = " . (int)$userId);
    }
    
    $stmt = $conn->prepare("INSERT INTO tbl_address (UsrId, HouseNo, Village, Road, Soi, Moo, SubDistrict, District, Province, Zipcode, AdrLat, AdrLng, IsDefault) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssssssssddi", $userId, $data['houseNo'], $data['village'], $data['road'], $data['soi'], $data['moo'], $data['subDistrict'], $data['district'], $data['province'], $data['zipcode'], $data['adrLat'], $data['adrLng'], $isDef);
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
    $adrId = $_GET['adrId'] ?? null;
    if (!$adrId) {
        echo json_encode(['success' => false, 'message' => 'Missing AdrId']);
        exit;
    }
    
    // Check if it's the default address before deleting
    $chk = $conn->prepare("SELECT IsDefault FROM tbl_address WHERE AdrId = ? AND UsrId = ?");
    $chk->bind_param("ii", $adrId, $userId);
    $chk->execute();
    $res = $chk->get_result();
    if ($row = $res->fetch_assoc()) {
        if ($row['IsDefault'] == 1) {
            echo json_encode(['success' => false, 'message' => 'ไม่สามารถลบที่อยู่เริ่มต้นได้ กรุณาตั้งที่อยู่อื่นเป็นค่าเริ่มต้นก่อนลบครับ']);
            exit;
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Address not found']);
        exit;
    }

    try {
        $stmt = $conn->prepare("DELETE FROM tbl_address WHERE AdrId = ? AND UsrId = ?");
        $stmt->bind_param("ii", $adrId, $userId);
        $stmt->execute();
        echo json_encode(['success' => true, 'message' => 'Address deleted (Hard delete)']);
    } catch (\mysqli_sql_exception $e) {
        // Error Code 1451: Cannot delete or update a parent row: a foreign key constraint fails
        if ($e->getCode() == 1451) {
            $stmt_soft = $conn->prepare("UPDATE tbl_address SET IsDefault = 2 WHERE AdrId = ? AND UsrId = ?");
            $stmt_soft->bind_param("ii", $adrId, $userId);
            if ($stmt_soft->execute()) {
                echo json_encode(['success' => true, 'message' => 'Address deleted (Soft delete)']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Soft delete failed: ' . $conn->error]);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'ระบบฐานข้อมูลขัดข้อง (DB Error: ' . $e->getMessage() . ')']);
        }
    }
}
?>
