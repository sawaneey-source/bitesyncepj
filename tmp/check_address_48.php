<?php
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== Investigating Address AdrId=48 ===\n";

// 1. Check the address details
$q1 = $conn->query("SELECT * FROM tbl_address WHERE AdrId = 48");
if ($row = $q1->fetch_assoc()) {
    echo "Address Found: " . json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
} else {
    echo "Address AdrId=48 not found.\n";
}

// 2. Check if it belongs to a shop
$q2 = $conn->query("SELECT ShopId, ShopName FROM tbl_shop WHERE AdrId = 48");
if ($sRow = $q2->fetch_assoc()) {
    echo "Usage identified: This address belongs to Shop '" . $sRow['ShopName'] . "' (ShopId: " . $sRow['ShopId'] . ")\n";
} else {
    echo "No shop found using this AdrId.\n";
}

// 3. Check if any orders used this address
$q3 = $conn->query("SELECT COUNT(*) as count FROM tbl_order WHERE AdrId = 48");
$count = $q3->fetch_row()[0];
echo "Orders using this address: $count\n";

?>
