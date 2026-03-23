<?php
$servers = ["localhost:3306", "127.0.0.1:3306", "localhost:3307", "127.0.0.1:3307"];
$db = "bitesync";
$user = "root";
$pass = "";

foreach ($servers as $s) {
    echo "Trying $s...\n";
    @$conn = new mysqli($s, $user, $pass, $db);
    if ($conn->connect_error) {
        echo "Failed: " . $conn->connect_error . "\n";
        continue;
    }
    echo "Success connected to $s!\n";
    echo "\nAll Tables in Database:\n";
    $res = $conn->query("SHOW TABLES");
    while($row = $res->fetch_array()) {
        echo $row[0] . "\n";
    }

    echo "\nAll Users in tbl_userinfo:\n";
    $res = $conn->query("SELECT * FROM tbl_userinfo");
    while($row = $res->fetch_assoc()) {
        unset($row['UsrPassword']);
        echo json_encode($row) . "\n";
    }

    $conn->close();
    break; 
}
?>
