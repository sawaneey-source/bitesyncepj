<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Fetch messages between two users
    $senderId = $_GET['senderId'] ?? 0;
    $receiverId = $_GET['receiverId'] ?? 0; // 0 means Admin

    if (!$senderId && $senderId !== "0") {
        echo json_encode(['success' => false, 'message' => 'Missing SenderId']);
        exit();
    }

    // --- BAN CHECK ---
    if ($senderId != 0) {
        $banStmt = $conn->prepare("SELECT UsrStatus FROM tbl_userinfo WHERE UsrId = ?");
        $banStmt->bind_param("i", $senderId);
        $banStmt->execute();
        $stRow = $banStmt->get_result()->fetch_assoc();
        if ($stRow && (int)$stRow['UsrStatus'] === 0) {
            echo json_encode(['success' => false, 'message' => 'Banned']);
            exit();
        }
    }

    $sql = "SELECT * FROM tbl_chat 
            WHERE (SenderId = ? AND ReceiverId = ?) 
               OR (SenderId = ? AND ReceiverId = ?)
            ORDER BY CreatedAt ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iiii", $senderId, $receiverId, $receiverId, $senderId);
    $stmt->execute();
    $res = $stmt->get_result();
    
    $messages = [];
    while($row = $res->fetch_assoc()) {
        $messages[] = $row;
    }

    // Mark as read if fetching as receiver
    $updateSql = "UPDATE tbl_chat SET ChatStatus = 1 WHERE ReceiverId = ? AND SenderId = ? AND ChatStatus = 0";
    $upStmt = $conn->prepare($updateSql);
    $upStmt->bind_param("ii", $senderId, $receiverId);
    $upStmt->execute();

    echo json_encode(['success' => true, 'data' => $messages]);

} else if ($method === 'POST') {
    // Send a message
    $data = json_decode(file_get_contents("php://input"), true);
    $senderId = $data['senderId'] ?? 0;
    $receiverId = $data['receiverId'] ?? 0;
    $message = $data['message'] ?? '';

    if (!isset($data['senderId']) || !$message) {
        echo json_encode(['success' => false, 'message' => 'Missing data']);
        exit();
    }

    // --- BAN CHECK ---
    if ($senderId != 0) {
        $banStmt = $conn->prepare("SELECT UsrStatus FROM tbl_userinfo WHERE UsrId = ?");
        $banStmt->bind_param("i", $senderId);
        $banStmt->execute();
        $stRow = $banStmt->get_result()->fetch_assoc();
        if ($stRow && (int)$stRow['UsrStatus'] === 0) {
            echo json_encode(['success' => false, 'message' => 'Your account is suspended.']);
            exit();
        }
    }

    $sql = "INSERT INTO tbl_chat (SenderId, ReceiverId, ChatMessage) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iis", $senderId, $receiverId, $message);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Sent']);
    } else {
        echo json_encode(['success' => false, 'message' => $conn->error]);
    }
}

$conn->close();
?>
