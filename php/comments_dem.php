<html>
<head>
  <!--JQuery-->
  <script src="https://code.jquery.com/jquery-3.0.0.min.js" integrity="sha256-JmvOoLtYsmqlsWxa7mDSLMwa6dZ9rrIdtrrVYRnDRH0=" crossorigin="anonymous"></script>
  <!-- Latest compiled and minified CSS -->
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
  <!-- Optional theme -->
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
  <!-- Latest compiled and minified JavaScript -->
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
    <style>
    </style>
</head>
<body>
  <div class="container">
  <div class="well row">
      <span class="col-lg-8" id="qspan">
      <p><h3>One last thing: please provide the following demographic information</h3>
      </p></span>
  </div>

  <div>
    <form action="postcomments.php" method="post">
      <p><h4>Your gender</h4>
        <input type="radio" name="gender" value="male">&nbsp;Male<br>
        <input type="radio" name="gender" value="female">&nbsp;Female<br>
        <input type="radio" name="gender" value="other">&nbsp;Other<br>
        <input type="radio" name="gender" value="nosay">&nbsp;Prefer not to say<br>
      <p>&nbsp;
      <p><h4>Your age: <input style="width: 50px" type="text" name="age" maxlength="2"></h4>

      <p>&nbsp;
      <p><h4>Highest education attained</h4>

        <input type="radio" name="education" value="none">&nbsp;No schooling<br>
        <input type="radio" name="education" value="highschool">&nbsp;High school<br>
        <input type="radio" name="education" value="associate">&nbsp;Associate degree<br>
        <input type="radio" name="education" value="bachelor">&nbsp;Bachelor degree<br>
        <input type="radio" name="education" value="master">&nbsp;Master degree<br>
        <input type="radio" name="education" value="doctorate">&nbsp;Doctorate degree<br>

      <p>&nbsp;
      <p><h4>Do you have any thoughts or comments about this study? <u>(optional)</u></h4>
      <textarea rows="4" cols="60" name="comments"></textarea><br><br>
      <input type="submit" class="btn btn-success" id="submit" value="Complete study">
    </form>
  </div>
  </div>
</body>
</html>
