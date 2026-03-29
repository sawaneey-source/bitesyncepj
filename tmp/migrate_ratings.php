<?php
include "../dbconnect/dbconnect.php";

echo "=== MIGRATING FOOD RATINGS ===\n";

$sql = "SELECT FoodId FROM tbl_food";
$res = $conn->query($sql);

while($row = $res->fetch_assoc()) {
    $foodId = $row['FoodId'];
    
    // Calculate current aggregates
    $aggSql = "SELECT AVG(ReviewScore) as avg_score, COUNT(*) as total_reviews FROM tbl_review WHERE FoodId = ?";
    $aggStmt = $conn->prepare($aggSql);
    $aggStmt->bind_param("i", $foodId);
    $aggStmt->execute();
    $aggRes = $aggStmt->get_result()->fetch_assoc();
    
    $avg   = round((float)($aggRes['avg_score'] ?? 0), 2);
    $count = (int)($aggRes['total_reviews'] ?? 0);
    
    // Update tbl_food
    $updateSql = "UPDATE tbl_food SET FoodRatingAvg = ?, FoodRatingCount = ? WHERE FoodId = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("dii", $avg, $count, $foodId);
    $updateStmt->execute();
    
    echo "Food ID $foodId: Updated to Avg $avg ($count reviews)\n";
}

echo "\nMigration Complete!\n";
$conn->close();
?>
