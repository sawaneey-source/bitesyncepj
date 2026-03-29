<?php
include __DIR__ . "/../dbconnect/dbconnect.php";
$res = $conn->query("SHOW COLUMNS FROM tbl_rider");
while($r = $res->fetch_assoc()) {
    echo $r['Field'] . " (" . $r['Type'] . ") - " . $r['Default'] . "\n";
}
?>
