<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include dirname(__FILE__) . "/../../dbconnect/dbconnect.php";

$method = $_SERVER['REQUEST_METHOD'];

$in = json_decode(file_get_contents("php://input"), true);
$usrId = $_GET['usrId'] ?? $in['usrId'] ?? $_POST['usrId'] ?? null;

if (!$usrId) {
    echo json_encode(["success"=>false, "message"=>"Unauthorized"]);
    exit();
}

$r = $conn->prepare("SELECT ShopId FROM tbl_shop WHERE UsrId = ? LIMIT 1");
$r->bind_param("i", $usrId);
$r->execute();
$shopRow = $r->get_result()->fetch_assoc();
if (!$shopRow) {
    echo json_encode(["success"=>false, "message"=>"Shop not found"]);
    exit();
}
$shopId = $shopRow['ShopId'];

if ($method === 'GET') {
    // Alias columns to match frontend expectations (FodId, FodName, etc.)
    $sql = "SELECT
                f.FoodId as id,
                f.FoodName as name,
                f.FoodPrice as price,
                f.FoodImagePath as image,
                IF(f.FoodStatus=1, 'available', 'out_of_stock') as status,
                f.FoodDetail as `desc`,
                c.CatName as category,
                f.FoodPrepTime as prepTime
            FROM tbl_food f
            LEFT JOIN tbl_menu_category c ON f.CatId = c.CatId
            WHERE f.ShopId = ?
            ORDER BY f.FoodId DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $shopId);
    $stmt->execute();
    $res = $stmt->get_result();
    $data = [];
    while($row = $res->fetch_assoc()) $data[] = $row;
    echo json_encode(["success"=>true, "data"=>$data]);

} elseif ($method === 'POST') {
    $name = $_POST['name'] ?? '';
    $catName = $_POST['category'] ?? '';
    $price = $_POST['price'] ?? 0;
    $desc = $_POST['description'] ?? null;
    if ($desc === '' || $desc === 'null') $desc = null;
    $statusText = $_POST['status'] ?? 'available';
    $status = ($statusText === 'available') ? 1 : 0;
    $prepTime = $_POST['prepTime'] ?? 30;
    $id = $_POST['id'] ?? $_GET['id'] ?? null;
    $removeImage = ($_POST['removeImage'] ?? 'false') === 'true';

    // Find CatId from CatName
    $catId = 0;
    if($catName) {
        $cs = $conn->prepare("SELECT CatId FROM tbl_menu_category WHERE CatName = ? LIMIT 1");
        $cs->bind_param("s", $catName);
        $cs->execute();
        $r = $cs->get_result()->fetch_assoc();
        if($r) $catId = $r['CatId'];
    }

    $imgPath = '';
    if(isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../../public/uploads/menu/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $fileName = 'menu_' . time() . '_' . rand(100,999) . '.' . $ext;
        if(move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $fileName)) {
            $imgPath = '/uploads/menu/' . $fileName;
        }
    }

    $addons = $_POST['addons'] ?? '[]';

    if ($id) {
        $sql = "UPDATE tbl_food SET FoodName=?, CatId=?, FoodPrice=?, FoodDetail=?, FoodStatus=?, FoodPrepTime=?";
        if ($removeImage) {
            $sql .= ", FoodImagePath=''";
        } elseif ($imgPath) {
            $sql .= ", FoodImagePath=?";
        }
        $sql .= " WHERE FoodId=? AND ShopId=?";
        
        $stmt = $conn->prepare($sql);
        if (!$removeImage && $imgPath) {
            $stmt->bind_param("sidsiisii", $name, $catId, $price, $desc, $status, $prepTime, $imgPath, $id, $shopId);
        } else {
            $stmt->bind_param("sidsiiii", $name, $catId, $price, $desc, $status, $prepTime, $id, $shopId);
        }
        
        if ($stmt->execute()) {
            // Update Addons
            $conn->query("DELETE FROM tbl_addon WHERE FoodId = $id");
            $addons_arr = json_decode($addons, true);
            if (is_array($addons_arr)) {
                $stmt_a = $conn->prepare("INSERT INTO tbl_addon (FoodId, AddonName, AddonPrice, AddonStatus) VALUES (?, ?, ?, 1)");
                foreach ($addons_arr as $a) {
                    $aname = $a['name'] ?? '';
                    $aprice = $a['price'] ?? 0;
                    if ($aname) {
                        $stmt_a->bind_param("isd", $id, $aname, $aprice);
                        $stmt_a->execute();
                    }
                }
            }
            echo json_encode(["success"=>true, "message"=>"Menu updated"]);
        } else {
            echo json_encode(["success"=>false, "message"=>$conn->error]);
        }
    } else {
        $sql = "INSERT INTO tbl_food (FoodName, CatId, FoodPrice, FoodDetail, FoodStatus, FoodImagePath, ShopId, FoodPrepTime) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sidsisii", $name, $catId, $price, $desc, $status, $imgPath, $shopId, $prepTime);
        
        if($stmt->execute()){
            $foodId = $conn->insert_id;
            // Handle Addons
            $addons_arr = json_decode($addons, true);
            if (is_array($addons_arr)) {
                $stmt_a = $conn->prepare("INSERT INTO tbl_addon (FoodId, AddonName, AddonPrice, AddonStatus) VALUES (?, ?, ?, 1)");
                foreach ($addons_arr as $a) {
                    $aname = $a['name'] ?? '';
                    $aprice = $a['price'] ?? 0;
                    if ($aname) {
                        $stmt_a->bind_param("isd", $foodId, $aname, $aprice);
                        $stmt_a->execute();
                    }
                }
            }
            echo json_encode(["success"=>true, "message"=>"Menu saved with addons"]);
        } else {
            echo json_encode(["success"=>false, "message"=>$conn->error]);
        }
    }

} elseif ($method === 'PUT') {
    // For simplicity with image uploads, some people use POST for updates. 
    // But let's handle JSON PUT for now. If they need image upload on edit, we'd use POST.
    $in = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $in['id'] ?? null;
    if(!$id) exit(json_encode(["success"=>false, "message"=>"ID required"]));

    $name = $in['name'] ?? '';
    $price = $in['price'] ?? 0;
    $desc = $in['description'] ?? null;
    if ($desc === '' || $desc === 'null') $desc = null;
    $statusText = $in['status'] ?? 'available';
    $status = ($statusText === 'available') ? 1 : 0;
    $catName = $in['category'] ?? '';
    $prepTime = $in['prepTime'] ?? 30; // Added FoodPrepTime
    $addons = $in['addons'] ?? [];

    // Find CatId
    $catId = 0;
    if($catName) {
        $cs = $conn->prepare("SELECT CatId FROM tbl_menu_category WHERE CatName = ? LIMIT 1");
        $cs->bind_param("s", $catName);
        $cs->execute();
        $r = $cs->get_result()->fetch_assoc();
        if($r) $catId = $r['CatId'];
    }

    $sql = "UPDATE tbl_food SET FoodName=?, CatId=?, FoodPrice=?, FoodDetail=?, FoodStatus=?, FoodPrepTime=? WHERE FoodId=? AND ShopId=?"; // Added FoodPrepTime
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sidsiiii", $name, $catId, $price, $desc, $status, $prepTime, $id, $shopId); // Added 'i' for FoodPrepTime
    
    if($stmt->execute()){
        // Update Addons: Delete old ones and insert new ones
        $conn->query("DELETE FROM tbl_addon WHERE FoodId = $id");
        if (is_array($addons)) {
            $stmt_a = $conn->prepare("INSERT INTO tbl_addon (FoodId, AddonName, AddonPrice, AddonStatus) VALUES (?, ?, ?, 1)");
            foreach ($addons as $a) {
                $aname = $a['name'] ?? '';
                $aprice = $a['price'] ?? 0;
                if ($aname) {
                    $stmt_a->bind_param("isd", $id, $aname, $aprice);
                    $stmt_a->execute();
                }
            }
        }
        echo json_encode(["success"=>true, "message"=>"Menu updated"]);
    } else {
        echo json_encode(["success"=>false, "message"=>$conn->error]);
    }

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if(!$id) exit(json_encode(["success"=>false, "message"=>"ID required"]));
    
    $stmt = $conn->prepare("DELETE FROM tbl_food WHERE FoodId = ? AND ShopId = ?");
    $stmt->bind_param("ii", $id, $shopId);
    if($stmt->execute()){
        echo json_encode(["success"=>true]);
    } else {
        echo json_encode(["success"=>false, "message"=>$conn->error]);
    }
}

$conn->close();
?>
