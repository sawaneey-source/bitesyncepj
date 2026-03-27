<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include "../../dbconnect/dbconnect.php";

$userId = $_GET['userId'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

$sql = "SELECT u.UsrId as id, u.UsrFullName as name, u.UsrEmail as email, u.UsrPhone as phone, 
               u.UsrRole as role, u.UsrImagePath as image,
               CONCAT(COALESCE(a.HouseNo,''), ' ', COALESCE(a.SubDistrict,''), ' ', COALESCE(a.District,''), ' ', COALESCE(a.Province,''), ' ', COALESCE(a.Zipcode,'')) as address
        FROM tbl_userinfo u 
        LEFT JOIN tbl_address a ON u.UsrId = a.UsrId AND a.IsDefault = 1
        WHERE u.UsrId = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();

if ($user) {
    echo json_encode(['success' => true, 'user' => $user]);
} else {
    echo json_encode(['success' => false, 'message' => 'User not found']);
}
?>
