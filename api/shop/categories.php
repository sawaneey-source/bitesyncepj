<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$method = $_SERVER['REQUEST_METHOD'];
file_put_contents("debug.log", date("Y-m-d H:i:s") . " | Method: $method | Input: " . file_get_contents("php://input") . "\n", FILE_APPEND);

$in = json_decode(file_get_contents("php://input"), true);
$usrId = $_GET['usrId'] ?? $in['usrId'] ?? null;

if (!$usrId) {
    echo json_encode(["success"=>false, "message"=>"Unauthorized"]);
    exit();
}

$r = $conn->prepare("SELECT ShopId FROM tbl_shop WHERE UsrId = ? LIMIT 1");
$r->bind_param("i", $usrId);
$r->execute();
$shopRow = $r->get_result()->fetch_assoc();
if (!$shopRow) {
    echo json_encode(["success"=>false, "message"=>"Shop not found"]);
    exit();
}
$shopId = $shopRow['ShopId'];

if ($method === 'GET') {
    $sql = "SELECT CatId, CatName FROM tbl_menu_category WHERE ShopId = ? ORDER BY CatId ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $res = $stmt->get_result();
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode(["success"=>true, "data"=>$data]);

} elseif ($method === 'POST') {
    $in = json_decode(file_get_contents("php://input"), true);
    $name = $in['name'] ?? '';
    if(!$name) exit(json_encode(["success"=>false, "message"=>"Name required"]));
    
    $stmt = $conn->prepare("INSERT INTO tbl_menu_category (CatName, ShopId) VALUES (?, ?)");
    $stmt->bind_param("si", $name, $shopId);
    if($stmt->execute()){
        $id = $conn->insert_id;
        echo json_encode(["success"=>true, "data"=>["CatId"=>$id, "CatName"=>$name]]);
    } else {
        file_put_contents("debug.log", date("Y-m-d H:i:s") . " | POST Error: " . $stmt->error . "\n", FILE_APPEND);
        echo json_encode(["success"=>false, "message"=>$stmt->error]);
    }

} elseif ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    $in = json_decode(file_get_contents("php://input"), true);
    $name = $in['name'] ?? '';
    if(!$id || !$name) exit(json_encode(["success"=>false, "message"=>"ID and Name required"]));
    
    $stmt = $conn->prepare("UPDATE tbl_menu_category SET CatName = ? WHERE CatId = ? AND ShopId = ?");
    $stmt->bind_param("sii", $name, $id, $shopId);
    if($stmt->execute()){
        echo json_encode(["success"=>true]);
    } else {
        echo json_encode(["success"=>false, "message"=>$conn->error]);
    }

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if(!$id) exit(json_encode(["success"=>false, "message"=>"ID required"]));
    
    $stmt = $conn->prepare("DELETE FROM tbl_menu_category WHERE CatId = ? AND ShopId = ?");
    $stmt->bind_param("ii", $id, $shopId);
    if($stmt->execute()){
        echo json_encode(["success"=>true]);
    } else {
        echo json_encode(["success"=>false, "message"=>$conn->error]);
    }
}

$conn->close();
?>
