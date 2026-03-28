<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

include "../../dbconnect/dbconnect.php";

$sql = "SELECT SettingKey, SettingValue FROM tbl_settings";
$result = $conn->query($sql);

$settings = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $settings[$row['SettingKey']] = $row['SettingValue'];
    }
}

echo json_encode(['success' => true, 'data' => $settings]);
?>
