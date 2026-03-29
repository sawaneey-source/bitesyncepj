<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== SHOW COLUMNS FROM tbl_review ===\n";
$res = $conn->query("SHOW COLUMNS FROM tbl_review");
if ($res) {
    while($r = $res->fetch_assoc()) echo json_encode($r) . "\n";
} else {
    echo "tbl_review not found.\n";
}
?>
