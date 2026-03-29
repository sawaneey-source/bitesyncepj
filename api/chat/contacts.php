<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Fetch all users who have chatted with Admin (ReceiverId = 0 or SenderId = some user where ReceiverId = 0)
// We want a list of unique users with their latest message info
$sql = "SELECT DISTINCT 
            u.UsrId, 
            COALESCE(s.ShopName, u.UsrFullName) as UsrFullName, 
            u.UsrEmail, 
            u.UsrRole, 
            COALESCE(s.ShopLogoPath, u.UsrImagePath) as UsrImagePath,
            c.ChatMessage as lastMsg, c.CreatedAt as lastTime,
            (SELECT COUNT(*) FROM tbl_chat WHERE SenderId = u.UsrId AND ReceiverId = 0 AND ChatStatus = 0) as unreadCount
        FROM tbl_userinfo u
        LEFT JOIN tbl_shop s ON u.UsrId = s.UsrId
        JOIN tbl_chat c ON (c.SenderId = u.UsrId OR c.ReceiverId = u.UsrId)
        WHERE ((c.SenderId = u.UsrId AND c.ReceiverId = 0) 
           OR (c.SenderId = 0 AND c.ReceiverId = u.UsrId))
        AND u.UsrRole != 'admin'
        GROUP BY u.UsrId
        ORDER BY c.CreatedAt DESC";

$res = $conn->query($sql);
$contacts = [];
while($row = $res->fetch_assoc()) {
    $contacts[] = $row;
}

echo json_encode(['success' => true, 'data' => $contacts]);

$conn->close();
?>
