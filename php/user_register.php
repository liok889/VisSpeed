<?php
session_start();
if (isset($_SESSION['user']))
{
	echo "success";
	exit(0);
}
/*
if (isset($_SESSION['user']))
{
	echo "success";
	exit(0);
}
*/

if (!isset($_POST['mturkid'])) {
	echo "error";
	exit(0);
}

include 'connect.php';

$id = $_POST['mturkid'];
$sql = "SELECT mturkid from user where mturkid='" . mysqli_real_escape_string($conn, $id) . "'";
$result = mysqli_query($conn,$sql);
$rowcount=mysqli_num_rows($result);

mysqli_free_result($result);

if ($rowcount > 0) 
{
	mysqli_close($conn);
	$_SESSION['error'] = 'user';
	echo "error";
	exit(0);
}
else
{
	unset($_SESSION['error']);
	$expcondition = mysqli_real_escape_string($conn, $_SESSION['expcondition']);
	$seq = intval($_SESSION['seq']);
	$sql = "INSERT INTO user (mturkid, expcondition, seq) VALUES ('" . mysqli_real_escape_string($conn, $id) . "', '" . $expcondition . "', " . $seq . ")";

	if (mysqli_query($conn, $sql)) 
	{
		$last_id = mysqli_insert_id($conn);
		$_SESSION['user'] = $last_id;
		$_SESSION['status'] = '';
		$_SESSION['time'] = time();
		echo "success";
	}
	else
	{
		echo "error";
	}
	mysqli_close($conn);
}
?>
