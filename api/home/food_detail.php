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

$id = $_GET['id'] ?? null;
if (!$id) exit(json_encode(["success"=>false, "message"=>"Food ID required"]));

$sql = "SELECT f.FoodId as id, f.FoodName as name, f.FoodPrice as price, 
               (SELECT CatName FROM tbl_menu_category WHERE tbl_menu_category.CatId = f.CatId) as category,
               f.FoodDetail as `desc`, f.FoodImagePath as img, f.FoodStatus as available,
               f.ShopId, (SELECT ShopName FROM tbl_shop WHERE tbl_shop.ShopId = f.ShopId) as shopName,
               (SELECT ShopStatus FROM tbl_shop WHERE tbl_shop.ShopId = f.ShopId) as shopOpen,
               (SELECT ShopPrepTime FROM tbl_shop WHERE tbl_shop.ShopId = f.ShopId) as deliveryTime,
               (SELECT AVG(ReviewScore) FROM tbl_review WHERE FoodId = f.FoodId) as avg_rating,
               (SELECT COUNT(ReviewId) FROM tbl_review WHERE FoodId = f.FoodId) as total_reviews
        FROM tbl_food f WHERE f.FoodId = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$res = $stmt->get_result();
$food = $res->fetch_assoc();

if ($food) {
    if (empty($food['img'])) {
        $food['img'] = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80';
    } else {
        $food['img'] = 'http://localhost/bitesync/public' . $food['img'];
    }
    $food['available'] = ($food['available'] == 1);
    
    // Use real ratings
    $food['rating'] = $food['avg_rating'] ? round($food['avg_rating'], 1) : 0;
    $food['reviews'] = $food['total_reviews'] ?: 0;
    
    // Fetch Addons
    $sql_addons = "SELECT AddonId as id, AddonName as name, AddonPrice as price FROM tbl_addon WHERE FoodId = ?";
    $stmt_a = $conn->prepare($sql_addons);
    $stmt_a->bind_param("i", $id);
    $stmt_a->execute();
    $res_a = $stmt_a->get_result();
    $addons = [];
    while($row_a = $res_a->fetch_assoc()) $addons[] = $row_a;
    $food['addons'] = $addons;
    
    // Fetch Reviews with images
    $sql_rev = "SELECT r.ReviewId, r.ReviewScore, r.ReviewText, r.ReviewAt,
                       r.ReviewImg1, r.ReviewImg2, r.ReviewImg3,
                       u.UsrFullName as userName
                FROM tbl_review r
                JOIN tbl_userinfo u ON r.UsrId = u.UsrId
                WHERE r.FoodId = ?
                ORDER BY r.ReviewAt DESC";
    $stmt_rev = $conn->prepare($sql_rev);
    $stmt_rev->bind_param("i", $id);
    $stmt_rev->execute();
    $res_rev  = $stmt_rev->get_result();
    $reviewsList = [];
    while ($row_rev = $res_rev->fetch_assoc()) $reviewsList[] = $row_rev;
    $food['reviewsList'] = $reviewsList;
    
    echo json_encode(["success"=>true, "data"=>$food], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(["success"=>false, "message"=>"Food not found"], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
