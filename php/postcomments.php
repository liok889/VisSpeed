<?php
	session_start();
	include 'connect.php';

	/*$_SESSION['status'] = 'sucess'*/
    if (false) 
    {
		header('Location: exit.php' );
	}
	else
	{

		$hasData = false;
		$comments = trim($_POST['comments']);
		if (!isset($_POST['comments']) || strlen($comments) == 0) {
			$comments = "NULL";
		}
		else
		{
			$comments = "'" . mysqli_real_escape_string($conn, $comments) . "'";
			$hasData = true;
		}

		$age = trim($_POST['age']);
		if (!is_numeric($age)) {
			$age = "NULL";
		}
		else
		{
			$age = "" . $age;
			$hasData = true;
		}

		$gender = trim($_POST['gender']);
		if (!isset($_POST['gender']) || strlen($gender) == 0) {
			$gender = "NULL";
		}
		else
		{
			$gender = "'" . mysqli_real_escape_string($conn, $gender) . "'";
			$hasData = true;
		}

		$education = trim($_POST['education']);
		if (!isset($_POST['education']) || strlen($education) == 0) {
			$education = "NULL";
		}
		else
		{
			$education = "'" . mysqli_real_escape_string($conn, $education) . "'";
			$hasData = true;
		}


		$platform = trim($_SERVER['HTTP_USER_AGENT']);
		if (!isset($_SERVER['HTTP_USER_AGENT']) || strlen($platform) == 0) {
			$platform = "NULL";
		}
		else
		{
			$platform = "'" . mysqli_real_escape_string($conn, $platform) . "'";
			$hasData = true;
		}

		if ($hasData && isset($_SESSION['user']))
		{
			$userid = $_SESSION['user'];

			$sql = "INSERT INTO comment (userid, age, gender, education, freetext, platform) VALUES ($userid, $age, $gender, $education, $comments, $platform)";
			$result = mysqli_query($conn, $sql);
			if (!$result) {
				//die("query error: " . mysqli_error($conn));
			}
			else
			{
				//echo "SUCCESS";
			}
		}
		header('Location: givekey.php');
	}
	mysqli_close($conn);
?>
