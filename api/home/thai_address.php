<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

// earthchie db.json format:
// {"data": [[province_name, [[district_name, [[subdistrict_name, zipcode], ...]], ...]], ...], ...}

$raw = file_get_contents(dirname(__FILE__) . "/../../public/thai-address.json");
$db  = json_decode($raw, true);

$words = isset($db['words']) ? explode('|', $db['words']) : [];
$lookup_raw = isset($db['lookup']) ? explode('|', $db['lookup']) : [];
$data = $db['data'];

function expandTokens($val, $words) {
    if (!is_string($val)) return $val;
    $res = '';
    $len = mb_strlen($val, 'UTF-8');
    for ($i = 0; $i < $len; $i++) {
        $c = mb_substr($val, $i, 1, 'UTF-8');
        $cc = ord($c);
        if ($cc >= 65 && $cc <= 90) { // A-Z (0-25)
            $res .= $words[$cc - 65] ?? $c;
        } elseif ($cc >= 97 && $cc <= 122) { // a-z (26-51)
            $res .= $words[$cc - 71] ?? $c;
        } else {
            $res .= $c;
        }
    }
    return $res;
}

// Pre-expand the lookup table for performance
$lookup = [];
foreach ($lookup_raw as $entry) {
    $lookup[] = expandTokens($entry, $words);
}

/**
 * Recursive expander using the lookup table
 */
function expandDeep($item, $words, $lookup) {
    if (is_array($item)) {
        foreach ($item as $k => $v) {
            $item[$k] = expandDeep($v, $words, $lookup);
        }
        return $item;
    }
    if (is_int($item)) {
        // Threshold: Integers under 10000 are likely indices in lookup
        if ($item < 10000) {
            return $lookup[$item] ?? $item;
        }
        return $item; // Likely a zipcode
    }
    if (is_string($item)) {
        return expandTokens($item, $words);
    }
    return $item;
}

$expandedData = expandDeep($data, $words, $lookup);

$result = [];
foreach ($expandedData as $pEntry) {
    $pName = $pEntry[0] ?? '';
    $distList = $pEntry[1] ?? [];
    
    $amphures = [];
    foreach ($distList as $dEntry) {
        $dName = $dEntry[0] ?? '';
        $subList = $dEntry[1] ?? [];
        
        $tambons = [];
        foreach ($subList as $sEntry) {
            $sName = $sEntry[0] ?? '';
            $zipCode = $sEntry[1] ?? '';
            $tambons[] = ['name' => (string)$sName, 'zip' => (string)$zipCode];
        }
        if ($dName) {
            $amphures[] = ['name_th' => (string)$dName, 'tambon' => $tambons];
        }
    }
    if ($pName) {
        $result[] = ['name_th' => (string)$pName, 'amphure' => $amphures];
    }
}

// Sort provinces A-Z
usort($result, fn($a, $b) => strcmp($a['name_th'] ?? '', $b['name_th'] ?? ''));

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
