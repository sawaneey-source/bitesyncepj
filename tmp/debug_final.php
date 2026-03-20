<?php
$_GET['usrId'] = 10;
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
include "api/shop/profile.php";
$out = ob_get_clean();
$d = json_decode($out, true);
echo "ShopLogoPath: " . ($d['data']['ShopLogoPath'] ?? 'NULL') . "\n";
echo "ShopBannerPath: " . ($d['data']['ShopBannerPath'] ?? 'NULL') . "\n";
echo "ShopLogoOriPath: " . ($d['data']['ShopLogoOriPath'] ?? 'NULL') . "\n";
