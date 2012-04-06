var express = require('express'),
    foauth = require('./force_oauth_pass.js'),
    https = require('https'), 
    rest  = require('restler');
    
var app = express.createServer();
var port = process.env.PORT || 3001;

var connectionTimeout = 25; // always send a empty '200' reponse to each open request after 60seconds.

var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;
var sfuser = process.env.SFDC_USERNAME;
var sfpasswd = process.env.SFDC_PASSWORD;
// var redirectUri = 'http://localhost:'+port+'/auth-callback'; /* NOT NEEDED FOR USERNAME/PASSWORD flow */

app.use(express.static(__dirname + '/public'));    // middleware for static resources
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({secret: "genhashfromthis"}));  // middleware for session management
app.use(express.bodyParser());  // middleware for parsing a POST body into 'req.body'
    
    
foauth.login(clientId, clientSecret , sfuser, sfpasswd, function(){
    app.set('views', __dirname + '/views');
    app.listen(port);
    console.log ('Server started on port ' + port);
});

app.post ('/post/:what', function (req,res) {
    var uid = req.session.username,
        udata = req.session.userdata,
        whatid = req.params.what,
        files = req.files,
        filename = req.body.fname,
        filedesc = req.body.fdesc;
        

        
    if (!uid) {
		res.send ('Please Login', 400);
		return;
	} 
    if (whatid == 'me') whatid = udata.outlet.id;
    
    
    if (files) {
        
        console.log('/post ' + filename);
        console.dir(files);
        
        var host =  (require('url').parse(foauth.getOAuthResponse().instance_url))['host'];

        rest.post('https://' + host + '/services/data/v24.0/' + 'chatter/feeds/record/'+whatid+'/feed-items', {
          multipart: true,
          headers: { 
              'Host': host,
              'Authorization': 'OAuth '+foauth.getOAuthResponse().access_token,
            },
          data: {
            'text':  udata.fullname + ': '+ req.body.mess,
            'desc': filedesc,
            'title': filename,
            'feedItemFileUpload': rest.file(files.attach.path, files.attach.name, null, 'binary',  files.attach.type)
          }
        }).on('complete', function(results) {
            req.session = null; // method doesnt update the session
            res.send (results);
        });
        
    } else {
        var bdy = { "body" :   {"messageSegments" : [{"type": "Text", "text" : udata.fullname + ': '+ req.body.mess  }] }};
        queryAPI('chatter/feeds/record/'+whatid+'/feed-items', bdy, 'POST',  function(results) {
            //console.log ('/post : results : ' + JSON.stringify(results));
            req.session = null; // method doesnt update the session
            res.send (results);
       });
    }
});

app.post ('/postcomment', function (req,res) {
    
    var uid = req.session.username,
         udata = req.session.userdata;
         
    if (!uid) {
    	res.send ('Please Login', 400);
		return;
	} 


    var bdy = { "body" :   {"messageSegments" : [{"type": "Text", "text" : udata.fullname + ': '+  req.body.mess  }] }};
    queryAPI('chatter/feed-items/'+ req.body.feeditem +'/comments', bdy, 'POST', function(results) {
        //console.log ('/postcomment : results : ' + JSON.stringify(results));
        req.session = null; // method doesnt update the session
        res.send (results);
   });
});

app.get ('/feedfile', function(req,res) {
    var uid = req.session.username,
        what = req.query.what,
        mt = req.query.mt;
        
    if (!uid) {
//        res.send ('Please Login', 400);
//        return;
	}
    
    console.log ('/feedfile ' + what);
    
    var host =  (require('url').parse(foauth.getOAuthResponse().instance_url))['host'];
/*
    rest.get('https://' + host +  what, {
      headers: { 
          'Authorization': 'OAuth '+foauth.getOAuthResponse().access_token
      }
    }).on('complete', function(results) {
        
        req.session = null; // method doesnt update the session
        res.header('Content-Type', mt);
        res.end (results, 'binary');
    });
*/
	
	res.contentType(mt);
	res.attachment();
	
	var data = null;
	https.get({
			method: 'get',
			host: host,
			path: what,
			headers: {
			  'Authorization': 'OAuth '+foauth.getOAuthResponse().access_token,
		}}, function(fileres) {
			console.log("/feedfile : statusCode: ", fileres.statusCode);
    
			fileres.on('data', function(_data) {
				
				console.log ('/feedfile : got some data');
				/*
				if (!data)
					data = _data;
				else
					data += _data;
				*/
				res.write (data);
				
			});
    
			fileres.on('end', function() {
				console.log ('/feedfile : end, send the response');
				//res.end (data, 'binary');
				res.end();
			});
		}).on('error', function(e) {
		  console.log(e);
		}).on('end', function() {
		  console.log('/feedfile : the end');
		})
});

app.get ('/chat/:what', function(req,res) {
    var uid = req.session.username,
        udata = req.session.userdata,
        whatid = req.params.what;
        
    if (!uid) {
        res.send ('Please Login', 400);
    	return;
	}   

    res.render('chat.ejs', { layout: false, locals: {  feedid: whatid, udata: udata } });
    //res.render('chat.ejs', { locals: {  feedid: udata.outlet.id, udata: udata } });
});

app.get ('/myfeed/:what', function (req,res) {
    var uid = req.session.username,
        udata = req.session.userdata,
        whatid = req.params.what;
        
    if (!uid) {
        res.send ('Please Login', 400);
		return;
	}
    if (whatid == 'me') {
        // get user names and pictures and outlets too!
         queryAPI('query?q='+escape('select Name, PortalPic__c,  (select Name, Points__c, PortalPic__c from Contacts) from Account where Id = \'' + udata.outlet.id + '\''), null, 'GET',  function (results) {
               console.log ('myfeed: got team query results :' + JSON.stringify(results));
               var team_data = {};
               if (results.totalSize == 1) {
                    team_data.outlet  = { name: results.records[0].Name, pic: results.records[0].PortalPic__c};
                    team_data.outlet_team = {};
                    
                    if (results.records[0].Contacts) {
                        var team =  results.records[0].Contacts.records;
                        for (var m in team) {
                             team_data.outlet_team[team[m].Name] =   { 
                                    points: team[m].Points__c,
                                    pic: team[m].PortalPic__c
                            };
                        }
                    }
               }
             queryAPI('chatter/feeds/record/'+udata.outlet.id+'/feed-items', null, 'GET', function (results1) {
                //console.log ('/myfeed : results : ' + JSON.stringify(results));
                req.session = null; // method doesnt update the session
                res.send({team: team_data, feed :results1, me: udata});
            });
        });
    } else {
        // its a training id
        // get user names and pictures and outlets too!
         queryAPI('query?q='+escape('select Name, (select Contact__r.Name, Contact__r.Points__c, Contact__r.PortalPic__c from Training_Participation__r) from TR_Training_Availability__c where Id = \'' + whatid + '\''), null, 'GET',  function (results) {
               console.log ('myfeed: got team query results :' + JSON.stringify(results));
               var team_data = {};
               if (results.totalSize == 1) {
                    team_data.outlet  = { name: results.records[0].Name, pic: 'none'};
                    team_data.outlet_team = {};
                    
                    if (results.records[0].Training_Participation__r) {
                        var team =  results.records[0].Training_Participation__r.records;
                        for (var m in team) {
                             team_data.outlet_team[team[m].Contact__r.Name] =   { 
                                    points: team[m].Contact__r.Points__c,
                                    pic: team[m].Contact__r.PortalPic__c 
                            };
                        }
                    }
               }
             queryAPI('chatter/feeds/record/'+whatid+'/feed-items', null, 'GET', function (results1) {
                //console.log ('/myfeed : results : ' + JSON.stringify(results));
                req.session = null; // method doesnt update the session
                res.send({team: team_data, feed :results1, me: udata});
            });
        });        
    }
   
});


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

var hostapp = 'http://nokiaknowledge2.herokuapp.com';
var event_collection = {
	'K000': {
			type: "KNOWLEDGE",
			name: "Start Here  *** The Basics  ***",
			desc: "Portal Training",
			info: "HTML5 Video Stream",
			icon: "image/icons/gettingstarted.jpg",
			forwho: { completed : {}},
			points: 50,
			knowledgedata: {
				url: hostapp+'/stream/myvid.mp4',
				type: 'HTML5_VIDEO'
			}
	},
	
	'K001': {
			type: "KNOWLEDGE",
			name: "Just a Test",
			desc: "HTML5 streaming from node",
			info: "HTML5 Video Stream",
			forwho: { completed : {}},
			points: 50,
			knowledgedata: {
				url: hostapp+'/stream/gizmo.webm',
				type: 'HTML5_VIDEO'
			}
	},
	'K002': {
			type: "KNOWLEDGE",
			name: "Nokia Lumia 710",
			desc: "Basic Phone Demo Training",
			info: "YouTube Embedded Video",
			icon: "image/icons/nokia-710.png",
			forwho: { completed : { 'Q001':true}},
			points: 50,
			knowledgedata: {
				url: 'http://www.youtube.com/embed/0NvgOOY7gJM',
				type: 'EMBEDDED_IFRAME'
			}
	},
	'K003': {
			type: "KNOWLEDGE",
			name: "Windows Phone 7",
			desc: "Presenting Training",
			info: "YouTube Embedded Video",
			icon: "image/icons/WP7.jpg",
			forwho: { completed : {}},
			points: 50,
			knowledgedata: {
				url: 'http://www.youtube.com/embed/cBISUhRIiSE',
				type: 'EMBEDDED_IFRAME'
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
								ques: "What mobile operating system does the Nokia Lumia 800 run?",
								ans: "Windows",
								//ansInfo: "<a href='http://heroku.com'>heroku</a> PaaS.",
								ansSel: [ "iOS", "Android", "webos" ],
								retry: 0 	// The question can only be tried twice. Otherwise the user's answer is wrong.
							},
							{ 
								ques: "Which country is Nokia based?", 
								ans: "Finland",
								//ansInfo: "<a href='http://en.wikipedia.org/wiki/Ottawa'>The City of Ottawa</a> is where the capital of Canada.",
								ansSel: [ "England", "Germany", "America" ]
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
			name: "Nokia Lumia 800",
			desc: "Sales assistant general (level1)",
			forwho: { completed : {'Q001':true}},
			points: 5000,
			quizdata: {
					"multiList":[
						{ 
							ques: "Can you pre-order the Nokia Lumia 800 in White?",
							ans: "Yes",
							ansSel: [ "No" ],
							retry: 0
						},
						{ 
							ques: "What Camera does the 800 feature?", 
							ans: "8 MP Auto Focus with Carl Zeiss Optics,",
							ansInfo: "8 MP Auto Focus with Carl Zeiss Optics, 2x LED Flash and HD Video",
							ansSel: [ "No Camera", "2 MP webcam", "12 MP, x30 Optical zoom" ]
						},
						{ 
							ques: "What display size does the 800 feature?", 
							ans: '3.7" 480x800 pixels',
							ansInfo: "Corning� Gorilla� Glass, AMOLED, ClearBlack, Curved glass",
							ansSel: [ '3.5" 960x640  pixels', '10.1" 1080x800 pixels' ]
						}
					]
				}
			},
	'Q003': {
			type: "QUIZ",
			name: "Windows Mobile OS",
			desc: "Business Specification (level5)",
			forwho: { completed : {'Q001':true}},
			points: 5000,
			quizdata: {
				"multiList":[
					{ 
						ques: "What office applications comes with Windows Mobile",
						ans: 'Word, Excel, OneNote and PowerPoint',
						ansSel: [ 'Word', 'Word and Excel', 'Word, Excel and OneNote' ],
                        retry: 0    // The question can only be tried twice. Otherwise the user's answer is wrong.
					},
					{ 
						ques: "Can you create linked inboxes with Outlook Mobile?", 
						ans: "Yes",
						ansInfo: "If you have lots of accounts, you can create linked inboxes to streamline things, for example one for personal emails and one for work (the accounts stay separate)",
						ansSel: [ "No" ]
						//ansSelInfo: [
						//	"Hanoi is the capital of Vietnam", 
						//	"Washington, D.C. is the capital of the USA"
						//]
					}
				]
			}
		}
	};


app.get('/', function(req, res){
    res.render('logon.ejs', { locals: {  loggedon: false, message: '' } });
});
//app.get('/:urlpage', function(req, res){
//    console.log ('/:urlpage + ' + req.params.urlpage);
//    res.render(req.params.urlpage + '.ejs', { locals: { } });
//});

app.get('/logout', function (req,res) {
    req.session.username = null;
    req.session.udata = null;
    req.session.destroy();
    res.redirect('/');
    
});
// LOGIN POST
app.post('/ajaxlogin', function (req,res) {
    var uid = req.body.username;
    console.log ('ajaxlogin: Attempt to login as ' + uid);
    
    if (uid) {

        queryAPI('query?q='+escape('select Id, Name, PortalPic__c, PortalID__C, Points__c, Account.Name, Account.PortalPic__c, Account.id, (select Id, Name, Attempts__c, Best_Score__c, Passed__c, First_Score__c from Game_Events__r), (select Id, Name, Type__c, Training_Availability__c  from Training_Participation__r) from Contact where PortalID__c = \'' + uid + '\''), null, 'GET',  function (results) {
           console.log ('login: got query results ' + JSON.stringify(results));
           if (results.totalSize == 1) {
               var udata = {
                   id:  results.records[0].Id,
                   fullname: results.records[0].Name,
                   points: results.records[0].Points__c, 
                   outlet : {
                       id: results.records[0].Account.Id,
                       name: results.records[0].Account.Name,
                       picture_url: results.records[0].Account.PortalPic__c
                   },
                   picture_url: results.records[0].PortalPic__c, 
                   completed_events: {},
                   booked_training: {}
                   };
                   
                if (results.records[0].Game_Events__r) {
                    var gameevents =  results.records[0].Game_Events__r.records;
                    for (var gidx in gameevents) {
                        udata.completed_events[gameevents[gidx].Name] = {
                            id:  gameevents[gidx].Id,
                            attempts: gameevents[gidx].Attempts__c,
                            passed: gameevents[gidx].Passed__c,
                            score: gameevents[gidx].First_Score__c,
                            bestscore: gameevents[gidx].Best_Score__c
                        };
                    }
                }
                
                 if (results.records[0].Training_Participation__r) {
                    var tevents =  results.records[0].Training_Participation__r.records;
                    for (var gidx in tevents) {
                        udata.booked_training[tevents[gidx].Training_Availability__c] = {
                            id:  tevents[gidx].Id,
                            name:  tevents[gidx].Name,
                            type: tevents[gidx].Type__c
                        };
                    }
                }
                
                
                
                console.log ('/home - got userdata : ' + JSON.stringify(udata));    
                var sess = req.session;
                //Properties on req.session are automatically saved on a response
                sess.username = uid;
                sess.userdata = udata;  
                sess.completed_events = udata.completed_events;  
                var start_idx = event_index -1;
                createEvents(uid, udata,  null);
                createTrainings (uid, udata);
                res.send({ username: uid, userdata: udata, current_index: start_idx});
               
                return;
           } else {
                res.send({message : 'username not found (ensure Contact exists with username in PortalID__c field): ' + uid});
                return;
           }
        });
    } else {
	res.send({message : 'Please enter username'});
    }
});

app.get('/logout', function (req,res) {
    req.session.username = null;
    req.session.udata = null;
    req.session.destroy();
    res.redirect('/');
    
});
// LOGIN POST
app.post('/home', function (req,res) {
    var uid = req.body.username;
    console.log ('login: Attempt to login as ' + uid);
    
    if (uid) {

        queryAPI('query?q='+escape('select Id, Name, PortalPic__c, PortalID__C, Points__c, Account.Name, Account.PortalPic__c, Account.id, (select Id, Name, Attempts__c, Best_Score__c, Passed__c, First_Score__c from Game_Events__r), (select Id, Name, Type__c, Training_Availability__c  from Training_Participation__r) from Contact where PortalID__c = \'' + uid + '\''), null, 'GET',  function (results) {
           console.log ('login: got query results ' + JSON.stringify(results));
           if (results.totalSize == 1) {
               var udata = {
                   id:  results.records[0].Id,
                   fullname: results.records[0].Name,
                   points: results.records[0].Points__c, 
                   outlet : {
                       id: results.records[0].Account.Id,
                       name: results.records[0].Account.Name,
                       picture_url: results.records[0].Account.PortalPic__c
                   },
                   picture_url: results.records[0].PortalPic__c, 
                   completed_events: {},
                   booked_training: {}
                   };
                   
                if (results.records[0].Game_Events__r) {
                    var gameevents =  results.records[0].Game_Events__r.records;
                    for (var gidx in gameevents) {
                        udata.completed_events[gameevents[gidx].Name] = {
                            id:  gameevents[gidx].Id,
                            attempts: gameevents[gidx].Attempts__c,
                            passed: gameevents[gidx].Passed__c,
                            score: gameevents[gidx].First_Score__c,
                            bestscore: gameevents[gidx].Best_Score__c
                        };
                    }
                }
                
                 if (results.records[0].Training_Participation__r) {
                    var tevents =  results.records[0].Training_Participation__r.records;
                    for (var gidx in tevents) {
                        udata.booked_training[tevents[gidx].Training_Availability__c] = {
                            id:  tevents[gidx].Id,
                            name:  tevents[gidx].Name,
                            type: tevents[gidx].Type__c
                        };
                    }
                }
                
                
                
                console.log ('/home - got userdata : ' + JSON.stringify(udata));    
                var sess = req.session;
                //Properties on req.session are automatically saved on a response
                sess.username = uid;
                sess.userdata = udata;  
                sess.completed_events = udata.completed_events;  
                var start_idx = event_index -1;
                createEvents(uid, udata,  null);
                createTrainings (uid, udata);
                //res.send({username: sess.username, userdata: users_collection[sess.username]});
                res.render('home.ejs', { locals: { username: uid, userdata: udata, current_index: start_idx} });
                return;
           } else {
                res.render('logon.ejs', { locals: { loggedon: false, message : 'username not found (ensure Contact exists with username in PortalID__c field): ' + uid} });
                return;
           }
        });
    } else {
        res.render('logon.ejs', { locals: { message : 'Please enter username'} });
    }
});

app.get('/home', function (req,res) {
    var uid = req.session.username,
        udata = req.session.userdata;
         
    console.log ('home: attempt to access home ' + uid + ' --- ' + JSON.stringify(udata));
		
    if (uid && udata) {
            
        var sess = req.session;
		//Properties on req.session are automatically saved on a response
		sess.username = uid;
		createEvents(uid, udata, null);
        createTrainings (uid, udata);
		//res.send({username: sess.username, userdata: users_collection[sess.username]});
        req.session = null; // method doesnt update the session
        res.render('home.ejs', { locals: { username: uid, userdata: udata} });
        return;
    }
    res.render('logon.ejs', { locals: { loggedon: false, message : 'Please Logon'} });
});

var event_index = 1;
var events_by_user = {};
function createEvents(uid, udata, just_completed) {
	console.log ('createEvents :' + uid + ', just_completed : ' + just_completed);
	
	for (var i in event_collection) {
		var e = event_collection[i];
		console.log ('createEvents : checking item : ' + i);
		
		var event = null, 
				results_data = null,
				selected = true, 
				newlyselected = false;
				
		for (var needtocomplete in e.forwho.completed) {
			console.log ('createEvents: checking prereq for event, required : ' + needtocomplete + ', is it in ' + JSON.stringify(udata.completed_events) );
			if (just_completed == needtocomplete ) {
				newlyselected = true;
			}
			var hascompleted = udata.completed_events[needtocomplete];
			if ((!hascompleted) || hascompleted.passed == false) {
			//if (! (needtocomplete in users_collection[user].completed_events)) {
				selected = false; break;
			}
		}
		if (((!selected) || (just_completed != null && newlyselected == false))) continue;
		// 100 points for just getting a new event
	    //udata.points = udata.points + 50;
		console.log ('createEvents: points: adding ' + '50' + ', total now : ' + udata.points);

		
		
		event = {
			index: event_index++,
			timestamp: new Date().getTime(),
			active: true,
			item_id: i,
			item_type: e.type,
			item_data: e,
			results_data: udata.completed_events[i]
		};
		
			
		if (!events_by_user[uid])	events_by_user[uid] = [];	
		events_by_user[uid].push(event);
		console.log('createEvents: ADDED EVENT [' + event.index +  '] [' + event.item_id +'], results_data ' + results_data  + ', newlyselected : '+ newlyselected);
	}
}

function createTrainings (uid, udata) {
    console.log ('createTrainings');
     queryAPI('query?q='+escape('select Id, Name, Description__c, Start_date__c, Total_Participations__c, TR_Training__r.Content_Reference__c  , Training_Categories__c  from TR_Training_Availability__c where Account__c = \'' + udata.outlet.id + '\''), null, 'GET',  function (results) {
           console.log ('createTrainings: got  query results :' + JSON.stringify(results));
            if (results.totalSize >= 1) {

                for (var m in results.records) {
                   var trec = results.records[m];
                   var event = {
                		index: event_index++,
            			timestamp: new Date().getTime(),
            			active: true,
            			item_id: trec.Id,
            			item_type: 'TRAINING',
            			item_data: {
                            name: trec.Name,
                    		desc: trec.Description__c,
                			info: trec.Total_Participations__c
                          },
            			results_data: udata.booked_training[trec.Id]
            		};
                    if (!events_by_user[uid])    events_by_user[uid] = [];	
            		events_by_user[uid].push(event);
            		console.log('createTrainings: ADDED EVENT [' + JSON.stringify(event));
                    
                }
                notify_long_connection_by_user(uid, udata);
            
           }
     });
}

var maxAge = 60;
function nextEvent(user, lastindexprocessed) {
    if (!events_by_user[user]) return null;
    if (!lastindexprocessed) lastindexprocessed = 0;
    
    //console.log ('nextEvent: from ' + user + ', lastindexprocessed : ' +  lastindexprocessed);
    var event;
    var minTimestamp = new Date().getTime() - (maxAge * 1000);
    for(var i in events_by_user[user]) {
        var e = events_by_user[user][i];
        //console.log ('nextEvent: found event '+ e.item_id + ', checking index : ' + e.index);
			// expire event (event generated, not consumed by longpoll, throu away)
			if (e.timestamp < minTimestamp) {
				//console.log ('nextEvent: timestamp check [' + e.index +  "] expired " + JSON.stringify(event));
					e.active = false;
					continue;
			} else if (e.index > lastindexprocessed) {
				//console.log ('nextEvent: return ' + e.index);
				return e;
			}
    }
}


function notify_long_connection_by_user(uid, udata) {	
	// started notify //
	if (!long_connections_by_user[uid]) {
		console.log ("notify_long_connection_by_user: no longpolling requests for " + uid + ", do nothing");
	} else {
		for (var i=0; i < long_connections_by_user[uid].length; i++) {
			var req_info = long_connections_by_user[uid][i];
			if (!req_info.completed) {
				
				console.log ('notify_long_connection_by_user: got active connection for user ' + uid);
				
				var event = nextEvent(uid, req_info.lasteventprocessed);
				console.log ('notify_long_connection_by_user: ' + event);
				if (event) {
					console.log ('notify_long_connection_by_user: resume request & send event data' + event.index);
					
					clearTimeout(req_info.timeoutid);
					req_info.completed = true;
					
					req_info.request.resume();
					event.my_points = udata.points;
                    req_info.request.session = null; // method doesnt update the session
					req_info.response.send (JSON.stringify(event));
					
				}
			}
		}
	}
}

var PASS_SCORE = 100;
app.post('/donequiz', function (req,res) {
    var uid = req.session.username,
        udata = req.session.userdata;
	if (!uid) {
		res.send ('Please Login', 400);
		return;
	} 

	
	var qid = req.body.id,
			score = req.body.score,
			quesTried = req.body.quesTried,
			now_passed = (req.body.quesTried>0 && req.body.score>=PASS_SCORE),
			aready_passed = false;
			
	console.log ('donequiz: complted quiz:' + uid + ', quiz : ' + qid + ', score ' + score + ', quesTried : ' + quesTried + ', now_passed : ' + now_passed);
	// need to of least tryed one question to register quiz attempt!
	if ( quesTried > 0) {
		
		var alreadydone = udata.completed_events;
		var points_award = 0;
		if (!alreadydone[qid]) { // first atemmpt
			alreadydone[qid] = { id: "", passed: now_passed, score: score, attempts: 1, bestscore: score};
			points_award = score * event_collection[qid].points/100;
			
			udata.points = udata.points + points_award;
			console.log ('points: adding ' + points_award + ', total now : ' + udata.points);
		} else { // NOT first attempt
            console.log ('donequiz: not first attempt for : ' + qid);
			aready_passed = alreadydone[qid].passed;
			alreadydone[qid].attempts = alreadydone[qid].attempts + 1;
			alreadydone[qid].bestscore = Math.max(alreadydone[qid].bestscore, score);
			if (!aready_passed) alreadydone[qid].passed = now_passed;
		} 

		console.log ('donequiz: create results event ' + JSON.stringify(alreadydone[qid]));
		// create event to register new results of quiz
        
        // send update to salesforce
        var bdy = { Name: qid, Attempts__c: alreadydone[qid].attempts, Passed__c:  alreadydone[qid].passed, First_Score__c: alreadydone[qid].score, Best_Score__c: alreadydone[qid].bestscore};
        var sfdc_url = 'sobjects/Game_Event__c/' + alreadydone[qid].id;
        var httpmethod = 'PATCH'; // its an update
        if (alreadydone[qid].id.length == 0) {
            // its a insert, set the m/d file
            bdy.Contact__c = udata.id;
            bdy.Points__c = points_award;
            httpmethod = 'POST';
        }
        console.log ('/donequiz - ' + sfdc_url + ' : ' + JSON.stringify(bdy));
        
        queryAPI(sfdc_url, bdy, httpmethod, function(response) {
            if (response) {
                console.log ('/donequiz -  response : ' +  JSON.stringify(response));
                console.log ('/donequiz setting id ' + qid + ' : ' + response.id);
                alreadydone[qid].id = response.id;
            }

            
    		var event = {
    			index: event_index++,
    			timestamp: new Date().getTime(),
    			active: true,
    			item_id: qid,
    			item_type: "QUIZ",
    			results_data: alreadydone[qid]
    		};
    		if (!events_by_user[uid]) events_by_user[uid] = [];	
    		events_by_user[uid].push(event);
            
            req.session.userdata = udata;  // update the session store with the new values.
            console.log ('/donequiz - udata.completed_events : ' + JSON.stringify(req.session.userdata));
            res.send({my_points: udata.points});
            
            
            
            if ((!aready_passed) && now_passed) {
        		// just passwd new quiz, hunt for new unlocks!!
    			createEvents (uid, udata, qid);
    		}
    		notify_long_connection_by_user(uid, udata);
        });
	} else {
	
    	// update points in response
        req.session = null;
    	res.send({my_points: udata.points});
	}
});



app.post('/booktraining', function (req,res) {
    var uid = req.session.username,
        udata = req.session.userdata;
    if (!uid) {
		res.send ('Please Login', 400);
		return;
	} 

	var tid = req.body.tid,
		tdate = req.body.tdate;

	console.log ('booktraining: complted quiz:' + tid + ', data : ' + tdate);
	// need to of least tryed one question to register quiz attempt!

		
		var alreadybooked = udata.booked_training;
        if (!alreadybooked[tid]) { // first atemmpt
    		alreadybooked[tid] = { id: "",   type: 'Booked on ' + tdate};
        } else {
            // just update date
            alreadybooked[tid] = { type: 're-Booked on ' + tdate };
        }
        
        // send update to salesforce
        var bdy = { Type__c:  alreadybooked[tid].type};
        var sfdc_url = 'sobjects/TR_Training_Participation__c/' + alreadybooked[tid].id;
        var httpmethod = 'PATCH'; // its an update
        if (alreadybooked[tid].id.length == 0) {
            // its a insert, set the m/d file
            bdy.Contact__c = udata.id;
            bdy.Training_Availability__c = tid;
            httpmethod = 'POST';
        }
        console.log ('/booktraining - ' + sfdc_url + ' : ' + JSON.stringify(bdy));
        
        queryAPI(sfdc_url, bdy, httpmethod, function(response) {
            if (response) {
                console.log ('/booktraining -  response : ' +  JSON.stringify(response));
                console.log ('/booktraining setting id ' + tid + ' : ' + response.id);
                alreadybooked[tid].id = response.id;
            }

            
    		var event = {
    			index: event_index++,
    			timestamp: new Date().getTime(),
    			active: true,
    			item_id: tid,
    			item_type: "TRAINING",
    			results_data: alreadybooked[tid]
    		};
    		if (!events_by_user[uid]) events_by_user[uid] = [];	
    		events_by_user[uid].push(event);
            
            req.session.userdata = udata;  // update the session store with the new values.
            console.log ('/donequiz - udata.completed_events : ' + JSON.stringify(req.session.userdata));
            res.send({my_points: udata.points});
            

    		notify_long_connection_by_user(uid, udata);
        });

});

/**
* GET handler for retrieving events for the user.
*/
var long_connections_by_user = {};
app.get('/longpoll/:lasteventprocessed', function (req, res) {
    var uid = req.session.username,
        udata = req.session.userdata;
    if (!uid) {
		res.send ('Please Login', 400);
		return;
	} 
    
	var lasteventprocessed = req.params.lasteventprocessed;
	console.log ('longpoll: got request from ' + uid + ' last eventprocessed from url : ' + lasteventprocessed);
	// check the required parameters

	var event = nextEvent(uid, lasteventprocessed);
	if (!event) {
		console.log ('longpoll: pause it, no event to send');

		var req_info = { request: req, response: res, lasteventprocessed: lasteventprocessed, completed: false};
		req_info.timeoutid = setTimeout( function () { 
			console.log ('longpoll:  timeout pulse');
			req_info.request.resume();
			req_info.response.send({type: "PULSE"});
			req_info.completed = true;
			 }, connectionTimeout * 1000); 

		if (!long_connections_by_user[uid])
			long_connections_by_user[uid] = [];  
		long_connections_by_user[uid].push(req_info);
		req.pause();
		console.log ('longpoll: stored and paused request');

	} else {
			console.log ('longpoll: got event to send to user');
			event.my_points =udata.points;
			//setTimeout (function() {  // ADD A 1 SECOND DELAY - JUST FOR EFFECT!!!
				res.send(JSON.stringify(event));
				console.log ('longpoll sent :' + event.index);
			//}, 1000);
	}
});

app.get ('/stream/:filename', function (req,res) {
	var fn = __dirname+'/public/media/' +req.params.filename;
	console.log ('stream: filename ' + fn);
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


