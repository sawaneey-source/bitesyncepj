<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$method = $_SERVER['REQUEST_METHOD'];
$usrId  = $_GET['usrId'] ?? null;

if (!$usrId) {
    echo json_encode(["success" => false, "message" => "Unauthorized: usrId required"]);
    exit();
}

// 1. Get ShopId from usrId
$sql_shop = "SELECT ShopId FROM tbl_shop WHERE UsrId = ?";
$stmt_shop = $conn->prepare($sql_shop);
$stmt_shop->bind_param("i", $usrId);
$stmt_shop->execute();
$res_shop = $stmt_shop->get_result();
$shop = $res_shop->fetch_assoc();

if (!$shop) {
    echo json_encode(["success" => false, "message" => "Shop not found for this user"]);
    exit();
}
$shopId = $shop['ShopId'];

if ($method === 'GET') {
    // Fetch all reviews for this shop
    $sql = "SELECT r.ReviewId, r.ReviewScore, r.ReviewText, r.ReviewAt,
                   r.ReviewImg1, r.ReviewImg2, r.ReviewImg3,
                   u.UsrFullName as userName, u.UsrImagePath as userImage, f.FoodName
            FROM tbl_review r
            JOIN tbl_userinfo u ON r.UsrId = u.UsrId
            JOIN tbl_food f ON r.FoodId = f.FoodId
            WHERE f.ShopId = ?
            ORDER BY r.ReviewAt DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $res = $stmt->get_result();
    
    $reviews = [];
    while ($row = $res->fetch_assoc()) {
        if (!empty($row['userImage'])) {
            $row['userImage'] = 'http://localhost/bitesync/public' . $row['userImage'];
        }
        $reviews[] = $row;
    }
    
    echo json_encode(["success" => true, "data" => $reviews], JSON_UNESCAPED_UNICODE);

} elseif ($method === 'DELETE') {
    $reviewId = $_GET['id'] ?? null;
    if (!$reviewId) {
        echo json_encode(["success" => false, "message" => "Review ID required"]);
        exit();
    }

    // Verify the review belongs to this shop before deleting
    $sql_verify = "SELECT r.ReviewId 
                   FROM tbl_review r 
                   JOIN tbl_food f ON r.FoodId = f.FoodId
                   WHERE r.ReviewId = ? AND f.ShopId = ?";
    $stmt_verify = $conn->prepare($sql_verify);
    $stmt_verify->bind_param("ii", $reviewId, $shopId);
    $stmt_verify->execute();
    $res_verify = $stmt_verify->get_result();

    if ($res_verify->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Unauthorized: Review not found or doesn't belong to your shop"]);
        exit();
    }

    // Perform deletion
    $sql_del = "DELETE FROM tbl_review WHERE ReviewId = ?";
    $stmt_del = $conn->prepare($sql_del);
    $stmt_del->bind_param("i", $reviewId);
    
    if ($stmt_del->execute()) {
        echo json_encode(["success" => true, "message" => "Review deleted successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Error deleting review: " . $conn->error]);
    }
}

$conn->close();
?>
