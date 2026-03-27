<?php
$url = 'http://localhost/bitesync/api/rider/jobs.php?usrId=12';
$result = file_get_contents($url);
$data = json_decode($result, true);
echo "JOBS COUNT: " . count($data['data']) . "\n";
foreach($data['data'] as $j) {
    echo "ID: {$j['id']} | Shop: {$j['shopName']} | Dist: {$j['distance']}\n";
}
?>
