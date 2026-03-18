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
    if (empty($row['img'])) {
        $row['img'] = 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80'; // Default
    } else {
        $row['img'] = 'http://localhost/bitesync/public' . $row['img'];
    }
    
    $row['open'] = ($row['open'] == 1);
    $row['category'] = strtolower($row['category']);
    
    // Add missing fields for frontend (using defaults for now)
    $row['rating'] = 4.5; // Dummy
    $row['reviews'] = rand(50, 200); // Dummy
    $row['deliveryTime'] = ($row['deliveryTime'] ?: 20) . "-" . (($row['deliveryTime'] ?: 20) + 10);
    $row['deliveryFee'] = 15;
    $row['minOrder'] = 50;
    $row['tag'] = ($row['id'] % 3 == 0) ? 'แนะนำ' : '';

    $data[] = $row;
}

echo json_encode(["success"=>true, "data"=>$data]);
$conn->close();
?>
