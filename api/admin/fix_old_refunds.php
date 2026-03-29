<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json; charset=UTF-8");

include "../../dbconnect/dbconnect.php";

// Update all old orders that:
// 1. Are Cancelled (OdrStatus = 7)
// 2. Have been paid for (PmtStatus = 1)
// 3. Haven't been flagged for refund yet (OdrRefundStatus = 0)
// SET OdrRefundStatus = 1 (Pending Refund)

$sql = "UPDATE tbl_order o 
        JOIN tbl_payment p ON o.OdrId = p.OdrId 
        SET o.OdrRefundStatus = 1 
        WHERE o.OdrStatus = 7 
        AND p.PmtStatus = 1 
        AND o.OdrRefundStatus = 0";

if ($conn->query($sql) === TRUE) {
    $affected = $conn->affected_rows;
    echo json_encode([
        "success" => true,
        "message" => "อัปเดตออเดอร์เก่าสำเร็จ! มีทั้งหมด $affected รายการที่ถูกดึงเข้าระบบคืนเงินครับ"
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "เกิดข้อผิดพลาดในการรันคำสั่ง: " . $conn->error
    ]);
}

$conn->close();
?>
