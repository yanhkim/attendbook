var http = require('http');
console.log('http module loaded');

function Requester(host) {
	this.client = http.createclient(80, host);
	this.host = host;

	this.default_header = {
		'Host': host,
		'Connection': 'keep-alive',
		'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US) AppleWebKit/534.10 (KHTML, like Gecko) Chrome/8.0.552.237 Safari/534.10',
		'Accept': 'application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
		'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.6,en;q=0.4',
		'Accept-Charset': 'windows-949,utf-8;q=0.7,*;q=0.3'
	};
}

Requester.prototype = {
	setCommands: function() {
		this.commands = commands.reverse();	//for using javascript's own pop|push function
	},
	run: function() {
		var command = this.commands.pop();
		this.requestchain(command);
	},
	requestchain: function(c) {
		if (c == undefined) {
			console.log('close');
			return;
		}

		this.activeCommand = c;

		var header = this.prepareHeader(c);
		var req = this.client.request(c.method, c.path, header);

		if (c.method == 'POST' && c.body)
			req.write(c.body);

		req.end();

		//req.on('response', this.bindHandler(req, this.traceHead, this.traceBody, this.connector));
		req.on('response', this.bindHandler(req, this.headerHandler, null, this.connector));
	},
	prepareHeader: function(c) {
		var copy = function(d, s) {
			if (s === undefined)
				return;

			for (var p in s)
				d[p] = s[p];
		}
		var h = {};
		copy(h, this.default_header);
		copy(h, c.header);

		if (this.commands.length == 0)
			h['Connection'] = 'close';

		var cookie = this.makeCookieField(this.host, c.path);
		if (cookie)
			h['Cookie'] = cookie;

		return h;
	},
	makeCookieField: function(host, path) {
		if (this.cookies == undefined)
			return;

		var canAccept = function(h, p, c) {		// TODO
			return true;
		}

		var ret = '';
		for (var i in this.cookies) {
			var cookie = this.cookies[i];
			if (canAccept(host, path, cookie))
				ret += cookie['content'] + '; ';
		}

		ret = ret.substr(0, ret.length - 2);	// remove trailing '; '

		if (ret.length > 0)
			return ret;
	},
	bindHandler: function(r, onHeader, onData, onEnd) {
		var context = this;
		return function(r) {
			onHeader && onHeader(context, r);
			context.activeCommand.onHeader(r.headers);

			r.on('data', function(c) {
				onData && onData(context, c);
				context.activeCommand.onData(c);
			});

			r.on('end', function() {
				onEnd && onEnd(context);
			});
		}
	},
	connector: function(context) {
		context.requestchain(context.commands.pop());
	},
	traceHead: function(context, r) {
		console.log('STATUS: ' + r.statusCode);
		console.log('HEADERS: ' + JSON.stringify(r.headers));

		//console.log('cookie: ' + r.headers.
		exports.foo = r.headers;

		r.setEncoding('utf8');
	},
	traceBody: function(context, c) {
		console.log('BODY: ' + c);

		//exports.foo = c;
	},
	headerHandler: function(context, r) {
		//r.setEncoding('euc-kr');

		var header = r.headers,
		rawCookies = header['set-cookie'];

		if (rawCookies == undefined)
			return;

		var cookies = [];
		for (var i in rawCookies) {
			var rawCookie = rawCookies[i].split(';');
			var rawCookie = rawCookie.map(function(s) { return s.replace(/^\s+|\s+$/g, '') });		// strip LR
			var cookie = {};
			for (var j in rawCookie) {
				var field = rawCookie[j];
				var pos = field.indexOf('=');
				var name = field.substr(0, pos);
				var value = field.substr(pos + 1);

				if (j > 0)
					cookie[name] = value;
				else
					cookie['content'] = field;
			}
			cookies.push(cookie);
		}

		context.cookies ? context.cookies.concat(cookies) : context.cookies = cookies;
	}
};

function Command(method, path) {
	this.method = method;
	this.path = path;
	this.header = {};
	this.callbacks = {};
}

Command.prototype = {
	setBody: function(b) {
		this.header['Content-Length'] = b.length;
		this.header['Content-Type'] = 'application/x-www-form-urlencoded';
		this.body = b;
		return this;
	},
	setHeader: function(name, value) {
		this.header[name] = value;
		return this;
	},
	on: function(event, callback) {
		this.callbacks[event] = callback;
	},
	onEvent: function(name, arg) {
		var cb = this.callbacks[name];
		if (cb)
			cb(arg);
	},
	onHeader: function(header) {
		this.onEvent('header', header);
	},
	onData: function(data) {
		this.onEvent('data', data);
	}
};

exports.Requester = Requester;
exports.Command = Command;

/*
var http = require('http');
var infra = http.createclient(80, 'www.infraware.net');

var commands = [];

var command = new Command('POST', '/MainPage/Login_Company.asp');
command.setBody('cboCompany=Infraware&txtID=nhkim&txtPasswd=ejaqufk&URLInfo=http%3A%2F%2Fwww.infraware.net%2FMyPage%2FMainFrame.asp%3FRightMenuURL%3Dhttp%3A%2F%2Fwww.infraware.net%2FMyPage%2FMyInfo%2FMyInfoEdit.asp');
commands.push(command);

command = new Command('POST', '/MainPage/Login_User.asp');
command.setBody('UserID=nhkim&UserPasswd=ejaqufk&URLInfo=http%3A%2F%2Fwww.infraware.net%2FMyPage%2FMainFrame.asp%3FRightMenuURL%3Dhttp%3A%2F%2Fwww.infraware.net%2FMyPage%2FMyInfo%2FMyInfoEdit.asp');
commands.push(command);

command = new Command('GET', '/MyPage/MyInfo/MyInfoEdit.asp');
commands.push(command);

//var foo = new requester(google, [{method: 'GET', path: '/'}, {method: 'GET', path: '/m/search?q=test'}]);
var foo = new Requester(infra, commands);
foo.run();
*/

/*
var request = google.request('GET', '/', {'host': 'www.google.com'});
request.end();
request.on('response', function (response) {
  console.log('STATUS: ' + response.statusCode);
  console.log('HEADERS: ' + JSON.stringify(response.headers));
  response.setEncoding('utf8');
  response.on('data', function (chunk) {
	  console.log('BODY: ' + chunk);
  });
});
*/

