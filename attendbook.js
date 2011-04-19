var ab = exports;

var Requester = require('./requester').Requester;
var Command = require('./requester').Command;
console.log('http sequential request loaded');

var Recognizer = require('./recognizer').Recognizer;
console.log('data extractor loaded');

var Data = require('./db').Data;
var db = require('./db');
console.log('sqlite db loaded');

function need2insert(id, done) {
	var res = {};

	// d: newest date string stored in db. it's local time (GMT +9)
	var sameDay = function(target) {
		// due to nodeJS's time bug, we use manually adjusted UTC time.
		var d = new Date(),
		today = new Date(d.getTime() + (9 * 60 * 60 * 1000));

		return today.toDateString() == target.toDateString();
	}

	var holyDay = function() {
		return false;

		//TODO
	}

	db.query(id, function(datas) {
		if (datas.length == 0)
			return done({newuser: true, yes: true});

		if (holyDay() || sameDay(datas[0].date))
			return done({no: true, name: datas[0].name});

		return done({yes: true});
	}, 1);
}

function register(id, name) {
	db.register(id, name);
}

function store(r, id, done) {
	var data = new Data(id, r.rank, r.grade, r.late_rate, r.avg_facetime, r.avg_latetime, r.point);
	db.insert(data, function() {
		done();
	});
}

function query(id, cb) {
	db.query(id, function(datas) {
		cb(null, datas);
	});
}

function who(cb) {
	db.who( function(names) { cb(null, names); } );
}

ab.login = function(id, pwd, onResult) {

	need2insert(id, function(res) {
		if (res.no) {
			console.log('already has newest record for user: ' + id + '(' + res.name + ')');
			return onResult(null, res.name);
		}

		var req = new Requester('www.infraware.net');

		var commands = (function() {
			var commands = [],
			command = new Command('POST', '/MainPage/Login_Company.asp');
			command.setBody('cboCompany=Infraware&txtID=' + id + '&txtPasswd=' + pwd + '&URLInfo=http%3A%2F%2Fwww.infraware.net%2FMyPage%2FMainFrame.asp%3FRightMenuURL%3Dhttp%3A%2F%2Fwww.infraware.net%2FMyPage%2FMyInfo%2FMyInfoEdit.asp');
			commands.push(command);

			command = new Command('POST', '/MainPage/Login_User.asp');
			command.setBody('UserID=' + id + '&UserPasswd=' + pwd + '&URLInfo=http%3A%2F%2Fwww.infraware.net%2FMyPage%2FMainFrame.asp%3FRightMenuURL%3Dhttp%3A%2F%2Fwww.infraware.net%2FMyPage%2FMyInfo%2FMyInfoEdit.asp');
			commands.push(command);

			var recognizer = new Recognizer();
			command = new Command('GET', '/MyPage/MyInfo/MyInfoEdit.asp');
			command.on('data', function(data) {
				console.log('data received');
				recognizer.feed(data);
			});
			command.on('end', function() {
				console.log('data ends');
				var record = recognizer.read();
				//console.log(JSON.stringify(record));

				if (record.error)
					return onResult(record.error);

				if (res.newuser)
					register(id, record.name);

				store(record, id, function() {
					onResult(null, record.name);
				});
			});
			commands.push(command);
			return commands;
		})();

		req.setCommands(commands);
		req.run();
	});


}

ab.query = function(id, onResult) {
	query(id, onResult);
}

ab.who = function(cb) {
	who(cb);
}

