//setup
var sqlite = require('./deps/node-sqlite/sqlite.js'),
db = new sqlite.Database();

//some pre-defined SQLs
var SQL_EXISTANCE_TEST =
"SELECT name FROM sqlite_master WHERE name = 'records'";

var SQL_CREATE_TABLE =
"CREATE TABLE\n" +
"records(id TEXT, date DATE, rank INTEGER, grade TEXT, late_rate DOUBLE, avg_facetime TEXT, avg_latetime TEXT, point DOUBLE);";

var SQL_REG_DATE_TRIGGER =
"CREATE TRIGGER set_date_for_records AFTER INSERT ON records\n" +
"BEGIN\n" +
"	UPDATE records SET date = DATETIME('NOW', 'LOCALTIME') WHERE rowid = new.rowid;\n" +
"END;";

//simple binary lock ^-^
var lock = (function() {
	var _lock = false;
	return {
		set: function() {
			_lock = true;
		},
		clear: function() {
			_lock = false;
		},
		p: function() {
			return _lock;
		}
	}
})();

lock.set();
db.open('attendbook.db', function (error) {
	if (error) {
		console.log('db.js: error on open database');
		throw error;
	}
	
	//perfom existance test for our table.
	db.execute(SQL_EXISTANCE_TEST, function (error, rows) {
		if (error) {
			console.log('db.js: error on table existance test');
			throw error;
		}

		//exports.foo = rows;
		if (rows.length > 0) {
			lock.clear();
			return;
		}

		db.execute(SQL_CREATE_TABLE, function (error, rows) {
			if (error) {
				console.log('db.js: error on create table');
				throw error;
			}

			//exports.bar = 'create';
			//exports.bar2 = rows;

			db.execute(SQL_REG_DATE_TRIGGER, function (error, rows) {
				if (error) {
					console.log('db.js: error on register trigger');
					throw error;
				}

				//exports.foo = 'trigger';
				//exports.foo2 = rows;

				lock.clear();
			});
		});
	});
});

//interface
exports.insert = function(data) {

};
exports.query = function(key, onData) {

};

