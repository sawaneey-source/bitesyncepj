<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include dirname(__FILE__)."/../../dbconnect/dbconnect.php";

$data = [
    "stats" => [
        "riders" => 0,
        "orders" => 0,
        "shops" => 0,
        "foods" => 0
    ],
    "photos" => []
];

// 1. Total Riders
$r = $conn->query("SELECT COUNT(*) AS c FROM tbl_rider"); 
if($r) {
    $row = $r->fetch_assoc();
    $data['stats']['riders'] = (int)($row['c'] ?? 0);
}

// 2. Successful Orders (OdrStatus = 6 means Delivered)
$o = $conn->query("SELECT COUNT(*) AS c FROM tbl_order WHERE OdrStatus = 6");
if($o) {
    $row = $o->fetch_assoc();
    $data['stats']['orders'] = (int)($row['c'] ?? 0);
}

// 3. Partner Shops (ShopStatus = 1)
$s = $conn->query("SELECT COUNT(*) AS c FROM tbl_shop WHERE ShopStatus = 1");
if($s) {
    $row = $s->fetch_assoc();
    $data['stats']['shops'] = (int)($row['c'] ?? 0);
}

// 4. Food Items (active)
$f = $conn->query("SELECT COUNT(*) AS c FROM tbl_food WHERE FoodStatus = 1");
if($f) {
    $row = $f->fetch_assoc();
    $data['stats']['foods'] = (int)($row['c'] ?? 0);
}

// 5. Random Food Photos
$imgQ = $conn->query("SELECT FoodImagePath FROM tbl_food WHERE FoodImagePath IS NOT NULL AND FoodImagePath != '' AND FoodStatus = 1 ORDER BY RAND() LIMIT 5");
if ($imgQ) {
    while($row = $imgQ->fetch_assoc()) {
        $data['photos'][] = 'http://localhost/bitesync/public' . $row['FoodImagePath'];
    }
}

echo json_encode(["success" => true, "data" => $data], JSON_UNESCAPED_UNICODE);
?>
