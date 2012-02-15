var express = require('express');
var app = express.createServer();
var port = process.env.PORT || 3000;

var lastRequestId = 0;
var connectionTimeout = 60;
var pending = {};

app.use(express.static(__dirname + '/public'));	// middleware for static resources
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({secret: "genhashfromthis"}));  // middleware for session management
app.use(express.bodyParser());  // middleware for parsing a POST body into 'req.body'

		
app.post('/login', function (req,res,next) {
			console.log ('Attempt to login as ' + req.body.username);
			var sess = req.session;
			//Properties on req.session are automatically saved on a response
			sess.username = req.body.username;
			res.send({'username' : sess.username});

});

/**
* GET handler for retrieving events for the user.
*/
app.get('/longpoll/:lasteventprocessed', function (req, res, next) {
	var sess = req.session;
	var user = sess.username,
			lasteventprocessed = req.params.lasteventprocessed,
			requestId = lastRequestId++;
			
	// check the required parameters
	if (!user) {
		res.send (null, 400);
	}
	
	// add a close handler for the connection
	req.connection.on('close', function(){
			console.log("close connection " + user + " : " + requestId);
	});
	
								// TEST CODE
								if (lasteventprocessed == 0) {	
									if (!events[user])	events[user] = [];	
									events[user].push({
											type : "QUIZ",
											timestamp : currentTimestamp(),
											name : "Blackberry 9900",
											desc : "Sales assistant general (level1)",
											points : 35
									});
									events[user].push({
											type : "QUIZ",
											timestamp : currentTimestamp(),
											name : "Nokia Lumia 800",
											desc : "Technical Specification (level5)",
											points : 600
									});
								}
								//  END TEST CODE

	var event = nextEvent(user, lasteventprocessed);
	if (!event) {
		console.log ("No data to send to browser, add request to 'pending', and pause the request: " + requestId);

		var ctx = {
				id : requestId,
				lasteventprocessed : lasteventprocessed,
				req : req,
				res : res		};
		 if (!pending[user])
			pending[user] = [];  pending[user].push(ctx);
		
		// configure a timeout on the request
		req.connection.setTimeout(connectionTimeout * 1000);
		req.connection.on('timeout', function(){
				ctx.req = null;
				ctx.res = null;
				console.log("clearing request " + user + " : " + requestId);
		});
		
		// pause the request
		req.pause();
		console.log("pausing request (long poll)" + user + " : " + requestId);
	} else {
			res.send(JSON.stringify(event));
			console.log (req.params.user + " : " + requestId +  " sent " + JSON.stringify(event));
	}
});

app.get('/post/:user/:name/:desc', function(req, res) {

	var user = req.params.user,
			name = req.params.name,
			desc = req.params.desc;
	// add the event    
	var event = {
			type : "QUIZ",
			timestamp : currentTimestamp(),
			name : name,
			desc : desc,
			points : 25
	};
			
	if (!events[user])
		events[user] = [];	events[user].push(event);
	console.log("added event " + user+ " : " +JSON.stringify(event));
	
	
	// now, find pending long poll requests for this user,
	if (!pending[user]) {
		console.log ("no longpolling requests for " + user + ", do nothing");
	} else {

		// loop over pending requests for the user
		// and respond if an event is available
		var ctx, event;
		for (var i=0; i < pending[user].length; i++) {
				ctx = pending[user][i];
				
				// ctx.req == null -> timeout, cleanup
				if (!ctx.req) {
						pending[user][i] = null;
						continue;
				}
				console.log ("Got longpoll request for user " + user + ", id: " + ctx.id + ", sending event data");
				
				// get next event
				event = nextEvent(user, ctx.lasteventprocessed);

				// user has event? -> respond, close and cleanup
				if (event) {
						console.log ("Got event data " + JSON.stringify(event) + ", sending response");
						pending[user][i] = null;
						ctx.req.resume();
						ctx.res.send(JSON.stringify(event));
						
				}
		}
		
		// compact the list of pending requests
		var i, data = [];
		for (i=0; i < pending[user].length; i++) {
				if (pending[user][i]) data.push(pending[user][i]);
		}
		pending[user] = data;
		
		// send 200 OK
		res.send(200, null);
	}
});

app.listen(port);
console.log ('Server started on port ' + port);


var events = {}
var maxAge = 60;
function nextEvent(user, lasteventprocessed) {
    if (!events[user]) return null;
    if (!lasteventprocessed) lasteventprocessed = 0;
    
    // - loop over the events for the user
    // - timeout events older than maxAge seconds
    // - return the oldest event with a timestamp
    // greater than 'timestamp'
    var event, i;
    var minTimestamp = currentTimestamp() - maxAge * 1000;
    for(i=0; i < events[user].length; i++) {
        
        // expire event?
        if (events[user][i].timestamp < minTimestamp) {
            console.log (user +  " expired " + JSON.stringify(event));
            events[user][i] = null;
            continue;
        } else if (events[user][i].timestamp > lasteventprocessed) {
        		event = events[user][i];
        		break;
        }
    }
    
    // compact the event array
		var i, data = [];
		for (i=0; i < events[user].length; i++) {
				if (events[user][i]) data.push(events[user][i]);
		}
		events[user] = data;
    
    // return the event
    return event;
}
function currentTimestamp() {
    return new Date().getTime();
}


// WEB SOCKET ??
/*
var io = require('socket.io');
var lio = io.listen(server)


lio.sockets.on ('connection', function (socket) {
	 socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
*/
