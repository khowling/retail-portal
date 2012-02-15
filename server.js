

var rest = require('./rest');

// 'require' is a global object, it require's modules (module == .js file)

// Node's HTTP API is very low-level. It deals with stream handling and message parsing only. It parses a message into headers and body but it does not parse the actual headers or the body

var http = require ('https');
var fs = require ('fs');

function get_type(thing){
    if(thing===null)return "[object Null]"; // special case
    return Object.prototype.toString.call(thing);
}


var myserver = function (req, res) {
	
	console.info('server request time is %s', Date());
	console.info('server module  is %s', __filename);
	console.info('server request type is %s', get_type(req));
	console.info('server request url property is %s', req.url);

	if (rest.RESTRouter(req, res)) {
		console.log ('REST Request Routed');
	}

	/*
	res.writeHead (200, {'Content-Type' : 'text/plain'});
	rest.query('SELECT ID FROM ACCOUNT',null,console.log);

	res.write ("line0\n");
	setTimeout(function() {	
		res.end ("end me");
	}, 1000);
	*/

// get automatic headers (its a http1.1 server)
// Connection: keep-alive  # persistant connections to webserver
	// Persistent connections allow the client to perform multiple requests without the overhead of connection tear-down and set-up between each request

// Transfer-Encoding: chunked
	// streaming - doesnt need to send the whole body in one go! dont want to buffer in the server, we'd rarther proxy it to the client (request, response, response, response)
	
};

// myserver, is a 'requestListener' is a function which is automatically added to the 'request' event.
// creates a http.Server, that is an 'Event Emmiter' with the following events:
//   'request' 'connection' 'close' etc
// The requestListener is a function which is automatically added to the 'request' event.

var options = { //sample cert setup
  		key: fs.readFileSync('../server.key').toString(),
  		cert: fs.readFileSync('../server.crt').toString()
	};
var server = http.createServer( options,  myserver ).listen (3000, "127.0.0.1");
