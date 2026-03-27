<?php
$c = new mysqli('localhost', 'root', '', 'bitesync');
// Find an order with a rider assigned
$sql = "SELECT o.OdrId, o.RiderId, r.UsrId as RiderUsrId, u.UsrFullName, u.UsrImagePath 
        FROM tbl_order o 
        JOIN tbl_rider r ON o.RiderId = r.RiderId 
        JOIN tbl_userinfo u ON r.UsrId = u.UsrId 
        WHERE o.RiderId IS NOT NULL AND o.RiderId != 0 
        LIMIT 5";
$r = $c->query($sql);
while($row = $r->fetch_assoc()) {
    print_r($row);
}
$c->close();
?>
