<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

/* CORS */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

/* Handle Preflight */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "dbconnect.php";

/* รับ JSON */
$data = json_decode(file_get_contents("php://input"), true);

if(!$data){
    echo json_encode([
        "success"=>false,
        "message"=>"No data received"
    ]);
    exit;
}

$role = $data["role"];
$fullName = $data["fullName"];
$email = $data["email"];
$phone = $data["phone"];
$password = $data["password"];

$hash = password_hash($password, PASSWORD_DEFAULT);

$sql = "INSERT INTO tbl_userinfo
(UsrRole, UsrFullName, UsrEmail, UsrPhone, UsrPassword)
VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss",$role,$fullName,$email,$phone,$hash);

if($stmt->execute()){
    $usrId = $conn->insert_id;
    echo json_encode([
        "success"=>true,
        "user"=>[
            "id"=>$usrId,
            "name"=>$fullName,
            "email"=>$email,
            "phone"=>$phone,
            "role"=>$role,
            "image"=>null,
            "address"=>null
        ],
        "token"=>"bitesync_login_token"
    ]);
}else{
    echo json_encode([
        "success"=>false,
        "message"=>$conn->error
    ]);
}