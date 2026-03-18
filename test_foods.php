<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';
$r=$conn->query('SELECT FoodId, ShopId, CatId, FoodName, FoodPrepTime FROM tbl_food ORDER BY FoodId DESC LIMIT 10');
while($row=$r->fetch_assoc()) echo json_encode($row) . "\n";
?>
