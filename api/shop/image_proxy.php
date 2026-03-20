<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$file = isset($_GET['file']) ? $_GET['file'] : '';
if (!$file) {
    http_response_code(400);
    exit('No file specified');
}

// Security check: ensure the file is within the public directory
$realPublic = realpath('../../public');
$targetFile = realpath('../../public' . $file);

if ($targetFile && strpos($targetFile, $realPublic) === 0 && file_exists($targetFile)) {
    $mime = mime_content_type($targetFile);
    header('Content-Type: ' . $mime);
    readfile($targetFile);
} else {
    http_response_code(404);
    echo "File not found: " . htmlspecialchars($file);
}
?>
