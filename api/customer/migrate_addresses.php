<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';

// Link AdrId to UsrId based on tbl_order
$conn->query("UPDATE tbl_address a 
              JOIN tbl_order o ON a.AdrId = o.AdrId 
              SET a.UsrId = o.UsrId 
              WHERE a.UsrId IS NULL");

// Set the latest address as default for each user if no default exists
$userRes = $conn->query("SELECT DISTINCT UsrId FROM tbl_address WHERE UsrId IS NOT NULL");
while($u = $userRes->fetch_assoc()){
    $uid = $u['UsrId'];
    $checkDef = $conn->query("SELECT AdrId FROM tbl_address WHERE UsrId = $uid AND IsDefault = 1");
    if($checkDef->num_rows == 0){
        $conn->query("UPDATE tbl_address SET IsDefault = 1 WHERE UsrId = $uid ORDER BY AdrId DESC LIMIT 1");
    }
}

echo json_encode(["success"=>true, "message"=>"Addresses migrated and linked"]);
?>
