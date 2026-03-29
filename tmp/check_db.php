<?php
$conn = new mysqli('localhost', 'root', '', 'bitesync');
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "=== DESCRIBE tbl_food ===\n";
$res = $conn->query("DESCRIBE tbl_food");
while($row = $res->fetch_assoc()) {
    echo "{$row['Field']} | {$row['Type']} | {$row['Null']} | {$row['Default']}\n";
}

$conn->close();
?>
