<?php
// Simulate the RiderLayout toggle
$url = 'http://localhost/bitesync/api/rider/status.php';
$data = ['status' => 'Online', 'usrId' => 12];
$options = [
    'http' => [
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    ]
];
$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
echo "API RESPONSE: $result\n";

include "c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php";
$res = $conn->query("SELECT RiderStatus FROM tbl_rider WHERE UsrId = 12");
$row = $res->fetch_assoc();
echo "NEW DB STATUS: " . ($row['RiderStatus'] ?? 'NULL') . "\n";
?>
