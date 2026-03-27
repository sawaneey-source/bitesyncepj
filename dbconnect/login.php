<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

/* CORS */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

/* Handle preflight */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include "dbconnect.php";

/* รับ JSON */
$data = json_decode(file_get_contents("php://input"), true);

$email = $data['email'];
$password = $data['password'];

$sql = "SELECT u.*, 
               CONCAT(COALESCE(a.HouseNo,''), ' ', COALESCE(a.SubDistrict,''), ' ', COALESCE(a.District,''), ' ', COALESCE(a.Province,''), ' ', COALESCE(a.Zipcode,'')) as address
        FROM tbl_userinfo u
        LEFT JOIN tbl_address a ON u.UsrId = a.UsrId AND a.IsDefault = 1
        WHERE u.UsrEmail = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s",$email);
$stmt->execute();

$result = $stmt->get_result();

if($result->num_rows > 0){

    $user = $result->fetch_assoc();

    if(password_verify($password,$user['UsrPassword'])){

        if (isset($user['UsrStatus']) && $user['UsrStatus'] == 0) {
            echo json_encode([
                "success" => false,
                "message" => "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อแอดมิน"
            ]);
            exit;
        }

        echo json_encode([
            "success"=>true,
            "user"=>[
                "id"=>$user['UsrId'],
                "name"=>$user['UsrFullName'],
                "email"=>$user['UsrEmail'],
                "phone"=>$user['UsrPhone'],
                "role"=>$user['UsrRole'],
                "image"=>$user['UsrImagePath'],
                "address"=>$user['address']
            ],
            "token"=>"bitesync_login_token"
        ]);

    }else{

        echo json_encode([
            "success"=>false,
            "message"=>"รหัสผ่านไม่ถูกต้อง"
        ]);

    }

}else{

    echo json_encode([
        "success"=>false,
        "message"=>"ไม่พบผู้ใช้นี้"
    ]);

}