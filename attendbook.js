var ab = exports;

var Requester = require('./requester').Requester;
var Command = require('./requester').Command;
console.log('http sequential request loaded');

var recognizer = require('./recognizer');
console.log('data extractor loaded');

var Data = require('./db').Data;
var db = require('./db');
console.log('sqlite db loaded');

function store(r, id) {
	var data = new Data(id, r.rank, r.grade, r.late_rate, r.avg_facetime, r.avg_latetime, r.point);
	db.insert(data);
}

ab.login = function(id, pwd, onResult) {
	var req = new Requester('www.infraware.net');

	var commands = (function() {
		var commands = [],
		command = new Command('POST', '/MainPage/Login_Company.asp');
		command.setBody('cboCompany=Infraware&txtID=' + id + '&txtPasswd=' + pwd + '&URLInfo=http%3A%2F%2Fwww.infraware.net%2FMyPage%2FMainFrame.asp%3FRightMenuURL%3Dhttp%3A%2F%2Fwww.infraware.net%2FMyPage%2FMyInfo%2FMyInfoEdit.asp');
		commands.push(command);

		command = new Command('POST', '/MainPage/Login_User.asp');
		command.setBody('UserID=' + id + '&UserPasswd=' + pwd + '&URLInfo=http%3A%2F%2Fwww.infraware.net%2FMyPage%2FMainFrame.asp%3FRightMenuURL%3Dhttp%3A%2F%2Fwww.infraware.net%2FMyPage%2FMyInfo%2FMyInfoEdit.asp');
		commands.push(command);

		command = new Command('GET', '/MyPage/MyInfo/MyInfoEdit.asp');
		command.on('data', function(data) {
			console.log('data earned');
			var record = recognizer.read(data);
			console.log(JSON.stringify(record));
			store(record, id);

			onResult(null, record.name);
		});
		commands.push(command);
		return commands;
	})();

	req.setCommands(commands);
	req.run();
}

ab.query = function(id, onResult) {
	onResult(null, result);
}

