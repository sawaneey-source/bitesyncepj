<?php
function updateBalance($conn, $orderId) {
    // 1. Fetch Order Details & check if already processed
    $stmt = $conn->prepare("SELECT ShopId, RiderId, OdrFoodPrice, OdrGP, OdrRiderFee, OdrSettled FROM tbl_order WHERE OdrId = ?");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order || $order['OdrSettled'] == 1) return false;

    $shopId      = $order['ShopId'];
    $riderId     = $order['RiderId'];
    $foodPrice   = (float)$order['OdrFoodPrice'];
    $gp          = (float)$order['OdrGP'];
    $riderFee    = (float)$order['OdrRiderFee'];
    $shopNet     = $foodPrice - $gp;

    $conn->begin_transaction();
    try {
        // 2. Update Shop Balance
        if ($shopId) {
            $stmt = $conn->prepare("UPDATE tbl_shop SET ShopBalance = ShopBalance + ? WHERE ShopId = ?");
            $stmt->bind_param("di", $shopNet, $shopId);
            $stmt->execute();
        }

        // 3. Update Rider Balance
        if ($riderId) {
            $stmt = $conn->prepare("UPDATE tbl_rider SET RiderBalance = RiderBalance + ? WHERE RiderId = ?");
            $stmt->bind_param("di", $riderFee, $riderId);
            $stmt->execute();
        }

        // 4. Mark Order as Settled (Balance credited)
        $stmt = $conn->prepare("UPDATE tbl_order SET OdrSettled = 1 WHERE OdrId = ?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();

        // 5. Update Rider Statistics (Cancel Rate) in DB
        if ($riderId) {
            $qComp = $conn->prepare("SELECT COUNT(*) as completed FROM tbl_order WHERE RiderId = ? AND OdrStatus = 6");
            $qComp->bind_param("i", $riderId); $qComp->execute();
            $completedCount = (int)($qComp->get_result()->fetch_assoc()['completed'] ?? 0);
            
            $qCan = $conn->prepare("SELECT COUNT(*) as cancels FROM tbl_order_cancel_history WHERE RiderId = ?");
            $qCan->bind_param("i", $riderId); $qCan->execute();
            $cancelCount = (int)($qCan->get_result()->fetch_assoc()['cancels'] ?? 0);
            
            $totalEngagements = $completedCount + $cancelCount;
            $newCancelRate = ($totalEngagements > 0) ? round(($cancelCount / $totalEngagements) * 100, 2) : 0;
            $newAcceptRate = 100 - $newCancelRate;
            
            $uRate = $conn->prepare("UPDATE tbl_rider SET RiderCancelRate = ?, RiderAcceptRate = ? WHERE RiderId = ?");
            $uRate->bind_param("ddi", $newCancelRate, $newAcceptRate, $riderId);
            $uRate->execute();
        }

        $conn->commit();
        return true;
    } catch (Exception $e) {
        $conn->rollback();
        return false;
    }
}
?>
