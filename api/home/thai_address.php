<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: public, max-age=86400");

// earthchie db.json format:
// {"data": [[province_name, [[district_name, [[subdistrict_name, zipcode], ...]], ...]], ...], ...}
// Subdistrict and district values can be integers (index references) — we skip those (filter non-string)

$raw = file_get_contents(dirname(__FILE__) . "/../../public/thai-address.json");
$db  = json_decode($raw, true);

// The root object has a "data" key
$rows = isset($db['data']) ? $db['data'] : $db;

$result = [];

foreach ($rows as $provEntry) {
    if (!is_array($provEntry) || !isset($provEntry[0]) || !is_string($provEntry[0])) continue;
    $provName  = $provEntry[0];
    $distList  = $provEntry[1] ?? [];

    $amphures = [];
    foreach ($distList as $distEntry) {
        if (!is_array($distEntry) || !isset($distEntry[0]) || !is_string($distEntry[0])) continue;
        $distName  = $distEntry[0];
        $subList   = $distEntry[1] ?? [];

        $tambons = [];
        foreach ($subList as $subEntry) {
            if (!is_array($subEntry) || !isset($subEntry[0]) || !is_string($subEntry[0])) continue;
            $subName = $subEntry[0];
            $zip     = $subEntry[1] ?? '';
            $tambons[] = ['name' => $subName, 'zip' => (string)$zip];
        }
        if (!empty($tambons)) {
            $amphures[] = ['name_th' => $distName, 'tambon' => $tambons];
        }
    }
    if (!empty($amphures)) {
        $result[] = ['name_th' => $provName, 'amphure' => $amphures];
    }
}

// Sort provinces A-Z
usort($result, fn($a, $b) => strcmp($a['name_th'], $b['name_th']));

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
