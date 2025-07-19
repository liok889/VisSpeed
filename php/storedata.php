<?php
session_start();

include 'checkmobile.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(["status" => "failure", "reason" => "user unregistered"]);
    exit(0);
}

$json_str = file_get_contents('php://input');
$json_obj = json_decode($json_str);

if ($json_obj == null) {
    echo json_encode(["status" => "failure", "reason" => "invalid json"]);
    exit(0);
}

include 'connect.php';

$userid = $_SESSION['user'];
$insert = [];

foreach ($json_obj->experimentalData as $row) {
    $jsonParam = json_encode($row);
    $strParam = mysqli_real_escape_string($conn, $jsonParam);

    // Escape strings for SQL
    $selection = mysqli_real_escape_string($conn, $row->selection);
    $visType = mysqli_real_escape_string($conn, $row->visType);
    $mode = mysqli_real_escape_string($conn, $row->mode);


    $insert[] = "(" .
        $userid . ", " .
        intval($row->blockNum) . ", " .
        intval($row->trialNum) . ", " .
        intval($row->classNum) . ", " .
        intval($row->correct) . ", " .
        "'" . $selection . "', " .
        "'" . $visType . "', " .
        "'" . $mode . "', " .
        floatval($row->delta) . ", " .
        floatval($row->deltaSecondary) . ", " .
        floatval($row->requestedDelta) . ", " .
        intval($row->exposureTime) . ", " .
        intval($row->fixationTime) . ", " .
        intval($row->generationTime) . ", " .
        intval($row->responseTime) . ", " .
        floatval($row->mean1) . ", " .
        floatval($row->mean2) . ", " .
        floatval($row->std1) . ", " .
        floatval($row->std2) . ", " .
        "'" . $strParam . "'" .
    ")";
}

$sql = "INSERT INTO response
(userid, blockNum, trialNum, classNum, correct, selection, visType, mode, delta, deltaSecondary, requestedDelta, exposureTime, fixationTime, generationTime, responseTime, mean1, mean2, std1, std2, parameters)
VALUES " . implode(',', $insert);

if (!isset($_SESSION['datastored']) && mysqli_query($conn, $sql))
{
    // Update engagement and stimulus accuracy if present
    if (isset($json_obj->stimulusAccuracy) || isset($json_obj->engagementAccuracy))
    {
        $stimulusAcc = isset($json_obj->stimulusAccuracy) ? floatval($json_obj->stimulusAccuracy) : 0;
        $engagementAcc = isset($json_obj->engagementAccuracy) ? floatval($json_obj->engagementAccuracy) : 0;

        $updateSql = "UPDATE user
                      SET stimulusAcc = $stimulusAcc, engagementAcc = $engagementAcc
                      WHERE userid = $userid";

        mysqli_query($conn, $updateSql);
    }

    $_SESSION['datastored'] = true;
    echo json_encode(["status" => "success"]);
    mysqli_close($conn);
    exit(0);
}
else if (!isset($_SESSION['datastored'])) {
    $mysqlError = mysqli_error($conn);

    // Backup data
    file_put_contents("backup/data_" . $userid . ".txt", $json_str);
    file_put_contents("backup/error_" . $userid . ".txt", "SQL: " . $sql . "\n\nError: " . $mysqlError);

    echo json_encode(["status" => "success", "reason" => "savedAsBackupFile: " . $mysqlError]);
    mysqli_close($conn);
    $_SESSION['datastored'] = true;
    exit(0);
}
else {
    echo json_encode(["status" => "success"]);
    mysqli_close($conn);
    exit(0);
}
?>
