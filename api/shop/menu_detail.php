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

$sql = "SELECT FoodId as id, FoodName as name, CatId, FoodPrice as price, 
               FoodDetail as description, FoodImagePath as img, FoodStatus, FoodPrepTime as prepTime
        FROM tbl_food WHERE FoodId = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);
$stmt->execute();
$res = $stmt->get_result();
$food = $res->fetch_assoc();

if ($food) {
    // Map CatId to CatName for frontend convenience
    $catName = "";
    if ($food['CatId']) {
        $cs = $conn->prepare("SELECT CatName FROM tbl_menu_category WHERE CatId = ?");
        $cs->bind_param("i", $food['CatId']);
        $cs->execute();
        $r = $cs->get_result()->fetch_assoc();
        if ($r) $catName = $r['CatName'];
    }
    $food['category'] = $catName;
    $food['status'] = ($food['FoodStatus'] == 1) ? 'available' : 'out_of_stock';

    // Fetch Addons
    $sql_addons = "SELECT AddonId as id, AddonName as name, AddonPrice as price, AddonStatus FROM tbl_addon WHERE FoodId = ?";
    $stmt_a = $conn->prepare($sql_addons);
    $stmt_a->bind_param("i", $id);
    $stmt_a->execute();
    $res_a = $stmt_a->get_result();
    $addons = [];
    while($row_a = $res_a->fetch_assoc()) {
        $row_a['status'] = ($row_a['AddonStatus'] == 1) ? 'available' : 'out_of_stock';
        unset($row_a['AddonStatus']);
        $addons[] = $row_a;
    }
    $food['addons'] = $addons;

    echo json_encode(["success"=>true, "data"=>$food]);
} else {
    echo json_encode(["success"=>false, "message"=>"Food not found"]);
}

$conn->close();
?>
