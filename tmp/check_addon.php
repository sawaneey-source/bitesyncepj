<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== SHOW COLUMNS FROM tbl_addon ===\n";
$res = $conn->query("SHOW COLUMNS FROM tbl_addon");
if ($res) {
    while($r = $res->fetch_assoc()) echo json_encode($r) . "\n";
} else {
    echo "tbl_addon not found.\n";
}

echo "=== SELECT * FROM tbl_addon LIMIT 5 ===\n";
$res2 = $conn->query("SELECT * FROM tbl_addon LIMIT 5");
if ($res2) {
    while($r = $res2->fetch_assoc()) echo json_encode($r, JSON_UNESCAPED_UNICODE) . "\n";
}
?>
