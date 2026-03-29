<?php
include __DIR__ . "/../dbconnect/dbconnect.php";
$conn->set_charset("utf8mb4");

echo "=== DESC tbl_payment ===\n";
$res = $conn->query("DESC tbl_payment");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        echo json_encode($row) . "\n";
    }
} else {
    echo "Table tbl_payment does not exist.\n";
}
?>
