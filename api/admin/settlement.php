<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 1. Get Shops with pending balances (from orders) + existing wallet balance
    $shops = [];
    $sql = "SELECT s.ShopId, s.ShopName, s.ShopBankName, s.ShopBankAccount, s.ShopBalance as oldBalance,
                   IFNULL(SUM(o.OdrFoodPrice - o.OdrGP), 0) as orderBalance
            FROM tbl_shop s
            LEFT JOIN tbl_order o ON s.ShopId = o.ShopId AND o.OdrStatus = 6 AND o.OdrShopSettled = 0
            GROUP BY s.ShopId
            HAVING (s.ShopBalance + IFNULL(SUM(o.OdrFoodPrice - o.OdrGP), 0)) > 0
            ORDER BY (s.ShopBalance + IFNULL(SUM(o.OdrFoodPrice - o.OdrGP), 0)) DESC";
    $res = $conn->query($sql);
    while($row = $res->fetch_assoc()) {
        $shops[] = [
            'type' => 'shop',
            'id' => $row['ShopId'],
            'name' => $row['ShopName'],
            'bank' => $row['ShopBankName'],
            'account' => $row['ShopBankAccount'],
            'balance' => (float)($row['oldBalance'] + $row['orderBalance'])
        ];
    }

    // 2. Get Riders with pending balances
    $riders = [];
    $sql = "SELECT r.RiderId, u.UsrFullName as name, r.RiderBankName, r.RiderBankAccount, r.RiderBalance as oldBalance,
                   IFNULL(SUM(o.OdrRiderFee), 0) as orderBalance
            FROM tbl_rider r
            JOIN tbl_userinfo u ON r.UsrId = u.UsrId
            LEFT JOIN tbl_order o ON r.RiderId = o.RiderId AND o.OdrStatus = 6 AND o.OdrRiderSettled = 0
            GROUP BY r.RiderId
            HAVING (r.RiderBalance + IFNULL(SUM(o.OdrRiderFee), 0)) > 0
            ORDER BY (r.RiderBalance + IFNULL(SUM(o.OdrRiderFee), 0)) DESC";
    $res = $conn->query($sql);
    while($row = $res->fetch_assoc()) {
        $riders[] = [
            'type' => 'rider',
            'id' => $row['RiderId'],
            'name' => $row['name'],
            'bank' => $row['RiderBankName'],
            'account' => $row['RiderBankAccount'],
            'balance' => (float)($row['oldBalance'] + $row['orderBalance'])
        ];
    }

    echo json_encode(['success' => true, 'shops' => $shops, 'riders' => $riders]);

} else if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $type = $data['type'] ?? '';
    $id   = $data['id'] ?? 0;

    if (!$id || !in_array($type, ['shop', 'rider'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
        exit;
    }

    $conn->begin_transaction();
    try {
        if ($type === 'shop') {
            // 1. Get wallet ShopBalance
            $stmt = $conn->prepare("SELECT ShopBalance FROM tbl_shop WHERE ShopId = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $walletAmt = (float)($stmt->get_result()->fetch_assoc()['ShopBalance'] ?? 0);

            // 2. Get pending order balance
            $stmt = $conn->prepare("SELECT IFNULL(SUM(OdrFoodPrice - OdrGP), 0) as total FROM tbl_order WHERE ShopId = ? AND OdrStatus = 6 AND OdrShopSettled = 0");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $orderAmt = (float)($stmt->get_result()->fetch_assoc()['total'] ?? 0);

            $totalAmt = $walletAmt + $orderAmt;
            if ($totalAmt > 0) {
                $stmt = $conn->prepare("UPDATE tbl_shop SET ShopTotalSettled = ShopTotalSettled + ?, ShopBalance = 0 WHERE ShopId = ?");
                $stmt->bind_param("di", $totalAmt, $id);
                $stmt->execute();

                $stmt = $conn->prepare("UPDATE tbl_order SET OdrShopSettled = 1 WHERE ShopId = ? AND OdrStatus = 6 AND OdrShopSettled = 0");
                $stmt->bind_param("i", $id);
                $stmt->execute();
            }
        } else if ($type === 'rider') {
            // 1. Get wallet RiderBalance
            $stmt = $conn->prepare("SELECT RiderBalance FROM tbl_rider WHERE RiderId = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $walletAmt = (float)($stmt->get_result()->fetch_assoc()['RiderBalance'] ?? 0);

            // 2. Get pending order balance
            $stmt = $conn->prepare("SELECT IFNULL(SUM(OdrRiderFee), 0) as total FROM tbl_order WHERE RiderId = ? AND OdrStatus = 6 AND OdrRiderSettled = 0");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $orderAmt = (float)($stmt->get_result()->fetch_assoc()['total'] ?? 0);

            $totalAmt = $walletAmt + $orderAmt;
            if ($totalAmt > 0) {
                $stmt = $conn->prepare("UPDATE tbl_rider SET RiderTotalSettled = RiderTotalSettled + ?, RiderBalance = 0 WHERE RiderId = ?");
                $stmt->bind_param("di", $totalAmt, $id);
                $stmt->execute();

                $stmt = $conn->prepare("UPDATE tbl_order SET OdrRiderSettled = 1 WHERE RiderId = ? AND OdrStatus = 6 AND OdrRiderSettled = 0");
                $stmt->bind_param("i", $id);
                $stmt->execute();
            }
        }
        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>
