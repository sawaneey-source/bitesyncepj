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

// Fetch food with shop info and real ratings
$sql = "SELECT f.FoodId as id, f.FoodName as name, f.FoodPrice as price, 
               f.FoodImagePath as img, f.FoodStatus as available, f.FoodDetail as `desc`, f.FoodPrepTime as deliveryTime,
               s.ShopId, s.ShopName as shopName, s.ShopStatus as shopOpen, s.ShopCatType as shopCategory,
               (SELECT CatName FROM tbl_menu_category WHERE tbl_menu_category.CatId = f.CatId) as category,
               f.FoodRatingAvg as avg_rating,
               f.FoodRatingCount as total_reviews
        FROM tbl_food f
        JOIN tbl_shop s ON f.ShopId = s.ShopId
        ORDER BY f.FoodId DESC";

$res = $conn->query($sql);
$data = [];

while($row = $res->fetch_assoc()) {
    if (empty($row['img'])) {
        $row['img'] = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80';
    } else {
        $row['img'] = 'http://localhost/bitesync/public' . $row['img'];
    }
    
    $row['open'] = ($row['shopOpen'] == 1);
    $row['available'] = ($row['available'] == 1);
    
    // Use real ratings from DB
    $row['rating'] = $row['avg_rating'] ? round($row['avg_rating'], 1) : 0;
    $row['reviews'] = $row['total_reviews'] ?: 0;
    
    $row['deliveryTime'] = $row['deliveryTime'] ?: 30;
    $row['deliveryFee'] = 20;
    $row['minOrder'] = 50;

    $data[] = $row;
}

echo json_encode(["success"=>true, "data"=>$data]);
$conn->close();
?>
