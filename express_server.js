var express = require('express');
var app = express.createServer();
var port = process.env.PORT || 3000;

var lastRequestId = 0;
var connectionTimeout = 30; // always send a empty '200' reponse to each open request after 60seconds.

var users_collection = {};
var event_collection = {
	'K001': {
			type: "KNOWLEDGE",
			name: "The Basics",
			desc: "Your 1st Training",
			intro: "Take this Training just to get you familiour with our portal",
			forwho: { completed : {}},
			points: 50,
			knowledgedata: {
				stream_url: '/stream/gizmo.webm'
			}
	},

	'Q001': {
			type: "QUIZ",
			name: "Getting Started",
			desc: "Your 1st Quiz",
			intro: "Take this Quiz just to get you familiour with our portal",
			forwho: { completed : {}},
			points: 500,
			quizdata: {
						"multiList":[
							{ 
								ques: "This portal is build on salesforce, but which platform?",
								ans: "heroku",
								ansInfo: "<a href='http://heroku.com'>heroku</a> PaaS.",
								ansSel: [ "force.com", "chatter.com", "mini.com" ],
								retry: 0 	// The question can only be tried twice. Otherwise the user's answer is wrong.
							},
							{ 
								ques: "What is not a heroku language?", 
								ans: "C#.NET",
								ansInfo: "<a href='http://en.wikipedia.org/wiki/Ottawa'>The City of Ottawa</a> is where the capital of Canada.",
								ansSel: [ "NODE.JS", "RUBY" ],
						//		ansSelInfo: [
						//			"Hanoi is the capital of Vietnam", 
						//			"Washington, D.C. is the capital of the USA"
						//		]
							}
						]
					}
			},
		'Q002': {
			type: "QUIZ",
			name: "Blackberry 9900",
			desc: "Sales assistant general (level1)",
			forwho: { completed : {'Q001':true}},
			points: 5000,
			quizdata: {
					"multiList":[
						{ 
							ques: "When was the Blackberry 9900 launched?",
							ans: "Jan 2011",
							ansSel: [ "Jan 2012", "Dec 2010", "March 2010" ],
							retry: 0
						},
						{ 
							ques: "What is the killed feature of the 9900 over the previous model?", 
							ans: "All of the above",
							ansInfo: "<a href='http://en.wikipedia.org/wiki/Ottawa'>The City of Ottawa</a> is where the capital of Canada.",
							ansSel: [ "Touch Screen", "1GHh Processer", "Thinner" ],
						}
					]
				}
			},
		Q003: {
			type: "QUIZ",
			name: "Nokia Lumia 800",
			desc: "Technical Specification (level5)",
			forwho: { completed : {'Q001':true}},
			points: 5000,
			quizdata: {
				"multiList":[
					{ 
						ques: "Let 2x = 10. <br/>What is x?",
						ans: 5,
						ansSel: [ 10, 20, 0 ],
						retry: 2 	// The question can only be tried twice. Otherwise the user's answer is wrong.
					},
					{ 
						ques: "What is the capital of Canada?", 
						ans: "Ottawa, Ontario",
						ansInfo: "<a href='http://en.wikipedia.org/wiki/Ottawa'>The City of Ottawa</a> is where the capital of Canada.",
						ansSel: [ "Hanoi", "Washington, D.C." ],
						ansSelInfo: [
							"Hanoi is the capital of Vietnam", 
							"Washington, D.C. is the capital of the USA"
						]
					}
				]
			}
		}
	};

app.use(express.static(__dirname + '/public'));	// middleware for static resources
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({secret: "genhashfromthis"}));  // middleware for session management
app.use(express.bodyParser());  // middleware for parsing a POST body into 'req.body'

		
app.post('/login', function (req,res,next) {
		console.log ('login: Attempt to login as ' + req.body.username);
		var sess = req.session;
		//Properties on req.session are automatically saved on a response
		sess.username = req.body.username;
		users_collection[sess.username] = {points: 0, department: 'IT', completed_events: {}};

		createEvents(req.body.username, null);
		res.send({'username' : sess.username});
});

var event_index = 1;
var events_by_user = {}
function createEvents(user, just_completed) {
	console.log ('createEvents :' + user + ', just_completed : ' + just_completed);
	
	for (var i in event_collection) {
		var e = event_collection[i];
		console.log ('createEvents : checking item : ' + i);
		var event = null, results_data = null;

		if (i == just_completed) {
			// this is the event just completed, send an update
			results_data = users_collection[user].completed_events[i];
		} 
		else { 
			var selected = true, newlyselected = false;
			for (var needtocomplete in e.forwho.completed) {
				console.log ('createEvents: checking prereq for event, required : ' + needtocomplete + ', is it in ' + JSON.stringify(users_collection[user].completed_events) );
				if (just_completed == needtocomplete ) {
					newlyselected = true;
				}
				if (! (needtocomplete in users_collection[user].completed_events)) {
					selected = false; break;
				}
			}
			if (((!selected) || (just_completed != null && newlyselected == false))) continue;
			// 100 points for just getting a new event
			users_collection[user].points = users_collection[user].points + 50;
			console.log ('createEvents: points: adding ' + '50' + ', total now : ' +users_collection[user].points);
		}
		
		
		event = {
			index: event_index++,
			timestamp: new Date().getTime(),
			active: true,
			item_id: i,
			item_type: e.type,
			item_data: e,
			results_data: results_data
		};
		
			
		if (!events_by_user[user])
			events_by_user[user] = [];	
		events_by_user[user].push(event);
		console.log('createEvents: ADDED EVENT [' + event.index +  '] [' + event.item_id +'], results_data ' + results_data  + ', newlyselected : '+ newlyselected);
	}
}

var maxAge = 60;
function nextEvent(user, lastindexprocessed) {
    if (!events_by_user[user]) return null;
    if (!lastindexprocessed) lastindexprocessed = 0;
    
    console.log ('nextEvent: from ' + user + ', lastindexprocessed : ' +  lastindexprocessed);
    var event;
    var minTimestamp = new Date().getTime() - (maxAge * 1000);
    for(var i in events_by_user[user]) {
    	var e = events_by_user[user][i];
    	console.log ('nextEvent: found event '+ e.item_id + ', checking index : ' + e.index);
			// expire event (event generated, not consumed by longpoll, throu away)
			if (e.timestamp < minTimestamp) {
				console.log ('nextEvent: timestamp check [' + e.index +  "] expired " + JSON.stringify(event));
					e.active = false;
					continue;
			} else if (e.index > lastindexprocessed) {
				console.log ('nextEvent: return ' + e.index);
				return e;
			}
    }
}


function notify_long_connection_by_user(user) {	
	// started notify //
	if (!long_connections_by_user[user]) {
		console.log ("notify_long_connection_by_user: no longpolling requests for " + user + ", do nothing");
	} else {
		for (var i=0; i < long_connections_by_user[user].length; i++) {
			var req_info = long_connections_by_user[user][i];
			if (!req_info.completed) {
				
				console.log ('notify_long_connection_by_user: got active connection for user ' + user);
				
				var event = nextEvent(user, req_info.lasteventprocessed);
				console.log ('notify_long_connection_by_user: ' + event);
				if (event) {
					console.log ('notify_long_connection_by_user: resume request & send event data' + event.index);
					
					clearTimeout(req_info.timeoutid);
					req_info.completed = true;
					
					req_info.request.resume();
					event['my_points'] = users_collection[user].points;
					req_info.response.send (JSON.stringify(event));
					
				}
			}
		}
	}
}

app.post('/donequiz', function (req,res,next) {
		
	var user = req.session.username;
	if (!user) {
		res.send ('Please Login', 400);
		return;
	} 

	
	var qid = req.body.id;
	var score = req.body.score;
	
	console.log ('Attempt to requester complted quiz:' + user + ', quiz : ' + qid + ', score ' + score);
	var aready_passed = false;
	var alreadydone = users_collection[user].completed_events;
	if (alreadydone[qid]) {
		aready_passed = true;
		alreadydone[qid].attempts = alreadydone[qid].attempts + 1;
		alreadydone[qid].bestscore = Math.max(alreadydone[qid].bestscore, score);
	} else {
		alreadydone[qid] = { score: score, date: new Date(), attempts: 1, bestscore: score};
		var points_award = score * event_collection[qid].points/100;
		users_collection[user].points = users_collection[user].points + points_award
		console.log ('points: adding ' + points_award + ', total now : ' +users_collection[user].points);
	}
	res.send({my_points: users_collection[user].points});
	if (!aready_passed) {
		createEvents (user, qid);
		notify_long_connection_by_user(user)
	}
});

/**
* GET handler for retrieving events for the user.
*/
var long_connections_by_user = {};
app.get('/longpoll/:lasteventprocessed', function (req, res, next) {
	var user = req.session.username,
			lasteventprocessed = req.params.lasteventprocessed;
	console.log ('longpoll: got request from ' + user);
	// check the required parameters
	if (!user) {
		res.send ('Please Login', 400);
		return;
	} 
	

	var event = nextEvent(user, lasteventprocessed);
	if (!event) {
		console.log ('longpoll: pause it, no event to send');

		var req_info = { request: req, response: res, lasteventprocessed: lasteventprocessed, completed: false};
		req_info.timeoutid = setTimeout( function () { 
			console.log ('longpoll:  timeout pulse');
			req_info.request.resume();
			req_info.response.send({type: "PULSE"});
			req_info.completed = true;
			 }, connectionTimeout * 1000); 

		if (!long_connections_by_user[user])
			long_connections_by_user[user] = [];  
		long_connections_by_user[user].push(req_info);
		req.pause();
		console.log ('longpoll: stored and paused request');

	} else {
			console.log ('longpoll: got event to send to user');
			event['my_points'] = users_collection[user].points;
			res.send(JSON.stringify(event));
			console.log ('longpoll sent :' + event.index);
	}
});

app.get ('/stream', function (req,res,next) {
	var fn = __dirname+'/public/media/Analytics Edition.mp4';
	res.sendfile (fn);
});

/*
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
*/

app.listen(port);
console.log ('Server started on port ' + port);

