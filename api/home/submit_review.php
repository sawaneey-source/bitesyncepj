<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$usrId  = $_POST['usrId']  ?? null;
$foodId = $_POST['foodId'] ?? null;
$score  = $_POST['score']  ?? 5;
$text   = $_POST['text']   ?? '';
$odrId  = $_POST['odrId']  ?? 0;

if (!$usrId || !$foodId) {
    exit(json_encode(["success"=>false, "message"=>"User ID and Food ID required"], JSON_UNESCAPED_UNICODE));
}

// Handle up to 3 image uploads
$uploadDir = dirname(__FILE__) . "/../../public/uploads/reviews/";
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

$imgPaths = [null, null, null];
$imgKeys  = ['img1', 'img2', 'img3'];

for ($i = 0; $i < 3; $i++) {
    $key = $imgKeys[$i];
    if (!empty($_FILES[$key]['name'])) {
        $ext      = strtolower(pathinfo($_FILES[$key]['name'], PATHINFO_EXTENSION));
        $allowed  = ['jpg','jpeg','png','webp','gif'];
        if (!in_array($ext, $allowed)) continue;
        $filename = 'rev_' . time() . '_' . $i . '_' . rand(1000,9999) . '.' . $ext;
        $destPath = $uploadDir . $filename;
        if (move_uploaded_file($_FILES[$key]['tmp_name'], $destPath)) {
            $imgPaths[$i] = 'uploads/reviews/' . $filename;
        }
    }
}

$sql  = "INSERT INTO tbl_review (FoodId, UsrId, OdrId, ReviewScore, ReviewText, ReviewImg1, ReviewImg2, ReviewImg3) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iiiissss", $foodId, $usrId, $odrId, $score, $text, $imgPaths[0], $imgPaths[1], $imgPaths[2]);

if ($stmt->execute()) {
    // Optimization: Recalculate and update FoodRatingAvg and FoodRatingCount in tbl_food
    $aggSql = "SELECT AVG(ReviewScore) as avg_score, COUNT(*) as total_reviews FROM tbl_review WHERE FoodId = ?";
    $aggStmt = $conn->prepare($aggSql);
    $aggStmt->bind_param("i", $foodId);
    $aggStmt->execute();
    $aggRes = $aggStmt->get_result()->fetch_assoc();
    
    $newAvg   = round((float)($aggRes['avg_score'] ?? 0), 2);
    $newCount = (int)($aggRes['total_reviews'] ?? 0);
    
    $updateSql = "UPDATE tbl_food SET FoodRatingAvg = ?, FoodRatingCount = ? WHERE FoodId = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("dii", $newAvg, $newCount, $foodId);
    $updateStmt->execute();
    
    echo json_encode(["success"=>true, "message"=>"Review submitted and ratings updated"], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(["success"=>false, "message"=>"Error: " . $conn->error], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
