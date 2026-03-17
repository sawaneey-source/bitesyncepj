<?php

$servername = "172.25.61.117";
$username = "test";
$password = "1234";
$dbname = "bitesync";

$conn = new mysqli($servername,$username,$password,$dbname);

if($conn->connect_error){
    die("Connection failed");
}