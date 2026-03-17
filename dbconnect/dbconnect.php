<?php

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "bitesync";

$conn = new mysqli($servername,$username,$password,$dbname);

if($conn->connect_error){
    die("Connection failed");
}