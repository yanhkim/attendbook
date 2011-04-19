function showLoading() {
	$('#connect').hide();
	$('#loading').show();
	$('#record').hide();
}

function showConnect() {
	$('#connect').show();
	$('#loading').hide();
	$('#record').hide();
	$('#signin-id').focus();
}

function showRecord() {
	$('#connect').hide();
	$('#loading').hide();
	$('#record').show();

	if (getSigninInfo())
		$('#auto-signin-off').show();
}

var Crypto = (function() {
	var KEY = 'readevalprintloop',			//AES key -.-
	hasCrypto = window.Aes ? true : false;

	return {
		encode: (function() {
			if (hasCrypto)
				return function(p) { return Aes.Ctr.encrypt(p, KEY, 128); }
			else
				return function(p) { return p; }
		})(),
		decode: (function() {
			if (hasCrypto)
				return function(s) { return Aes.Ctr.decrypt(s, KEY, 128); }
			else
				return function(s) { return s; }
		})()
	};
})();

var CCookie = (function() {
	var EXPIRE = 15;		// default expire. 15 days

	return {
		pick: function(name) {
			var cookies = document.cookie.split(';').map(function(raw) {
				return raw.replace(/^\s+|\s+$/g, '');
			});

			for (var i in cookies) {
				var pair = cookies[i].split('='),
				_name = Crypto.decode(unescape(pair[0]));

				if (_name == name) {
					return {
						pname: _name,
						pvalue: Crypto.decode(unescape(pair[1])),
						cname: unescape(pair[0]),
						cvalue: unescape(pair[1])
					};
				}
			}
		},
		poke: function(name, value, exp) {
			this.rawpoke(Crypto.encode(name), Crypto.encode(value));
		},
		rawpoke: function(name, value, exp) {
			document.cookie = escape(name) + '=' + escape(value) +
			'; expires=' + (exp ? exp : new Date(new Date().getTime() + EXPIRE * 1000 * 60 * 60 * 24).toUTCString());
		},
		clear: function(name) {
			var c = this.pick(name);
			if (c)
				this.rawpoke(c.cname, '', new Date(0).toUTCString());
		}
	};
})();

function SigninInfo(id, pwd) {
	this.id = id;
	this.pwd = pwd;
}

SigninInfo.prototype = {
	save: function() {
		CCookie.poke(SigninInfo.AB_ID_NAME, this.id);
		CCookie.poke(SigninInfo.AB_PASSWORD_NAME, this.pwd);
	},
	extendExpire: function() {
		var id = CCookie.pick(SigninInfo.AB_ID_NAME),
		pwd = id ? CCookie.pick(SigninInfo.AB_PASSWORD_NAME) : null;

		if (id && pwd) {
			CCookie.rawpoke(id.cname, id.cvalue);
			CCookie.rawpoke(pwd.cname, pwd.cvalue);
		}
	},
	signin: function() {
		showLoading();
		$.ajax({
			cache: false,
			dataType: 'json',
			url: '/join',
			data: { id: this.id, pwd: this.pwd, direct: true },
			error: function() {
				alert('signin error');
				showConnect();
			},
			success: onSignin
		});
	}
};

SigninInfo.AB_ID_NAME = 'AB_ID_NAME';
SigninInfo.AB_PASSWORD_NAME = 'AB_PASSWORD_NAME';

function getSigninInfo() {
	var id = CCookie.pick(SigninInfo.AB_ID_NAME),
	pwd = id ? CCookie.pick(SigninInfo.AB_PASSWORD_NAME) : null;

	if (id && pwd)
		return new SigninInfo(id.pvalue, pwd.pvalue);
}

function clearSigninInfo() {
	CCookie.clear(SigninInfo.AB_ID_NAME);
	CCookie.clear(SigninInfo.AB_PASSWORD_NAME);
}

function validate() {
	var id = $('#signin-id').val(),
	pwd = $('#signin-password').val();

	if (id.match(/^[a-zA-Z][a-zA-Z0-9]+$/) && !pwd.match(/^\s*$/))
		return true;

	return false;
}

$(document).ready(function() {
	showConnect();

	$('#signin-with-save-button').click(function (event) {
		event.stopPropagation();
		event.preventDefault();

		if (validate() == false) {
			alert('fill right value');
			return false;
		}

		info = new SigninInfo($('#signin-id').val(), $('#signin-password').val());
		info.save();
		info.signin();

		return false;
	});

	$('#signin-button').click(function (event) {
		event.stopPropagation();
		event.preventDefault();

		if (validate() == false) {
			alert('fill right value');
			return false;
		}

		info = new SigninInfo($('#signin-id').val(), $('#signin-password').val());
		info.signin();

		return false;
	});

	$('#auto-signin-off').click(function (event) {
		event.stopPropagation();
		event.preventDefault();

		$('#auto-signin-off').hide();
		clearSigninInfo();
		clearRecords();
		showConnect();

		return false;
	});

	var info = getSigninInfo();
	if (info) {
		info.extendExpire();
		info.signin();
	}
});

function fillRecord(record) {
	var template = $('#record table .template'),
	r = template.clone();

	var res = record.date.match(/\d+/g),
	d = new Date(res[0], res[1] - 1, res[2]);

	r.find('.date').text(d.toDateString());
	r.find('.rank').text(record.rank);
	r.find('.grade').text(record.grade);
	r.find('.late-rate').text(record.lrate);
	r.find('.avg-facetime').text(record.aftime);
	r.find('.avg-latetime').text(record.altime);
	r.find('.score').text(record.point);

	r.appendTo('#record table tbody').removeClass('template').show();
}

function fillRecords(records) {
	for (var i = 0; i < records.length; i++) {
		fillRecord(records[i]);
	}
}

function format(s) {
   	var formatted = s;
   	for (var i = 1; i < arguments.length; i++) {
       	var regexp = new RegExp('\\{' + (i - 1) + '\\}', 'gi');
       	formatted = formatted.replace(regexp, arguments[i]);
   	}
   	return formatted;
}

function plotChart(records) {
	var ranks = [];
	for (var i = 0; i < records.length; i++) {
		ranks.push(records[i].rank);
	}
	ranks = ranks.reverse();

	var min = Math.min.apply(this, ranks),
	max = Math.max.apply(this, ranks);

	ranks = ranks.map(function(k) { return Math.abs(k - max); });

	var template = 'http://chart.apis.google.com/chart' +
		'?chxr=0,{0},{1}' +
		'&chxt=y&chs=600x330' +
		'&cht=lc&chco=FF1010' +
		'&chds={2},{3}' +
		'&chd=t:{4}' +
		'&chg=-1,0' +
		'&chls=2' +
		'&chma=35,20,20,30|0,5';

	var i = $('<img>').attr('src', format(template, max, min, Math.min.apply(this, ranks) - 3, Math.max.apply(this, ranks) + 3, ranks.toString()));
	i.insertBefore($('#record table'));
}

function clearRecords() {
	var t = $('#record table .template');
	t.nextAll().remove();
}

function fillName(name) {
	$('#record #user-name').text(name);
}

function onSignin (session) {
	fillName(session.name);

	if (session.records) {
		plotChart(session.records);
		fillRecords(session.records);
	} else {
		//TODO
	}

	showRecord();
}

//if we can, notify the server that we're going away.
/*
$(window).unload(function () {
  jQuery.get("/part", {id: CONFIG.id}, function (data) { }, "json");
});
*/
