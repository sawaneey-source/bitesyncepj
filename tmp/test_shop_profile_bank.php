<?php
include "c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php";

$usrId = 8; // Adjust to a valid shop user ID if known, or leave as is to test creation
$bankName = "Test Bank " . time();
$bankAcc = "123-456-" . rand(1000, 9999);

// Test POST
echo "Testing POST...\n";
$postData = [
    'usrId' => $usrId,
    'shopBankName' => $bankName,
    'shopBankAccount' => $bankAcc
];

$ch = curl_init('http://localhost/bitesync/api/shop/profile.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
if ($data && $data['success']) {
    echo "POST Success: " . $data['message'] . "\n";
    if ($data['data']['ShopBankName'] === $bankName && $data['data']['ShopBankAccount'] === $bankAcc) {
        echo "Data matched in response!\n";
    } else {
        echo "Data MISMATCH in response!\n";
    }
} else {
    echo "POST Failed: " . ($data['message'] ?? 'Unknown error') . "\n";
    echo "Raw response: " . $response . "\n";
}

// Test GET
echo "\nTesting GET...\n";
$response = file_get_contents("http://localhost/bitesync/api/shop/profile.php?usrId=$usrId&_t=" . time());
$data = json_decode($response, true);
if ($data && $data['success']) {
    echo "GET Success\n";
    if ($data['data']['ShopBankName'] === $bankName && $data['data']['ShopBankAccount'] === $bankAcc) {
        echo "Data verified via GET!\n";
    } else {
        echo "Data MISMATCH via GET!\n";
    }
} else {
    echo "GET Failed\n";
}
?>
