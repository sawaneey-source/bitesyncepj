<?php
// Mock a GET request to api/rider/profile.php?usrId=1
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['usrId'] = 1;
include "api/rider/profile.php";
?>
