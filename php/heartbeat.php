<?php
	session_start();
	if (!isset($_SESSION['user']))
	{
		echo "NOT OK";
	}
	else
	{
		include 'connect.php';

		// get progress parameters
		$totalComplete = intval($_POST['totalComplete']);
		$totalAll = intval($_POST['totalAll']);
		$userid = $_SESSION['user'];
		$t = time() - $_SESSION['time'];

		$strHearbeat = "time: " . $t . ', complete: ' . $totalComplete . '/' . $totalAll;
		$strHearbeat = mysqli_real_escape_string($conn, $strHearbeat);

		$sql = "UPDATE user SET heartbeat='" . $strHearbeat . "' WHERE userid=" . $userid;
		mysqli_query($conn, $sql);
		mysqli_close($conn);

		echo "OK";
	}
?>