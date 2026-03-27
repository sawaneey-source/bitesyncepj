<?php
include "c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== LATEST ORDER ===\n";
$res = $conn->query("SELECT o.OdrId, o.OdrStatus, o.RiderId, o.ShopId, sa.AdrLat as ShopLat, sa.AdrLng as ShopLng 
                    FROM tbl_order o 
                    JOIN tbl_shop s ON o.ShopId = s.ShopId 
                    JOIN tbl_address sa ON s.AdrId = sa.AdrId 
                    ORDER BY o.OdrId DESC LIMIT 1");
$order = $res->fetch_assoc();
if ($order) {
    echo "Order ID: {$order['OdrId']} | Status: {$order['OdrStatus']} | RiderId: {$order['RiderId']}\n";
    echo "Shop Location: {$order['ShopLat']}, {$order['ShopLng']}\n";
} else {
    echo "No orders found.\n";
}

echo "\n=== RIDER (User 12) ===\n";
$res2 = $conn->query("SELECT RiderStatus, RiderLat, RiderLng FROM tbl_rider WHERE UsrId = 12");
$rider = $res2->fetch_assoc();
if ($rider) {
    echo "Status: {$rider['RiderStatus']} | Lat: {$rider['RiderLat']} | Lng: {$rider['RiderLng']}\n";
}

if ($order && $rider) {
    function getDist($lat1, $lon1, $lat2, $lon2) {
        $theta = $lon1 - $lon2;
        $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
        $dist = acos($dist);
        $dist = rad2deg($dist);
        return $dist * 60 * 1.1515 * 1.609344;
    }
    $d = getDist($order['ShopLat'], $order['ShopLng'], $rider['RiderLat'], $rider['RiderLng']);
    echo "\nDISTANCE: " . number_format($d, 2) . " km\n";
}

$conn->close();
?>
