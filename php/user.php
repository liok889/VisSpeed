<?php
session_start();
include 'checkmobile.php';
if ($_SESSION['status'] == 'failed') {
	header("Location: exit.php");
	exit(0);
}
?><html>
<head>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
  <style>

    .center-div {
      margin: 0 auto;
      margin-top: 100px;
    }

    .instructions {
      font-family: Arial, sans-serif;
      font-size: 16px;
    }

    .navlinks {
      font-family: Arial, sans-serif;
      font-size: 18px;
    }

    .title {
      font-size: 20px; 
      font-weight: bold
    }
    .title-cell 
    {
      width: 100%;
      padding-bottom: 20px;
      padding-top: 20px;
      text-align: center; 
      background-color: #dddddd;

    }

    .varNameText {
      font-family: Arial, sans-serif;
      font-size: 15px;
    }

  </style>  

</head>
<body>
  <div style="width: 500px" class="center-div">

    <div class="instructions title-cell">
      <span class="title">
        Welcome
      </span> 
    </div>

 <?php
        if(isset($_SESSION['error'])){
        if($_SESSION['error']=='user') {
          ?><br><span class="instructions" style="color: red">The Prolific/Mturk ID entered is invalid or already exists (have you taken this study before?)</span><?php
          }
        }
?>
    <p><div class="instructions" style="margin-top: 30px">
      Please enter your Prolific or MTurk ID:

      <p><form onsubmit="return false;">
        <input style="font-size: 15px; width: 250px" type="text" id="mturk" placeholder="your ID">
      </form>
      <button type="button" style="font-size: 15px" class="btn btn-info" id="submit" onclick="myAjax()">Submit</button><br>
    </div>
  </div>

  <script type="text/javascript">
  function myAjax() {
    var id = $("#mturk").val().trim();
    if(id && id.length > 0){
    console.log(id);
      $.ajax({
           type: "POST",
           url: 'user_register.php',
           data:{
                'mturkid': id},
           success: function(data, textStatus, xhr) {
             console.log(data);
             if(data.indexOf('success') >= 0) { // if true (1)
                setTimeout(function(){// wait for 5 secs(2)
			location.href = 'tutorial1.html?statistic=' + <?php echo '"' . $_SESSION['expcondition'] . '"' ?>; // then reload the page.(3)
                }, 100);
             }
             else{
                location.href = 'user.php';
             }
           },
           error: function(xhr, textStatus, errorThrown) {
               console.log(textStatus.reponseText);
           }
      });
    }
    else{
      alert("Please enter your Prolific or MTruk ID to continue");
    }
    }

    $('#mturk').keydown(function (event) {
    var keypressed = event.keyCode || event.which;
    if (keypressed == 13 && $(this).val() != "") {
        myAjax();
    }
});
  </script>
</body>
</html>
