HOST = null; // localhost
PORT = process.argv.length > 2 ? process.argv[2] : 8002;

console.log('using port no:', PORT);

DEBUG = false;

var fu = require("./fu"),
  ab = require("./attendbook"),
  url = require("url");

fu.listen(Number(process.env.PORT || PORT), HOST);

fu.get("/", fu.staticHandler("index.html"));
fu.get("/style.css", fu.staticHandler("style.css"));
fu.get("/client.js", fu.staticHandler("client.js"));
fu.get("/jquery.js", fu.staticHandler(DEBUG ? "jquery-1.4.4.js" : "jquery-1.4.4.min.js"));
fu.get("/aes.js", fu.staticHandler("aes.js"));

function query_cb(id, res, result) {
	return function(error, records) {
		if (error) {
			var msg = 'query faild with id: ' + id;
			console.log('server.js: ' + msg);
			res.simpleJSON(400, {error: msg});
			throw error;
		}

		console.log(JSON.stringify(records));

		result.records = records;
		res.simpleJSON(200, result);
	};
}

fu.get("/join", function (req, res) {
	var q = url.parse(req.url, true).query;

	var result = {};

	ab.login(q.id, q.pwd, function (error, name) {
		if (error) {
			var msg = 'login failed with id: ' + q.id;
			console.log('server.js: ' + msg);
			res.simpleJSON(400, {error: msg});
			//throw error;
			return;
		}

		result.name = name;

		if (!q.direct) {
			res.simpleJSON(200, result);
			return;
		}

		ab.query(q.id, query_cb(q.id, res, result));
	});
});

fu.get('/query', function (req, res) {
	var q = url.parse(req.url, true).query;

	var result = {};
	ab.query(q.id, query_cb(q.id, res, result));
});

fu.get('/who', function (req, res) {
	ab.who(function (error, list) {
		if (error) {
			var msg = "cannot fulfil /who request with error: " + error;
			console.log('server.js: ', msg);
			res.simpleJSON(400, {error: msg});
			return;
		}

		res.simpleJSON(200, list);
	});
});
