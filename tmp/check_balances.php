<?php
include "dbconnect/dbconnect.php";
$res = $conn->query("SELECT r.RiderId, u.UsrFullName, r.RiderBalance, r.RiderTotalSettled FROM tbl_rider r JOIN tbl_userinfo u ON r.UsrId = u.UsrId");
echo "RIDERS:\n";
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
