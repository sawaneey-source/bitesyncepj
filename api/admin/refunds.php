<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $status = isset($_GET['status']) ? (int)$_GET['status'] : 1; // 1 = Pending, 2 = Refunded

    $refunds = [];
    $sql = "SELECT o.OdrId, u.UsrId, u.UsrFullName as name, u.UsrBankName as bank, u.UsrBankAccount as account,
                   o.OdrGrandTotal as amount, o.OdrCreatedAt as orderDate, o.OdrRefundSlip, o.OdrRefundStatus
            FROM tbl_order o
            JOIN tbl_userinfo u ON o.UsrId = u.UsrId
            WHERE o.OdrStatus = 7 AND o.OdrRefundStatus = ?
            ORDER BY o.OdrUpdatedAt DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $status);
    $stmt->execute();
    $res = $stmt->get_result();

    while($row = $res->fetch_assoc()) {
        $refunds[] = [
            'orderId' => $row['OdrId'],
            'userId' => $row['UsrId'],
            'name' => $row['name'],
            'bank' => $row['bank'],
            'account' => $row['account'],
            'amount' => (float)$row['amount'],
            'orderDate' => $row['orderDate'],
            'slip' => $row['OdrRefundSlip'],
            'status' => (int)$row['OdrRefundStatus']
        ];
    }

    echo json_encode(['success' => true, 'data' => $refunds]);
} 
else if ($method === 'POST') {
    // Expected: FormData with orderId and slip (file)
    $orderId = isset($_POST['orderId']) ? (int)$_POST['orderId'] : 0;
    
    if (!$orderId) {
        echo json_encode(['success' => false, 'message' => 'Missing Order ID']);
        exit;
    }

    // Handle File Upload
    $slipPath = null;
    if (isset($_FILES['slip']) && $_FILES['slip']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../../uploads/refunds/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $ext = pathinfo($_FILES['slip']['name'], PATHINFO_EXTENSION);
        $fileName = 'refund_' . $orderId . '_' . time() . '.' . $ext;
        $targetFile = $uploadDir . $fileName;
        
        if (move_uploaded_file($_FILES['slip']['tmp_name'], $targetFile)) {
            $slipPath = '/bitesync/uploads/refunds/' . $fileName;
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to move uploaded file']);
            exit;
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Refund slip is required']);
        exit;
    }

    if ($slipPath) {
        $stmt = $conn->prepare("UPDATE tbl_order SET OdrRefundStatus = 2, OdrRefundSlip = ? WHERE OdrId = ?");
        $stmt->bind_param("si", $slipPath, $orderId);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Refund marked as complete']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Database update failed']);
        }
    }
}
?>
