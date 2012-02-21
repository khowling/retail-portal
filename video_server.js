

var express = require('express'),
		fs = require('fs');

var app = express.createServer();

app.use(express.static(__dirname + '/public'));
app.get ('/stream', function (req,res,next) {
	var fn = __dirname+'/public/media/Analytics Edition.mp4';
	
	res.sendfile (fn);
});

app.listen(3000);
