
var connect = require ('connect')
var io = require('socket.io')

var lastRequestId = 0;
var connectionTimeout = 60;
var pending = {};

server = connect(
	connect.logger(),
	connect.cookieParser(),
	connect.session(),
	connect.static(__dirname + '/public', { maxAge: 0 }),
	connect.router (function (app) {
		
			app.post('/login', function (req,res,next) {
			
					var sess = req.session;
					sess.username = req.param('username');
					
			}
		/**
		* GET handler for retrieving events for the user.
		*/
		app.get('/longpoll/:user/:lasteventprocessed', function (req, res, next) {
			
			var user = req.params.user,
					lasteventprocessed = req.params.lasteventprocessed || 0,
					requestId = lastRequestId++;
					
			// check the required parameters
			if (!user) {
				res.writeHead (400, {'Content-Type' : 'text/plain'});
				res.end();
			}
			
			// add a close handler for the connection
			req.connection.on('close', function(){
					console.log("close connection " + user + " : " + requestId);
			});

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
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(JSON.stringify(event));
					console.log (req.params.user + " : " + requestId +  " sent " + JSON.stringify(event));
			}
    
			
			//res.write ("You Hit a routed URL : " + req.params.id);
			//res.end ("end me");
		}),

		app.get('/post/:user/:data', function(req, res) {

			var user = req.params.user,
					data = req.params.data;
			// add the event    
			var event = {
					type : "type",
					timestamp : currentTimestamp(),
					data : data 
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
								ctx.res.writeHead(200, {'Content-Type': 'application/json'});
								ctx.res.end(JSON.stringify(event));
								
						}
				}
				
				// compact the list of pending requests
				var i, data = [];
				for (i=0; i < pending[user].length; i++) {
						if (pending[user][i]) data.push(pending[user][i]);
				}
				pending[user] = data;
				
				// send 200 OK
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end();
			}
		});
	})
)

var lio = io.listen(server)
server.listen(3000);

lio.sockets.on ('connection', function (socket) {
	 socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});



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
