/*
In Node, things are only visible to other things in the same file. 
the fundamental Node building block is called a module which maps directly to a file
'require' is used to load a module, which is why its return value is typically assigned to a variable
as long as our module doesn't expose anything, 'require' isn't very useful. To expose things we use module.exports and export everything we want
*/

var express = require('express'), // web framework
    url = require('url'), // process the environment URLS
    mongodb = require('mongodb'), // https://github.com/christkv/node-mongodb-native
    db_url = url.parse(process.env.MONGO_DB),
    mongoserver = new mongodb.Server(db_url.hostname, parseInt(db_url.port), {
        auto_reconnect: false
    }),
    db_connector = new mongodb.Db(db_url.pathname.split('/')[1], mongoserver),
    mongostore = require('./connect-mongo')(express),
    foauth = require('./force_oauth_pass.js'),
    https = require('https'),
    amqp = require('amqp');



var collections = {
    long_connections_by_session: {},
    longpoll_exchange: null
};
var amqp_connection = amqp.createConnection({ host: 'localhost', port : 5672}).on('ready', function () {
    var e = amqp_connection.exchange('longpolls', { type: 'fanout' }, function (exchange) {
        console.log('Exchange longpolls created ' + exchange.name + ' is open');
        
        
        collections.longpoll_exchange = exchange;
        // publish using 
        // longpoll_exchange.publish ('#', {m: 'keiths message ' + i}, { contentType: 'application/json'});
        
        // Create a queue for this dyno, needs to be a brand new unique queue for each dyno starting,
        // Declaring a queue with an empty name will make the server generate a random name
        // passive = false & durable = false (both the defaults
        amqp_connection.queue('', function(q){
            // Catch all messages
            console.log('created queue : ' + q.name);
            q.bind('longpolls', '#');
            
            // Receive messages
            //	Setting  { ack: true } the AMQP server only delivers a single message at a time. 
            //  When you want the next message, call q.shift(). When ack is false then you will receive messages as fast as they come in. 
            
            /*  q.subscribe({ ack: true }, function (json, headers, deliveryInfo, message) { */  // subscribe with ack
            /*  message.reject(true); // requeue = true */
            
            q.subscribe(function (message) {
                // Print messages to stdout
                console.log('subscribe message ::  ' + message.type + ' : ' + message.sessionid);
                
                var sid = message.sessionid;
        		var req_info = collections.long_connections_by_session[sid];
        		if (!req_info || req_info.completed) {
        			console.log ('subscribe message ::  no outstanding longpolling requests for ' + sid + ', do nothing');
        			/*
        			if (!temp_events_pending_longpoll[sid])    
        				temp_events_pending_longpoll[sid] = events;
        			else
        				temp_events_pending_longpoll[sid].push.apply(temp_events_pending_longpoll[sid], events);
        			*/
        		} else {
        			console.log ('subscribe message :: got active connection for user ' + sid + ', sending events');
                    collections.session_events_collection.findAndModify (
                        {_id: sid},
                    	[],
                    	{$unset :{ 'events' : 1}},
                    	{new: false, upsert: false },
                    	function(err, data) {
                    	    if (err || !data) {
                                console.log ('subscribe message :: no event data!!'  + err + '  :: ' + JSON.stringify(data));
                    	    } else {
                        		console.log ('subscribe message ::  ' + err + '  :: ' + JSON.stringify(data));
                        		clearTimeout(req_info.timeoutid);
                        		req_info.completed = true;
                        		req_info.request.resume();
                        		//event.my_points = udata.points;
                        		req_info.request.session = null; // method doesnt update the session
                        		req_info.response.send (JSON.stringify(data.events));
                    	    }
                    	});
                    //q.shift(); // Acknowledges the last message
                }
            });     // subscribe to queue
        });     // create queue
    });
});


var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;
var sfuser = process.env.SFDC_USERNAME;
var sfpasswd = process.env.SFDC_PASSWORD;
// var redirectUri = 'http://localhost:'+port+'/auth-callback'; /* NOT NEEDED FOR USERNAME/PASSWORD flow */



db_connector.open(function(err, db) {
    
    var got_authorised_connection = function() {
        
        collections.db = db; 
        
        db.collection ('session_events', function(err,c) {  
            collections.session_events_collection = c;  
        });
        db.collection ('events', function(err,c) {  
            collections.events_collection = c;  
        });
         db.collection ('users', function(err,c) {  
            collections.users_collection = c;  
        });
        db.collection ('groups', function(err,c) {  
            collections.groups_collection = c;  
        });
        db.collection ('posts', function(err,c) {  
            collections.posts_collection = c;  
        });
        
        var mstore = new mongostore(db);
        var app = express.createServer();
        var port = process.env.PORT || 3001;
        
        // Order of these middlewares is VERY important!
        app.configure(function(){
            
            // serve the static resources
            app.use(express.static(__dirname + '/public'));    // middleware for static resources
            
            // log the incoming request (not for static resources)
            app.use(express.logger());
            
            // process the cookies on the request
            app.use(express.cookieParser());
            
            // set the request 'session' property
            app.use(express.session({
              	secret: "genhashfromthis",
           		store: mstore
        	}));  // middleware for session management
            
            // middleware for parsing a POST body into 'req.body'
            app.use(express.bodyParser()); 
            delete express.bodyParser.parse['multipart/form-data'];

            
            // set the views
            app.set('views', __dirname + '/views');

            // lastly, match the request with the defined routes
            require('./express_routes')(app, collections);

        });
        // start the server
        app.listen(port);
        console.log ('Server started on port ' + port);
        
    }

    if (db_url.auth != undefined) {
        var auth = db_url.auth.split(':');
        if (auth.length >= 2) {
            db.authenticate(auth[0], auth[1], got_authorised_connection);
        } else {
           throw new Error('Failed to get credentials from db_url');
        }
    } else {  
        got_authorised_connection();
    }
});

/*
var cb_connected = function (collection) {
	//(function () { var m = []; for (var p in collection) { if(typeof collection[p] == "function") { m.push(p); } } console.log (m); })()
	collection.db.collection ('session_events', function(err,c) { 
        //c.insert ({name:'keith'}); 
        session_events_collection = c;  
    	foauth.login(clientId, clientSecret , sfuser, sfpasswd, function(){
        app.set('views', __dirname + '/views');
        app.listen(port);
        console.log ('Server started on port ' + port);
    	});
	});
    collection.db.collection ('events', function(err,c) {  
        events_collection = c;  
    });
     collection.db.collection ('users', function(err,c) {  
        users_collection = c;  
    });
    collection.db.collection ('groups', function(err,c) {  
        groups_collection = c;  
    });
    collection.db.collection ('posts', function(err,c) {  
        posts_collection = c;  
    });
}


var mstore = new mongostore({ url: process.env.MONGO_DB}, cb_connected);
app.use(express.static(__dirname + '/public'));    // middleware for static resources
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({
		secret: "genhashfromthis",
		store: mstore
	}));  // middleware for session management
app.use(express.bodyParser());  // middleware for parsing a POST body into 'req.body'
*/
    





function queryAPI (resturl, mbody, httpmethod, callback) {
    
    //console.log ('got token : ' + JSON.stringify(foauth.getOAuthResponse()));

    var data = '';
    
    var host =  (require('url').parse(foauth.getOAuthResponse().instance_url))['host'];

    
    var options = {
        method: httpmethod,
        host: host,
        path: '/services/data/v24.0/' + resturl,
        headers: {
          'Host': host,
          'Authorization': 'OAuth '+foauth.getOAuthResponse().access_token,
          'Accept':'application/jsonrequest',
          'Cache-Control':'no-cache,no-store,must-revalidate',
          'Content-type':'application/json; charset=UTF-8'
        }
    
    }
    
    //Issue the Force.com REST API call to add a Lead record
    var req = https.request(options, function(res) {
      console.log("statusCode: ", res.statusCode);
    
      res.on('data', function(_data) {
        data += _data;
      });
    
      res.on('end', function(d) {
        if (res.statusCode == 401){
          //Our Access Token has expired, and so we need to login again
          console.log('Logging in again...');
          foauth.login(clientId, clientSecret , sfuser, sfpasswd,  queryAPI (resturl, mbody, httpmethod, callback));
        }else if (res.statusCode != 200 && res.statusCode != 201 && res.statusCode != 204){
            // 200 = OK, 201 = CREATED
          //Force.com API returned an error. Display it to the user
          console.log('Error from Force.com:' + res.statusCode + ' : ' +data);
          data = JSON.parse(data);
          console.log('Error message:'+data[0].message);

        }else if (res.statusCode == 204) {
            // this is from an update call!!!
          callback (null);
        }else{
          callback (JSON.parse(data));
        }
      });
    
    }).on('error', function(e) {
      console.log(e);
    })
    
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
//    console.log ('sending body ' + JSON.stringify(mbody));
    req.session = null; // method doesnt update the session
    req.end(JSON.stringify(mbody));
};

/*
app.get('/', function(req, res){
    res.render('logon.ejs', { locals: {  loggedon: false, message: '' } });
});
//app.get('/:urlpage', function(req, res){
//    console.log ('/:urlpage + ' + req.params.urlpage);
//    res.render(req.params.urlpage + '.ejs', { locals: { } });
//});
*/


/**
* GET handler for retrieving events for the user.
*/



