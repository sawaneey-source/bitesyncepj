<?php
include 'c:/xampp/htdocs/bitesync/dbconnect/dbconnect.php';

// Find duplicates for the same user and same address strings
$sql = "SELECT UsrId, HouseNo, SubDistrict, District, Province, Zipcode, MIN(AdrId) as keepId, COUNT(*) as cnt 
        FROM tbl_address 
        WHERE UsrId IS NOT NULL 
        GROUP BY UsrId, HouseNo, SubDistrict, District, Province, Zipcode 
        HAVING cnt > 1";

$res = $conn->query($sql);
$dedupCount = 0;

while($row = $res->fetch_assoc()){
    $uid = $row['UsrId'];
    $h = $row['HouseNo'];
    $s = $row['SubDistrict'];
    $d = $row['District'];
    $p = $row['Province'];
    $z = $row['Zipcode'];
    $keepId = $row['keepId'];
    
    // Update tbl_order to use the keepId instead of the duplicate IDs
    $conn->query("UPDATE tbl_order SET AdrId = $keepId 
                  WHERE AdrId IN (SELECT AdrId FROM tbl_address 
                                  WHERE UsrId = $uid AND HouseNo = '$h' AND SubDistrict = '$s' AND District = '$d' AND Province = '$p' AND Zipcode = '$z' AND AdrId != $keepId)");
    
    // Delete the duplicates
    $conn->query("DELETE FROM tbl_address 
                  WHERE UsrId = $uid AND HouseNo = '$h' AND SubDistrict = '$s' AND District = '$d' AND Province = '$p' AND Zipcode = '$z' AND AdrId != $keepId");
                  
    $dedupCount++;
}

echo json_encode(["success"=>true, "message" => "Deduplicated $dedupCount address groups"]);
?>
