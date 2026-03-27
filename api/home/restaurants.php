<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$sql = "SELECT ShopId as id, ShopId, ShopName as name, ShopCatType as category, 
               ShopStatus as open, ShopLogoPath as img, ShopPrepTime as deliveryTime 
        FROM tbl_shop ORDER BY ShopId DESC";

$res = $conn->query($sql);
$data = [];

while($row = $res->fetch_assoc()) {
    // Mapping & Formatting
    if (!empty($row['img'])) {
        $row['img'] = 'http://localhost/bitesync/public' . $row['img'];
    } else {
        $row['img'] = null;
    }
    
    $row['open'] = ($row['open'] == 1);
    $row['category'] = strtolower($row['category'] ?? '');
    
    // Remove all dummy data
    $row['rating'] = 0; 
    $row['reviews'] = 0;
    $row['deliveryTime'] = $row['deliveryTime'] ?: 0;
    $row['deliveryFee'] = 0;
    $row['minOrder'] = 0;
    $row['tag'] = null;

    $data[] = $row;
}

echo json_encode(["success"=>true, "data"=>$data]);
$conn->close();
?>
