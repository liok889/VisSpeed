<?php
	session_start();

	include 'connect.php';
	$userid = $_SESSION['user'];
	$_SESSION['status'] = 'sucess';

	$description = $_POST['strategy'];
	$sql = "INSERT INTO strategy (userid, description) VALUES (" . $userid . ", '" . mysqli_real_escape_string($conn, $description) . "')";
	mysqli_query($conn, $sql);
	mysqli_close($conn);

	header("Location: comments_dem.php");
?>
