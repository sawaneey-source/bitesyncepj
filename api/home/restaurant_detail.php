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
if (!$id) exit(json_encode(["success"=>false, "message"=>"ID required"]));

$sql = "SELECT s.ShopId as id, s.ShopName as name, s.ShopCatType as category, 
               s.ShopStatus as open, s.ShopLogoPath as img, s.ShopBannerPath as banner, 
               (SELECT MAX(FoodPrepTime) FROM tbl_food WHERE tbl_food.ShopId = s.ShopId) as deliveryTime,
               s.ShopPhone as phone,
               CONCAT(a.HouseNo, ' ', a.Village, ' ', a.Road, ' ', a.SubDistrict, ' ', a.District, ' ', a.Province) as address
        FROM tbl_shop s
        LEFT JOIN tbl_address a ON s.AdrId = a.AdrId
        WHERE s.ShopId = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$res = $stmt->get_result();
$shop = $res->fetch_assoc();

if ($shop) {
    if (empty($shop['img'])) {
        $shop['img'] = 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80'; // Default
    } else {
        $shop['img'] = 'http://localhost/bitesync/public' . $shop['img'];
    }

    if (empty($shop['banner'])) {
        $shop['banner'] = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1500&q=80'; // Default
    } else {
        $shop['banner'] = 'http://localhost/bitesync/public' . $shop['banner'];
    }
    
    $shop['open'] = ($shop['open'] == 1);
    // Fetch Rating & Review Count
    $sql_r = "SELECT AVG(ReviewScore) as avg_rating, COUNT(ReviewId) as total_reviews 
              FROM tbl_review r 
              JOIN tbl_food f ON r.FoodId = f.FoodId 
              WHERE f.ShopId = ?";
    $stmt_r = $conn->prepare($sql_r);
    $stmt_r->bind_param("i", $id);
    $stmt_r->execute();
    $res_r = $stmt_r->get_result();
    $row_r = $res_r->fetch_assoc();

    $shop['rating'] = $row_r['avg_rating'] ? round($row_r['avg_rating'], 1) : 0;
    $shop['reviews'] = $row_r['total_reviews'] ?: 0;
    $shop['deliveryFee'] = 15;

    // Fetch Menus
    $menus = [];
    $sql_m = "SELECT FoodId as id, FoodName as name, FoodPrice as price, 
                     (SELECT CatName FROM tbl_menu_category WHERE tbl_menu_category.CatId = tbl_food.CatId) as category,
                     FoodDetail as `desc`, FoodImagePath as img, FoodStatus as available
              FROM tbl_food WHERE ShopId = ? ORDER BY FoodId DESC";
    $stmt_m = $conn->prepare($sql_m);
    $stmt_m->bind_param("i", $id);
    $stmt_m->execute();
    $res_m = $stmt_m->get_result();
    while($row_m = $res_m->fetch_assoc()) {
        if (empty($row_m['img'])) {
            $row_m['img'] = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80';
        } else {
            $row_m['img'] = 'http://localhost/bitesync/public' . $row_m['img'];
        }
        $row_m['available'] = ($row_m['available'] == 1);
        $menus[] = $row_m;
    }

    // Fetch Review List
    $reviewsList = [];
    $sql_rev = "SELECT r.ReviewId, r.ReviewScore, r.ReviewText, r.ReviewAt,
                       r.ReviewImg1, r.ReviewImg2, r.ReviewImg3,
                       u.UsrFullName as userName, f.FoodName
                FROM tbl_review r
                JOIN tbl_userinfo u ON r.UsrId = u.UsrId
                JOIN tbl_food f ON r.FoodId = f.FoodId
                WHERE f.ShopId = ?
                ORDER BY r.ReviewAt DESC";
    $stmt_rev = $conn->prepare($sql_rev);
    $stmt_rev->bind_param("i", $id);
    $stmt_rev->execute();
    $res_rev = $stmt_rev->get_result();
    while($row_rev = $res_rev->fetch_assoc()) {
        $reviewsList[] = $row_rev;
    }
    
    echo json_encode(["success"=>true, "data"=>$shop, "menus"=>$menus, "reviews"=>$reviewsList], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(["success"=>false, "message"=>"Shop not found"]);
}

$conn->close();
?>
