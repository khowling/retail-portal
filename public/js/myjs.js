    	
		
        // DONT CRASH IN IE
        if (typeof console == "undefined") var console = { log: function() {} };
        
        
        var _serverurl;
		var _userdata;
		
        function initPoints () {
				$('#slider1').bxSlider({
						controls: false,
						auto: true,
						pager: true,
						pagerSelector: $('#carousel_items_items'),
						buildPager: function(slideIndex){
								switch (slideIndex){
									case 0:
										return '<li style="cursor: pointer; " rel="0" class="carousel_itemList"><span class="hide">1</span></li>';
									case 1:
										return '<li style="cursor: pointer; " rel="1" class="carousel_itemList"><span class="hide">1</span></li>';
									case 2:
										return '<li style="cursor: pointer; " rel="2" class="carousel_itemList"><span class="hide">1</span></li>';

								}
						}
					});
				

				$('#points-guage').gauge('init', {
						value: 0,
						valueFormat: function(a,b){return '';},
						label: 'Newbie',
						unitsLabel: '',
						min: 0,
						max: 20000,
						majorTicks: 4,
						minorTicks: 3, // small ticks inside each major tick
						yellowFrom: 5000,
						yellowTo: 15000,
						greenFrom: 15000,
						greenTo: 20000
					});
				
				// job queue so points are adding smoothly
				/*
                displaypoints = function  () {
					//console.log ('incrementpoints: running with index : ' + incrementpoints_idx);
					var incit = incrementpoints[incrementpoints_idx];
					if (incit) {
						//console.log ('incrementpoints: from : ' +incit.from+ ' to : ' + incit.to);
						incrementpoints_idx++;
					
					}
				}
				setInterval(displaypoints, 3000);
				*/
		
				return false;
		};
        
        var oldpoints = 0;
        function setPoints (points) {
            
			$('.timer').countTo({
					from: oldpoints,
					to: points,
					speed: 1000,
					refreshInterval: 10 });
    		$('#points-guage').gauge('setValue', points); 
            oldpoints = points;           
        }
        
        function getTargetWidth() {
            if ($(window).width() <= 480)
                return  '99%'; 
            else if ($(window).width() <= 700)
                return  '95%'; 
            else 
                 return  '60%'; 
            
        }

		function launchknowledge (e) {
			var kid = e.data.itm;
			var kdata = e.data.itmdata;

			$("#event-container").empty();
			
			if (kdata.knowledgedata.type == 'EMBEDDED_IFRAME') {
				var _utLayOut = $("<iframe/>").attr({ "width": "100%", "height": "400px", "src": kdata.knowledgedata.url, "frameborder":"0", "allowfullscreen":""});
				$("#event-container").append(_utLayOut);
			}
			
			if (kdata.knowledgedata.type == 'HTML5_VIDEO') {
				var _vLayOut = $("<div/>", { "style": "text-align:center;" }).append( 
                    $("<video/>").attr({"id": "video-container", "height": "300",  "controls": "controls"}).append( 
					$("<source/>").attr({"src": kdata.knowledgedata.url, "type": 'video/mp4'}),
					$("<span/>").text("Your browser does not support the video tag.")));
	            $("#event-container").append(_vLayOut);
            }
			var tw = getTargetWidth();
            $("#jdialog").dialog ({ 
                title: kdata.name,
                modal: true, 
                width: tw,
				buttons: {},
				open: function(event, ui) {
					$(this).closest('.ui-dialog').find('.ui-dialog-titlebar-close').show();
				}, 
				beforeClose: function() {
                        if ($("#video-container")[0])
                            $("#video-container")[0].pause();
						$("#event-container").empty();
    			}
            });
            
            return true;
                
			
		}
        
		function launchquiz (e) {
            var quizid = e.data.itm;
			var itemdata = e.data.itmdata;
            
			var options = {
				title: itemdata.name,
				intro: '<p>' + itemdata.intro  +
				', You receive ' + itemdata.desc + ' points for getting 100% in this Quiz</p>' +
				'<p>REMEBER - Its ONLY your <bold>1st</bold> attempt that reward you the points, so make sure you use the knowledge!</p>' + 
				'<p>you will still need to get 100% in the quiz to unlock more content (have as many attempts as you need)</p>', 
				disableDelete: false,
				disableRestart: true,
				statusUpdate: function( quizInfo, currQuiz ){
						if (quizInfo.deleted == true) {
							$.post( _serverurl+'donequiz', { id: quizid,  score: quizInfo.score, quesTried: quizInfo.quesTried},
								function( data ) {
										//$.modal.close();
                                        setPoints(data.points);
                                        $("#jdialog").dialog( "close" );
								});
						}
			}};

			$("#event-container").empty();
			$("#event-container").jQuizMe( itemdata.quizdata, options );
            
			//$('#basic-modal-content').modal({ close : false});
            var tw = getTargetWidth();
            $("#jdialog").dialog ({ 
                title: itemdata.desc,
                modal: true, 
                width: tw,
                buttons: {},
				open: function(event, ui) {
					$(this).closest('.ui-dialog').find('.ui-dialog-titlebar-close').hide();
				}
                });

			return true;
		}
		
        function launchtraining (e) {
			var tid = e.data.itm;
			var itemdata = e.data.itmdata;
			$("#event-container").empty();

			var showcalendar = false;
			if (e.target.className == 'onclick_trainingFeed') {

				$("#event-container").append(
					$("<p/>").css('font-weight','bold').text('Chat with the folks on the course, here they are'),
					$("<div/>", {"id": "feed-container", "style": "background: white;"}));
                
				$('#feed-container').chatter({
					serverurl: _serverurl,
					feedid: tid,
					fullname: _userdata.fullname,
					user_pic: _userdata.picture_url,
					outlet: _userdata.outlet.name,
					feedtopostid: tid
				});
			} 
			else 
			{
				showcalendar = true;
				$("#event-container").fullCalendar({
					// put your options and callbacks here
					 weekends: false,
					 defaultView: 'agendaWeek',
					 height: 401,
					 events: [
							{
								title  : itemdata.name,
								start  : '2012-04-16 12:30:00',
								end    : '2012-04-16 14:30:00',
								allDay : false // will make the time show
							},
							{
								title  : itemdata.name,
								start  : '2012-04-18 15:30:00',
								end    : '2012-04-18 17:30:00',
								allDay : false // will make the time show
							},
							{
								title  : itemdata.name,
								start  : '2012-04-20 09:30:00',
								end    : '2012-04-20 11:30:00',
								allDay : false // will make the time show
							}
						],
					eventClick: function(calEvent, jsEvent, view) {
            
						if (confirm('Event: ' + calEvent.title + ' on '+ calEvent.start +' would you like to book?')) {
							$(this).css('border-color', 'red');
							//alert ('posting ' + tid + ' : ' + calEvent.start);
							$.post( _serverurl+'booktraining', { tid: tid, tdate: calEvent.start.toString()},
								function() {
									$("#event-container").empty();
									$("#jdialog").dialog( "close" );
								});

						}

						// change the border color just for fun

					}
				});
                
				
				$("#event-container").prepend(
					$("<p/>").css('font-weight','bold').text(itemdata.desc),
					$("<p/>").css({'font-weight': 'bold', 'color': 'red'}).text('Book your place now!, there are ' + itemdata.info + ' people booked')
					);

				//$('#event-container').fullCalendar('option', 'height', 400);
				
			
			}

						
			var tw = getTargetWidth();
			$("#jdialog").dialog ({ 
				title: itemdata.name,
				modal: true, 
				width: tw,
				buttons: {},
				open: function(event, ui) {
					$(this).closest('.ui-dialog').find('.ui-dialog-titlebar-close').show();
				}, 
				beforeClose: function() {											
					$("#event-container").empty();
    			}
            });

			if (showcalendar) $('#event-container').fullCalendar( 'render' );
		}
		
        
        
		//var mypoints = 0;
		//var incrementpoints = [];
		//var incrementpoints_idx = 0;
		

		
		var lasteventprocessed = 0;		
		var poll_err = false;		
		
		function poll(){
			console.log("----- poll("+(new Date()).toString()+") function started");
			if (!poll_err) {
				var longpollidx = lasteventprocessed;
				console.log("----- poll("+(new Date()).toString()+") creating ajax request for " + longpollidx);
				$.ajax({ 
					url: _serverurl+'longpoll/' + longpollidx, 
					cache: false,
					success: function(res){
						console.log ('----- poll('+(new Date()).toString()+') success() poll response for ' + longpollidx);
                        lasteventprocessed++;
                        for (var i in res) {
                            var event = res[i];
                            console.log ('----- poll('+(new Date()).toString()+') success() poll :  response data ' + event.item_type + ' response idx ' + event.item_id);
    						if (event.item_type == 'QUIZ' || event.item_type == 'KNOWLEDGE' || event.item_type == 'TRAINING') {
    							console.log ('----- poll('+(new Date()).toString()+') got event, incrementing lasteventprocessed to : ' +  event.index);
    						    // lasteventprocessed = res.index;
    
    							var itemid = $('#' + event.item_id);
    							if (itemid.length == 0) {
    								// not on the page, create!
    								if (event.item_type == 'QUIZ') {
    									itemid = $('#quiz-template').clone().attr({"id": event.item_id }).removeAttr("style").appendTo("#quizList").on('click', {itm: event.item_id, itmdata: event.item_data}, launchquiz )
                                            .find(".itemName").text(event.item_data.name).end().find(".itemDesc").text(event.item_data.desc).end();
    
    								} else if (event.item_type == 'KNOWLEDGE') {
    									
    									if (!event.item_data.icon)  event.item_data.icon = 'images/icons/knowledge-icon.gif';
    									itemid = $('#knowledge-template').clone().attr({"id": event.item_id }).removeAttr("style").appendTo("#knowledgeList").on('click', {itm: event.item_id, itmdata: event.item_data}, launchknowledge)
    										.find(".itemName").text(event.item_data.name).end().find(".itemDesc").text(event.item_data.desc).end()
    										.find(".itemResults").text(event.item_data.info).end()
    										.find(".quizImage").attr({"src": event.item_data.icon}).end()
    										.find(".knowRating").jRating({type: "small", isDisabled: true, defaultscore: 40});								
    								} else if (event.item_type == 'TRAINING') {
        								itemid = $('#training-template').clone().attr({"id": event.item_id }).removeAttr("style").appendTo("#trainingList").on('click', {itm: event.item_id, itmdata: event.item_data}, launchtraining)
    										.find(".itemName").text(event.item_data.name).end().find(".itemDesc").text(event.item_data.desc).end();
    								}
    								
    							}
    							if (event.item_type == 'QUIZ') {
    								if (event.results_data) {
    									$(itemid).find(".itemResults").text('attp: ' + event.results_data.attempts + ' | first attempt (best) '+event.results_data.score+'% ('+event.results_data.bestscore+'%)').end();
    									if (event.results_data.passed) {
    										$(itemid).find(".quizPass").removeAttr("style");
    									}
    								} else {
    									$.jGrowl("<p>New " + event.item_type + " for you<\p>" + event.item_data.name);
    									$(itemid).find(".itemResults").text(event.item_data.points + ' points available!').end();
    								}
    							} else if (event.item_type == 'TRAINING') {
        							if (event.results_data) {
                                        //alert ('training results data :' + res.item_id + ' : ' + JSON.stringify(res.results_data));
    									$(itemid).find(".itemResults").text(event.results_data.type);
    									$(itemid).find(".quizPass").show();
    									//$(itemid).find("img.onclick_trainingFeed").click ({itm: res.item_id}, trainingfeed);
    								} else {
    									$.jGrowl("<p>New " + event.item_type + " for you<\p>" + event.item_data.name);
    									$(itemid).find(".itemResults").text('click for more information and to book a place!').end();
    								}
    							}
    					
    							//incrementpoints.push( { from: mypoints, to: event.my_points });
    							//mypoints = event.my_points;
    
    						}
                        }
						console.log ('----- poll('+(new Date()).toString()+') success finished :  for ' + longpollidx);
					}, 
					error: function(XMLHttpRequest, textStatus, errorThrown){
							poll_err = true;
                            console.log ('----- poll() error() : connection lost, try again : ' + textStatus + ' :: ' + JSON.stringify(errorThrown));
							$.jGrowl("conecting with server...");
						}, 
					dataType: "json",
		
					complete: function () {
							console.log ('----- poll() complete() :  ' + longpollidx +  ' : calling poll again');
							//setTimeout (poll, 5);
							poll();
						}, 

					timeout: 60000 
				});
			}
			return false;
		}
        
        
        
// JAVASCRIPT WIZDOM
// By declaring the function literal in the same scope as the 'e' local variable, 
// the function becomes a closure that has access to that local variable.

	function logmein(e) {
	
    	_serverurl = e.data.serverurl;
    	$.support.cors = true;
    	// if ('undefined' !== typeof netscape) netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
    	$.post(_serverurl+'ajaxlogin',{username: e.data.username , password: e.data.password} , function(data) { showhome(data, e.data); }, 'json')
            .error(function(e) { $('#logerrors').text(e.responseText); });
        return false;
	 }
     

    function checklogin(e) {
	
    	_serverurl = e.serverurl;
    	$.support.cors = true;
    	$.get(_serverurl+'ajaxlogin', function(data) { showhome(data, e); }, 'json')
            .error(function(e) { $('#logerrors').text(e.responseText); });
        return false;
	}
     
     
    function showhome (serverdata, localdata) {
    	console.log ('returned from the server ' + JSON.stringify(serverdata));
        
    	if (serverdata.username) {
    		_userdata = serverdata.userdata;
    
    		if (localdata.targetdiv) {
    			localdata.targetdiv.empty();
    			var urltarget = _serverurl+'home.html';
    			console.log ('loading ' + urltarget);
    			localdata.targetdiv.load (urltarget, function() {
    
                    location.hash = 'home';
                    
    				$('body').removeAttr('style');
    				$('#myuserName').text( _userdata.fullname);
    				$('#myimage').attr ({'src': _userdata.picture_url});
    				$('#myoutletimage').attr ({'src': _userdata.outlet.picture_url});
    				$('#userOrg1').text( _userdata.outlet.name);
    				$('#userOrg2').text( _userdata.outlet.name);
    
    				
    				initPoints ();
                    //incrementpoints.push( { from: mypoints, to: _userdata.points });
        			//mypoints = _userdata.points;
                    
                    setPoints(_userdata.points);
    				
    				$('#chatterdiv').chatter({
    					serverurl: _serverurl,
    					feedid: 'me',
    					fullname: _userdata.fullname,
    					user_pic: _userdata.picture_url,
    					outlet: _userdata.outlet.name,
    					feedtopostid: _userdata.outlet.id
    				});
    				console.log ('addEventListener deviceready');
    				document.addEventListener("deviceready", function() { console.log ('deviceready'); $('#chatterdiv').data('chatter').setmobileattachments(); } , false);
    				
    				
    				$(window).resize(function() {
    					if ($("#jdialog").dialog( "isOpen" )) {
    						$("#jdialog").dialog("option", "position", "center");
    						var cw = $("#jdialog").dialog( "option", "width" );
    						var tw = getTargetWidth();
    						if (cw != tw) 
    							$("#jdialog").dialog( "option", "width", tw );
    					}
    	
    				});
    
    				//if (serverdata.current_index > 0) {
    				//	lasteventprocessed = serverdata.current_index;
    				//}
    				//alert ('launching poll with ' + lasteventprocessed);
    				poll();
    				
    			});
    		}
    
    	} else {
    		$('#logerrors').text (serverdata.message);
        }
    }
            
            