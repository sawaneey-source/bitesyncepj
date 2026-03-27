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

        $conn->commit();
        return true;
    } catch (Exception $e) {
        $conn->rollback();
        return false;
    }
}
?>
