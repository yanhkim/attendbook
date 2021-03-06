var Iconv = require('./deps/node-iconv/iconv.node').Iconv;

function read(raw, charset) {
	return (function(s) {
		var getCharset = function() {
			var detect = function() {
				//TODO
			}
			return charset || detect() || 'euc-kr';
		},
		find = function(key) {
			var pos = html.indexOf(key);
			var k = html.substr(pos + key.length);
			k = k.substr(0, k.indexOf('<')).replace(/^\s+|\s+$/g, '');

			html = html.substr(pos + key.length);

			//console.log('recognizer.js: find result is: ' + k);

			return k;
		},
		// '10시간 2분' 혹은 '30분' 형식의 입력을 받아 '10:02', '00:30' 으로 출력
		format = function(v, t) {
			if (t != 'time')
				return v;

			var hm = v.match(/[0-9]+/g);

			//console.log('recognizer.js: format() input text: ' + v);
			//console.log('recognizer.js: format() regex result: ' + JSON.stringify(hm));

			var h = hm[1] ? hm[0] : '0',
			m = hm[1] ? hm[1] : hm[0];

			if (h < 10 && h.length == 1)
				h = '0' + h;
			if (m < 10 && m.length == 1)
				m = '0' + m;

			return h + ':' + m;
		}

		var nameKey = '<td class="content" align="center" style="width:21%">',
		attenKey = '<td class="content" style="text-align:center">';

		var encoding = getCharset(),
		conv = encoding == 'utf-8' ? { convert: function(b) { return b; } } : new Iconv(encoding, 'utf-8'),
		html = conv.convert(s).toString('utf8'),
		input = html;

		//console.log('recognizer.js: whole input is: ' + html);

		try {
			var n = find(nameKey),
			r = find(attenKey),
			g = find(attenKey),
			lr = find(attenKey).replace(/%$/, ''),
			aft = format(find(attenKey), 'time'),
			alt = format(find(attenKey), 'time'),
			pt = find(attenKey);
		} catch (e) {
			console.log('recognizer.js: invalid input: ' + input);
			return {error: e};
		}

		return {
			name: n,
			rank: r,
			grade: g,
			late_rate: lr,
			avg_facetime: aft,
			avg_latetime: alt,
			point: pt
		}
	})(raw);
}

var Recognizer = function() {};

Recognizer.prototype = {
	feed: function(raw) {
		if (this.buf == undefined) {
			this.buf = raw;
			return;
		}

		var buf = new Buffer(this.buf.length + raw.length);
		this.buf.copy(buf, 0);
		raw.copy(buf, this.buf.length);

		this.buf = buf;
	},
	read: function(charset) {
		return read(this.buf, charset);
	}
}

exports.Recognizer = Recognizer;

//exported features

/** 
 * read target html, return object likes below
 * ---
 * raw: content stream buffer object
 * ---
 * name: '이말년'
 * rank: '124'
 * grade: 'B'
 * late_rate: '0.0'
 * avg_facetime: '10:05'
 * avg_latetime: '00:00'
 * point: '79.29'
 */

