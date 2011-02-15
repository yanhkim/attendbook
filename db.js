//simple binary lock ^-^
var lock = (function() {
	var _lock = false;
	return {
		set: function() {
			_lock = true;
		},
		clear: function() {
			_lock = false;
			later.replay();		//attempt to deal with delayed jobs, if exists..
		},
		p: function() {
			return _lock;
		}
	}
})();

//simple queue
var later = (function() {
	var queue = [];
	return {
		register: function(kind, arg1, arg2) {
			queue.push([kind, arg1, arg2]);
		},
		replay: function() {
			var job = queue.shift();
			if (job == undefined)
				return;

			console.log('db.js: replay job: ' + job[0]);

			switch (job[0]) {
				case 'insert':
					insert(job[1], job[2]);
					break;
				case 'query':
					query(job[1], job[2]);
					break;
				case 'register':
					register(job[1], job[2]);
					break;
			}
		}
	}
})();

lock.set();		//set lock until db ready

var NUM_OF_TABLES = 2;

//setup
var sqlite = require('./deps/node-sqlite/sqlite.js'),
db = new sqlite.Database();

//some pre-defined SQLs
var SQL_EXISTANCE_TEST =
"SELECT name FROM sqlite_master WHERE " +
"name = 'records' or " +
"name = 'infos';";

var SQL_CREATE_TABLE =
"CREATE TABLE IF NOT EXISTS " +
"records(id TEXT, date DATE, rank INTEGER, grade TEXT, late_rate DOUBLE, avg_facetime TEXT, avg_latetime TEXT, point DOUBLE); " +
"CREATE TABLE IF NOT EXISTS " +
"infos(id TEXT, name TEXT);";

var SQL_INSERT =
"INSERT INTO records (id, date, rank, grade, late_rate, avg_facetime, avg_latetime, point) " +
"VALUES ('{0}', DATETIME('NOW', 'LOCALTIME'), {1}, '{2}', {3}, '{4}', '{5}', {6});";

var SQL_REGISTER =
"INSERT INTO infos(id, name) " +
"VALUES ('{0}', '{1}');";

var SQL_QUERY =
"SELECT infos.id, name, date, rank, grade, late_rate, avg_facetime, avg_latetime, point " +
"FROM records, infos WHERE records.id = infos.id and records.id = '{0}' ORDER BY date DESC;";

var SQL_QUERY_LIMIT = SQL_QUERY.replace(/;$/, ' ') + "LIMIT {1};";

db.open('attendbook.db', function (error) {
	if (error) {
		console.log('db.js: error on open database');
		throw error;
	}

	console.log('before existance test: ' + SQL_EXISTANCE_TEST);
	
	//perfom existance test for our table.
	db.execute(SQL_EXISTANCE_TEST, function (error, rows) {
		if (error) {
			console.log('db.js: error on table existance test');
			throw error;
		}

		console.log('after existance test: ' + JSON.stringify(rows));

		//exports.foo = rows;
		if (rows.length == NUM_OF_TABLES) {
			lock.clear();
			return;
		}

		console.log('before create table: ' + SQL_CREATE_TABLE);

		db.executeScript(SQL_CREATE_TABLE, function (error) {
			if (error) {
				console.log('db.js: error on create table');
				throw error;
			}

			//exports.bar = 'create';
			//exports.bar2 = rows;

			lock.clear();
		});
	});
});


function insert(data, onFinish) {
	console.log('db.js: insert for : ' + JSON.stringify(data));

	var sql = data.fillSQL(SQL_INSERT);
	lock.set();
	db.execute(sql, function (error, rows) {
		lock.clear();	//error or not, clear the lock.

		if (error) {
			console.log('db.js: error on attempt to insert row - ' + JSON.stringify(data) + '\nSQL: ' + sql);
			throw error;
		}

		onFinish && onFinish();
	});
}

function register(id, name) {
	console.log('db.js: register new user (' + id + ', ' + name + ')');

	var sql = format(SQL_REGISTER, escape(id), escape(name));

	lock.set();
	db.execute(sql, function (error, rows) {
		lock.clear();	//error or not, clear the lock.

		if (error) {
			console.log('db.js: error on attempt to insert row with SQL: ' + sql);
			throw error;
		}
	});
}

function query(key, onData, limit) {
	console.log('db.js: query for : ' + key);

	var sql = limit ?	format(SQL_QUERY_LIMIT, escape(key), escape(limit)) :
						format(SQL_QUERY, escape(key));

	lock.set();
	db.execute(sql, function (error, rows) {
		lock.clear();

		if (error) {
			console.log('db.js: error on attempt to query for - ' + key + '\nSQL: ' + sql);
			throw error;
		}

		var datas = [];
		for (var i = 0; i < rows.length; i++) {
			var row = rows[i];
			datas.push(new Data().readfrom(row));
		}

		onData(datas);
	});
}

function format(s) {
   	var formatted = s;
   	for (var i = 1; i < arguments.length; i++) {
       	var regexp = new RegExp('\\{' + (i - 1) + '\\}', 'gi');
       	formatted = formatted.replace(regexp, arguments[i]);
   	}
   	return formatted;
}

// features
function Data(key, rank, grade, lrate, aftime, altime, point) {
	this.key = escape(key);
	this.rank = escape(rank);
	this.grade = escape(grade);
	this.lrate = escape(lrate);
	this.aftime = escape(aftime);
	this.altime = escape(altime);
	this.point = escape(point);
}

Data.prototype = {
	fillSQL: function(template) {
		return format(template, this.key, this.rank, this.grade, this.lrate, this.aftime, this.altime, this.point);
	},
	readfrom: function(row) {
		this.key = unescape(row.id);
		this.name = unescape(row.name);
		this.date = new Date(row.date);
		this.rank = row.rank;
		this.grade = unescape(row.grade);
		this.lrate = row.late_rate;
		this.aftime = unescape(row.avg_facetime);
		this.altime = unescape(row.avg_latetime);
		this.point = row.point;

		return this;
	}
};

exports.Data = Data;

exports.insert = function(data, onFinish) {
	if (lock.p()) {
		console.log('db.js: db busy. insert job delayed');
		later.register("insert", data, onFinish);
		return;
	}

	insert(data, onFinish);
};

exports.query = function(key, onData) {
	if (lock.p()) {
		console.log('db.js: db busy. query job delayed');
		later.register("query", key, onData);
		return;
	}

	query(key, onData);
};

exports.register = function(id, name) {
	if (lock.p()) {
		console.log('db.js: db busy. register job delayed');
		later.register("register", key, onData);
		return;
	}

	register(id, name);
}
