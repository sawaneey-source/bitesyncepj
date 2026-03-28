<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
echo "--- Real-time Financial Audit (Admin) ---\n";

// 1. Calculate REAL Settled Admin Profit (Both Shop and Rider are settled)
$sqlSettled = "SELECT SUM(OdrAdminFee) as settled 
               FROM tbl_order 
               WHERE OdrStatus = 6 AND OdrShopSettled = 1 AND OdrRiderSettled = 1";
$resSettled = $conn->query($sqlSettled);
$settledAmt = (float)($resSettled->fetch_assoc()['settled'] ?? 0);

// 2. Calculate PENDING Admin Profit (Either Shop or Rider not settled yet)
$sqlPending = "SELECT SUM(OdrAdminFee) as pending 
               FROM tbl_order 
               WHERE OdrStatus = 6 AND (OdrShopSettled = 0 OR OdrRiderSettled = 0)";
$resPending = $conn->query($sqlPending);
$pendingAmt = (float)($resPending->fetch_assoc()['pending'] ?? 0);

// 3. Overall Total for verification
$sqlTotal = "SELECT SUM(OdrAdminFee) as total FROM tbl_order WHERE OdrStatus = 6";
$resTotal = $conn->query($sqlTotal);
$totalAmt = (float)($resTotal->fetch_assoc()['total'] ?? 0);

echo "Actual Realized Profit (Settled): " . number_format($settledAmt, 2) . " ฿\n";
echo "Future Potential Profit (Pending): " . number_format($pendingAmt, 2) . " ฿\n";
echo "Total Accumulated (Sum): " . number_format($totalAmt, 2) . " ฿\n";

if ($settledAmt == 3201.9) {
    echo "\n>>> [MATCH!] ตัวเลข 3,201.9 ฿ ตรงกับข้อมูลจริงในฐานข้อมูลครับ! <<<\n";
} else {
    echo "\n>>> [DISCREPANCY!] ยอดจริงคือ " . number_format($settledAmt, 2) . " ฿ ครับ <<<\n";
}
?>
