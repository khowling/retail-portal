

var e = require('express');
var app = e.createServer();


var long_connections = [];

var longpoll = function (req, res, next) {
	console.log ('got request, pause it');

	var req_info = { request: req, response: res, timedout: false};
	var timeoutid = setTimeout( function () { 
		console.log ('timeout pulse, what variables are still in scope?\n');
		req_info.request.resume();
		req_info.response.end('no activity pulce');
		req_info.timedout = true;
		 }, 5000); 


	req_info.timeoutid = timeoutid;
	long_connections.push(req_info);
	console.log ('stored and paused request');
	req.pause();
}	


app.get ('/pulse', longpoll);

app.listen (2000);



process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on ('data', function (chunk) {
	console.log ('got event data : ' + chunk);
	for (i in long_connections) {
		req_info = long_connections[i];
		console.log ('checking stored connection, has timedout?');
		if (!req_info.timedout) {
				
			console.log ('got active connection, send event data, and clear the timeout');
			req_info.request.resume();
			req_info.response.end (chunk);
			clearTimeout(req_info.timeoutid);
		}
	}
});
