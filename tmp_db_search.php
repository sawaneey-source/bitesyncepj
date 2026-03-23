<?php
$conn = new mysqli('localhost', 'root', '');
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Databases:\n";
$res = $conn->query("SHOW DATABASES");
while($row = $res->fetch_array()) {
    $db = $row[0];
    echo "- $db\n";
    if ($db === 'information_schema' || $db === 'performance_schema' || $db === 'mysql' || $db === 'sys') continue;
    
    $conn->select_db($db);
    $res2 = $conn->query("SHOW TABLES");
    if ($res2) {
        while($row2 = $res2->fetch_array()) {
            $table = $row2[0];
            $res3 = $conn->query("SELECT COUNT(*) as cnt FROM `$table` ");
            $cnt = $res3->fetch_assoc()['cnt'];
            echo "  $table ($cnt rows)\n";
        }
    }
}
$conn->close();
?>
