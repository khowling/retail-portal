var rest = require('restler'),
    mongodb = require('mongodb'),
    gridform = require('gridform'); // https://github.com/aheckmann/gridform

module.exports = function(app, collections){
    

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////                USER        ////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////   

app.get ('/profile', function(req,res) {
    var uid = req.session.username,
        udata = req.session.userdata;
        
    if (!uid) {
        res.send ('Please Login', 400);
        return;
    }   
    collections.groups_collection.find().toArray( function (err, groups) {
        console.log ('/profile groups : ' + JSON.stringify (groups));
        //res.render('profile.ejs', { layout: false, locals: {  feedid: whatid, udata: udata } });
        res.render('profile.ejs', { locals: {  me: udata, groups: groups } });
	});
});

app.get('/media/:filename', function (req,res) {
    var gs = new mongodb.GridStore(collections.db, req.params.filename, 'r');
    gs.open(function(err, gs){
        gs.stream([autoclose=false]).pipe(res);
    });
    
    
    
});

app.post ('/profile', function(req,res) {
    
    var options = { db: collections.db };
    var form = gridform(options);

      // parse normally
    form.parse(req, function (err, fields, files) {
    
        console.log ('/profile fields ' + JSON.stringify(fields));
        console.log ('/profile file [' + err + '] ' + JSON.stringify(files));
        
        var user =  {
            username : fields["user[email]"],
    		fullname: fields["user[name]"],
    		points: 0,
    		belongs_to_primary: fields["user[location]"],
            desc:  fields["user[description]"],
            picture_url: files["profile_image[uploaded_data]"]["name"]
        };
    
        collections.users_collection.insert (user, function(err, docs) {
            res.redirect('/');
        })
    
    });
  
  
/*   
    var uid = req.session.username,
        udata = req.session.userdata;
        
    if (!uid) {
        res.send ('Please Login', 400);
        return;
    }
 
    console.log ('/profile body :: ' + JSON.stringify(req.body));
    console.log ('/profile body :: ' + JSON.stringify(req.files));
    
    var user =  {
    	username : req.body.user.email,
		fullname: req.body.user.name,
		points: 0,
		belongs_to_primary: req.body.user.location,
        desc: req.body.user.description
    };

    collections.users_collection.insert (user, function(err, docs) {
        res.redirect('/');
    })
*/
});


// LOGIN POST
app.post('/ajaxlogin', function (req,res) {
    var uid = req.body.username;
    console.log ('ajaxlogin: Attempt to login as ' + uid + ', sessionid : ' + req.sessionID);
    
    if (uid) {
        collections.users_collection.findOne({username:uid}, function(err, item) {
    			if (err || !item) {
    				res.send({
    					message: 'username not found (ensure Contact exists with username in PortalID__c field): ' + uid
    					});
    			} else {
						console.log ('/home - got userdata : ' + JSON.stringify(item));    
						var sess = req.session;
						//Properties on req.session are automatically saved on a response
						sess.username = item.username;
						sess.userdata = item;  
						res.send({ 
							username: item.username, 
							userdata: item
							});
					}
				return;
    	
    	});
/*
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
                
//                sess.start_idx = event_index -1;
//                createEvents(uid, udata,  null);
//                createTrainings (uid, udata);
                
                res.send({ 
                        username: uid, 
                        userdata: udata
//                        current_index: sess.start_idx
                        });
               
                return;
           } else {
                res.send({message : 'username not found (ensure Contact exists with username in PortalID__c field): ' + uid});
                return;
           }
        });
*/
    } else {
	res.send({message : 'Please enter username'});
    }
});

app.get('/ajaxlogin', function (req,res) {
    var uid = req.session.username,
        udata = req.session.userdata;
//        start_idx = req.session.start_idx;
        
    console.log ('ajaxlogin: checking valid session for ' + uid + ', sessionid : ' + req.sessionID);
        
    if (!uid) {
        // no active session
		res.send ('Please Login', 400);
		return;
	} else {
	    // got active session
        req.session = null; // not changing the session
        
        res.send({ 
                username: uid, 
                userdata: udata, 
//                current_index: start_idx
                }); 
    }
});

app.get('/logout', function (req,res) {
    req.session.username = null;
    req.session.udata = null;
    req.session.start_idx = null;
    req.session.destroy();
    res.redirect('/');
    
});


////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////                CHAT        ////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////    

app.post ('/post/:what', function (req,res) {
    console.log ('/post/:what' + req.params.what + ' : ' + req.body.me);
    var uid = req.session.username,
        udata = req.session.userdata,
        whatid = req.params.what,
        files = req.files,
        filename = req.body.fname,
        filedesc = req.body.fdesc,
		me = req.body.me;
        

        
    if (!uid && !me) {
		console.log ('/post/:what : no uid');
		res.send ('Please Login', 400);
		return;
	} 
    if (whatid == 'me') whatid = udata.outlet.id;
	
	//  THIS IS A WORKAROUND BEBAUSE PHONGGAP DOESNT SEND COOKIES WITH FileTransfer.upload!! NEED TO FIX
	var fullname = me;
    if (udata) fullname = udata.fullname;
	// END OF WORKAROUND
    
    if (files) {
        
        console.log('/post got a file' + filename);
        console.dir(files);
        
        var host =  (require('url').parse(foauth.getOAuthResponse().instance_url))['host'];

        rest.post('https://' + host + '/services/data/v24.0/' + 'chatter/feeds/record/'+whatid+'/feed-items', {
          multipart: true,
          headers: { 
              'Host': host,
              'Authorization': 'OAuth '+foauth.getOAuthResponse().access_token,
            },
          data: {
            'text':  fullname + ': '+ req.body.mess,
            'desc': filedesc,
            'title': filename,
            'feedItemFileUpload': rest.file(files.attach.path, files.attach.name, null, 'binary',  files.attach.type)
          }
        }).on('complete', function(results) {
            req.session = null; // method doesnt update the session
			console.log ('/post/:what : results : ' + results);
			console.log ('/post/:what : results : ' + JSON.stringify(results));
            res.send (results);
        });
        
    } else {
		console.log('/post no file');
        var bdy = { "body" :   {"messageSegments" : [{"type": "Text", "text" : fullname + ': '+ req.body.mess  }] }};
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
	res.header('Content-Type', mt);
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
				res.write (new Buffer(_data, 'binary'));
				
			});
    
			fileres.on('end', function() {
				console.log ('/feedfile : end, send the response');
				res.end();
			});
		}).on('error', function(e) {
		  console.log(e);
		})
});
/*
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
*/
app.get ('/myfeed/:what', function (req,res) {
    var uid = req.session.username,
        udata = req.session.userdata,
        whatid = req.params.what;
        
    if (!uid) {
        res.send ('Please Login', 400);
		return;
	}
    if (whatid == 'me') {
    	console.log ('/myfeed : query for primary_group : ' + udata.belongs_to_primary);
    	collections.groups_collection.findOne({_id: new mongodb.ObjectID (udata.belongs_to_primary)}, function(err, group) {
    			console.log ('/myfeed : got primary_group_memebers : [' + err + '] : ' + JSON.stringify(group));
    			var team_data = {};
    			team_data.outlet  = { name: group.name, pic: group.picture_url};
    			team_data.outlet_team = {};
    			collections.users_collection.find({_id: { $in: group.members	}}).toArray( function (err, users) {

						for (var idx in users) {
							var member =  users[idx];
							team_data.outlet_team[member.fullname] =   { 
								points: member.points,
								pic: member.picture_url
							}
						}	
						
						collections.posts_collection.find({parentid: group._id}).toArray( function (err, posts) {
							req.session = null; // method doesnt update the session
							res.send({team: team_data, feed :posts, me: udata});

						});
					});
			});
    	/*
			var team_data = null,
			feedres = null,
			sentres = false;
			
			var sendresponse = function () {
				if (feedres && team_data && sentres==false) {
					req.session = null; // method doesnt update the session
					sentres = true;
					res.send({team: team_data, feed :feedres, me: udata});
				}
			}
			
			// get user names and pictures and outlets too!
			queryAPI('query?q='+escape('select Name, PortalPic__c,  (select Name, Points__c, PortalPic__c from Contacts) from Account where Id = \'' + udata.outlet.id + '\''), null, 'GET',  function (results) {
				console.log ('myfeed: got team query results :' + JSON.stringify(results));
				team_data = {};
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
				sendresponse();
			});
			queryAPI('chatter/feeds/record/'+udata.outlet.id+'/feed-items', null, 'GET', function (results) {
				feedres = results;
				sendresponse();
			});
			*/
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

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////                EVENTS        //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////// 

var PASS_SCORE = 100;
app.post('/donequiz', function (req,res) {
    var uid = req.session.username,
        sid = req.sessionID,
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
		
        collections.events_collection.findOne({_id: qid}, function(err, record) {
    		var alreadydone = udata.completed_events;
    		var points_award = 0;
            
    		if (!alreadydone[qid]) { // first atemmpt
    			alreadydone[qid] = { id: "", passed: now_passed, score: score, attempts: 1, bestscore: score};
    			points_award = score * record.points/100;
    			
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
            
            
            /* update mongo */
            var updatesJson = {};
            updatesJson["completed_events."+qid] = alreadydone[qid];
            collections.users_collection.update ({username: uid}, { $set: updatesJson }, {safe:true}, function(err) {
                        if (err) { 
                            console.warn(err.message);
                        } else {
                            console.log('successfully updated'); 
             
                        	var event = {
                    			item_id: qid,
                    			item_type: "QUIZ",
                    			results_data: alreadydone[qid]
                    		};
                    		//if (!events_by_user[uid]) events_by_user[uid] = [];	
                    		//events_by_user[uid].push(event);
                            
                            sendEventsToSession([event], sid);
                            
                            req.session.userdata = udata;  // update the session store with the new values.
                            console.log ('/donequiz - udata.completed_events : ' + JSON.stringify(req.session.userdata));
                            res.send({points: udata.points});
                            
                
                            if ((!aready_passed) && now_passed) {
                        		// just passwd new quiz, hunt for new unlocks!!
                    			createEvents (uid, udata, qid, sid);
                    		}
                        }
                    });
                        
            
            /*
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
    //    			index: event_index++,
    //    			timestamp: new Date().getTime(),
    //    			active: true,
        			item_id: qid,
        			item_type: "QUIZ",
        			results_data: alreadydone[qid]
        		};
        		//if (!events_by_user[uid]) events_by_user[uid] = [];	
        		//events_by_user[uid].push(event);
                
                sendEventsToSession([event], sid);
                
                req.session.userdata = udata;  // update the session store with the new values.
                console.log ('/donequiz - udata.completed_events : ' + JSON.stringify(req.session.userdata));
                res.send({points: udata.points});
                
    
                if ((!aready_passed) && now_passed) {
            		// just passwd new quiz, hunt for new unlocks!!
        			createEvents (uid, udata, qid, sid);
        		}
        		//notify_long_connection_by_user(uid, udata);
            });
            */
        });
	} else {
	
    	// update points in response
        req.session = null;
    	res.send({points: udata.points});
	}
});



app.post('/booktraining', function (req,res) {
    var uid = req.session.username,
        sid = req.sessionID,
        udata = req.session.userdata;
    if (!uid) {
		res.send ('Please Login', 400);
		return;
	} 

	var tid = req.body.tid,
		tdate = req.body.tdate;

	console.log ('booktraining() complted quiz:' + tid + ', data : ' + tdate);
	// need to of least tryed one question to register quiz attempt!

		
		var alreadybooked = udata.booked_training;
        if (!alreadybooked[tid]) { // first atemmpt
            console.log ('booktraining() first atemmpt');
    		alreadybooked[tid] = { id: "",   type: 'Booked on ' + tdate};
        } else {
            // just update date
            console.log ('booktraining() just update date');
            alreadybooked[tid] = { id: alreadybooked[tid].id, type: 're-Booked on ' + tdate };
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
        console.log ('booktraining() ' + sfdc_url + ' : ' + JSON.stringify(bdy));
        
        queryAPI(sfdc_url, bdy, httpmethod, function(response) {
            if (response) {
                console.log ('/booktraining -  response : ' +  JSON.stringify(response));
                console.log ('/booktraining setting id ' + tid + ' : ' + response.id);
                alreadybooked[tid].id = response.id;
            }

            
    		var event = {
//    			index: event_index++,
//    			timestamp: new Date().getTime(),
//    			active: true,
    			item_id: tid,
    			item_type: "TRAINING",
    			results_data: alreadybooked[tid]
    		};
    		//if (!events_by_user[uid]) events_by_user[uid] = [];	
    		//events_by_user[uid].push(event);
            sendEventsToSession([event], sid);
            
            
            req.session.userdata = udata;  // update the session store with the new values.
            console.log ('/booktraining - udata.completed_events : ' + JSON.stringify(req.session.userdata));
            res.send({points: udata.points});
            

    		//notify_long_connection_by_user(uid, udata);
        });

});

// If we have a LongPoll request, respond with the events. otherwise add it to the 'temp_events_pending_longpoll' array!
//var temp_events_pending_longpoll = {};
/*
function sendEventsToSession (events, sid) {
	console.log ('sendEventsToSession()');
	var req_info = long_connections_by_session[sid];
	if (!req_info || req_info.completed) {
		console.log ('sendEventsToSession() no outstanding longpolling requests for ' + sid + ', store events for pending longpoll');
		if (!temp_events_pending_longpoll[sid])    
			temp_events_pending_longpoll[sid] = events;
		else
			temp_events_pending_longpoll[sid].push.apply(temp_events_pending_longpoll[sid], events);
	} else {
		console.log ('sendEventsToSession() got active connection for user ' + sid + ', sending events');

		clearTimeout(req_info.timeoutid);
		req_info.completed = true;
		req_info.request.resume();
		//event.my_points = udata.points;
		req_info.request.session = null; // method doesnt update the session
		req_info.response.send (JSON.stringify(events));
	}
}
*/



var connectionTimeout = 25; // always send a empty '200' reponse to each open request after 60seconds.
app.get('/longpoll/:lasteventprocessed', function (req, res) {
    var uid = req.session.username,
        udata = req.session.userdata,
        sid = req.sessionID,
        lasteventprocessed = req.params.lasteventprocessed;
        
    if (!uid) {
    	res.send ('Please Login', 400);
		return;
	} 
    
    if (lasteventprocessed == 0) {
        collections.long_connections_by_session[sid] = null;
        //temp_events_pending_longpoll[sid] = null;
       createEvents(uid, udata,  null, req.sessionID);
//       createTrainings (uid, udata, req.sessionID);
    }
    
	console.log ('longpoll() got request from ' + uid + ' last eventprocessed from url : ' + lasteventprocessed);
	// check the required parameters

    
	//var event = nextEvent(uid, lasteventprocessed);
    //var events = temp_events_pending_longpoll[sid];
	//if (!events) {

    collections.session_events_collection.findAndModify (
        {_id: sid},
        [],
    	{$unset :{ 'events' : 1}},
    	{new: false, upsert: false },
    	function(err, data) {
            if (err || !data || !data.events) {
                console.log ('longpoll() :: no event data ('  + err + ')  : ' + JSON.stringify(data));
            	console.log ('longpoll() pause request, no event to send ' + lasteventprocessed);
        
        		var req_info = { request: req, response: res, lasteventprocessed: lasteventprocessed, completed: false};
        		req_info.timeoutid = setTimeout( function () { 
        			console.log ('longpoll() saved req_info,  timeout pulse');
        			req_info.request.resume();
        			req_info.response.send({item_type: "PULSE"});
        			req_info.completed = true;
        			 }, connectionTimeout * 1000); 
        
        		//if (!long_connections_by_session[sid])
        		//	long_connections_by_session[sid] = [];  
        		collections.long_connections_by_session[sid] = req_info;
        		req.pause();
        		console.log ('longpoll() stored and paused request');
        
            } else {
        		console.log ('longpoll() send the stored event data : ' + JSON.stringify(data));
                res.send(JSON.stringify(data.events));
            }
    	});
/*
	} else {
		console.log ('longpoll() got event to send to user');
		//event.my_points =udata.points;
		//setTimeout (function() {  // ADD A 1 SECOND DELAY - JUST FOR EFFECT!!!
		res.send(JSON.stringify(events));
		console.log ('longpoll sent :' + JSON.stringify(events));
        temp_events_pending_longpoll[sid] = null;
		//}, 1000);
	}
*/

});

app.get ('/stream/:filename', function (req,res) {
	var fn = __dirname+'/public/media/' +req.params.filename;
	console.log ('stream: filename ' + fn);
	res.sendfile (fn);
});




function createEvents(uid, udata, just_completed, sid) {
    console.log ('createEvents() ' + uid + ', just_completed (set if just want delta): ' + just_completed);
	
    // TODO...
    var cursor = collections.events_collection.find ({});
    cursor.toArray( function (err, item) {
        console.log ('createEvents() query events item (' + err + ') : ' + JSON.stringify (item)); 
        var ret_events = [];
        for (var idx in item) {

            var i = item[idx]._id;
    		var e = item[idx];
    		console.log ('createEvents : checking item : ' + i + '  :: ' + JSON.stringify (e));
    		
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
    		if (((!selected) || (just_completed != null && newlyselected == false))) {
                console.log ('not selected');
    		} else {
                // 100 points for just getting a new event
        	    //udata.points = udata.points + 50;
        		//console.log ('createEvents: points: adding ' + '50' + ', total now : ' + udata.points);
        
        		var event = {
            //			index: event_index++,
            //			timestamp: new Date().getTime(),
            //			active: true,
            			item_id: i,
            			item_type: e.type,
            			item_data: e,
            			results_data: udata.completed_events[i]
        		    };
        		//if (!events_by_user[uid])	events_by_user[uid] = [];	
        		//events_by_user[uid].push(event);
        		console.log('createEvents: ADDED EVENT  [' + event.item_id +'], event_data ' + JSON.stringify(event.item_data) + ', results_data ' + JSON.stringify(event.results_data)  + ', newlyselected : '+ newlyselected);
                ret_events.push (event);
    		}
        }
        sendEventsToSession(ret_events, sid);
    });
}

function createTrainings (uid, udata, sid) {
    console.log ('createTrainings :' + uid);
     queryAPI('query?q='+escape('select Id, Name, Description__c, Start_date__c, Total_Participations__c, TR_Training__r.Content_Reference__c  , Training_Categories__c  from TR_Training_Availability__c where Account__c = \'' + udata.outlet.id + '\''), null, 'GET',  function (results) {
           console.log ('createTrainings: got  query results :' + JSON.stringify(results));
            if (results.totalSize >= 1) {
                var ret_events = [];
                for (var m in results.records) {
                    var trec = results.records[m];
                    
                    var event = {
    //                		index: event_index++,
    //            			timestamp: new Date().getTime(),
    //            			active: true,
                			item_id: trec.Id,
                			item_type: 'TRAINING',
                			item_data: {
                                name: trec.Name,
                        		desc: trec.Description__c,
                    			info: trec.Total_Participations__c
                                },
            			    results_data: udata.booked_training[trec.Id]
            		    };
//                    if (!events_by_user[uid])    events_by_user[uid] = [];	
//            		events_by_user[uid].push(event);
                    console.log('createTrainings: ADDED EVENT [' + JSON.stringify(event));
                    ret_events.push(event);
                    
                }
//              notify_long_connection_by_user(uid, udata);
                sendEventsToSession(ret_events, sid);
           }
     });
}



function sendEventsToSession (events, sid) {
	console.log ('sendEventsToSession() [' + sid + '] : '+ events.length);
    var req_info = collections.long_connections_by_session[sid];
    if (!req_info || req_info.completed) { 
        console.log ('sendEventsToSession() : save events to database & message all dynos to see if they have a longpoll for that session');
	    collections.session_events_collection.update ({_id: sid}, {$pushAll :{'events' :  events}}, {upsert: true}, function(err, data) {
			console.log ('sendEventsToSession, created event data on session : [' + err + '] : ' + data);
			collections.longpoll_exchange.publish ('#', {type: 'NEW_EVENT_DATA', sessionid: sid}, { contentType: 'application/json'});
    	});
    } else {
        clearTimeout(req_info.timeoutid);
    	req_info.completed = true;
    	req_info.request.resume();
    	//event.my_points = udata.points;
    	req_info.request.session = null; // method doesnt update the session
		req_info.response.send (JSON.stringify(events));
    }
}





}