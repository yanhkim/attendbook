HOST = null; // localhost
PORT = 8002;

DEBUG = false;

// when the daemon started
var starttime = (new Date()).getTime();

var mem = process.memoryUsage();
// every 10 seconds poll for the memory.
setInterval(function () {
  mem = process.memoryUsage();
}, 10*1000);


var fu = require("./fu"),
    ab = require("./attendbook"),
    url = require("url");

var SESSION_TIMEOUT = 60 * 1000;

var sessions = {};

function createSession (nick) {
  for (var i in sessions) {
    var session = sessions[i];
    if (session && session.nick === nick) return null;
  }

  var session = { 
    nick: nick, 
    id: Math.floor(Math.random()*99999999999).toString(),
    timestamp: new Date(),

    poke: function () {
      session.timestamp = new Date();
    },

    destroy: function () {
      delete sessions[session.id];
    }
  };

  sessions[session.id] = session;
  return session;
}

// interval to kill off old sessions
setInterval(function () {
  var now = new Date();
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id))
		continue;

    var session = sessions[id];
    if (now - session.timestamp > SESSION_TIMEOUT) {
      session.destroy();
    }
  }
}, 1000);

fu.listen(Number(process.env.PORT || PORT), HOST);

fu.get("/", fu.staticHandler("index.html"));
fu.get("/style.css", fu.staticHandler("style.css"));
fu.get("/client.js", fu.staticHandler("client.js"));
fu.get("/jquery.js", fu.staticHandler(DEBUG ? "jquery-1.4.4.js" : "jquery-1.4.4.min.js"));
fu.get("/aes.js", fu.staticHandler("aes.js"));

/*
fu.get('/join', function (req, res) {
	res.simpleJSON(200, {msg: 'It works!'});
});
*/

fu.get("/join", function (req, res) {
  var q = url.parse(req.url, true).query;

  var session = createSession(q.id);
  if (session == null) {
    res.simpleJSON(400, {error: "ID in use"});
    return;
  }

  var result = {
	  sid: session.id,
	  id: session.nick,
	  rss: mem.rss,
	  starttime: starttime
  };

  ab.login(q.id, q.pwd, function (error, name) {
	  if (error) {
		  var msg = 'login failed with id: ' + q.id;
		  console.log('server.js: ' + msg);
		  res.simpleJSON(400, {error: msg});
		  session.destroy();
		  //throw error;
		  return;
	  }

	  result.name = name;

	  if (!q.direct) {
  		res.simpleJSON(200, result);
  		session.poke();
		return;
	  }

	  ab.query(q.id, function (error, records) {
		  if (error) {
			  var msg = 'query faild with id: ' + q.id;
			  console.log('server.js: ' + msg);
		      res.simpleJSON(400, {error: msg});
		  	  session.destroy();
			  throw error;
		  }

		  //console.log(JSON.stringify(records));

		  result.records = records;
		  res.simpleJSON(200, result);
		  session.poke();
		  // below for debug purpose
		  session.destroy();
	  });
  });
});

fu.get('/query', function (req, res) {
	var q = url.parse(req.url, true).query,
	sid = q.sid,
	id = q.id;

	var session;
	if (sid && sessions[sid]) {
		session = sessions[sid];
		session.poke();
	}

	if (session == undefined) {
		var msg = 'attempt to query with non-exist session id: ' + sid;
		console.log('server.js: ' + msg);
		res.simpleJSON(400, {error: msg});
		return;
	}

	ab.query(id || session.nick, function (error, records) {
		if (error) {
			var msg = 'query faild with id: ' + q.id;
			console.log('server.js: ' + msg);
			res.simpleJSON(400, {error: msg});
			throw error;
		}

		result.records = records;
		res.simpleJSON(200, result);
		session.poke();
	});
});

fu.get("/ping", function (req, res) {
  var id = url.parse(req.url, true).query.id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.poke();
  }
  res.simpleJSON(200, { rss: mem.rss });
});

fu.get("/part", function (req, res) {
  var id = url.parse(req.url, true).query.id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.destroy();
  }
  res.simpleJSON(200, { rss: mem.rss });
});

