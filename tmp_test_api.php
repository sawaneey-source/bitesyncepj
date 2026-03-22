<?php
$ch = curl_init('http://localhost/bitesync/api/rider/accept-job.php');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['orderId' => '#1025', 'riderId' => 5]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
echo "Response: " . $response . "\n";
echo "Error: " . curl_error($ch) . "\n";
curl_close($ch);
?>
