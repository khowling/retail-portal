    	
		
        // DONT CRASH IN IE
        if (typeof console == "undefined") var console = { log: function() {} };
        
        
        var _serverurl;
		var _userdata;
		
        function initPoints () {
				var slider = $('#slider1').bxSlider({
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
				
                
                // LOGIN
				// $('#login-content').modal( { close : false});
                
                
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
				displaypoints = function  () {
					//console.log ('incrementpoints: running with index : ' + incrementpoints_idx);
					var incit = incrementpoints[incrementpoints_idx];
					if (incit) {
						//console.log ('incrementpoints: from : ' +incit.from+ ' to : ' + incit.to);
						incrementpoints_idx++;
						jQuery(function($) {
											$('.timer').countTo({
													from: incit.from,
													to: incit.to,
													speed: 1000,
													refreshInterval: 10,
													onComplete: function(value) {
															//console.debug(this);
													}
											});
									});
						$('#points-guage').gauge('setValue', incit.to); 
					}
				}
				setInterval(displaypoints, 3000);
				
		
				return false;
		};
        
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
				var _vLayOut = $("<video/>").attr({"id": "video-container", "height": "300",  "controls": "controls"}).append( 
					$("<source/>").attr({"src": kdata.knowledgedata.url, "type": 'video/mp4'}),
					$("<span/>").text("Your browser does not support the video tag."));
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
        
		function launchquiz (quizid, itemdata) {
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
								start  : '2012-03-19 12:30:00',
								end    : '2012-03-19 14:30:00',
								allDay : false // will make the time show
							},
							{
								title  : itemdata.name,
								start  : '2012-03-21 15:30:00',
								end    : '2012-03-21 17:30:00',
								allDay : false // will make the time show
							},
							{
								title  : itemdata.name,
								start  : '2012-03-23 09:30:00',
								end    : '2012-03-23 11:30:00',
								allDay : false // will make the time show
							}
						],
					eventClick: function(calEvent, jsEvent, view) {
            
						if (confirm('Event: ' + calEvent.title + ' on '+ calEvent.start +' would you like to book?')) {
							$(this).css('border-color', 'red');
								alert ('posting ' + tid + ' : ' + calEvent.start);
								$.post( _serverurl+'booktraining', { tid: tid, tdate: calEvent.start},
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
		
        
        
		var mypoints = 0;
		var incrementpoints = [];
		var incrementpoints_idx = 0;
		

		
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
						console.log ('----- poll('+(new Date()).toString()+') success : poll response for ' + longpollidx +  ' :  response data ' + res.item_type + ' response idx ' + res.index);
						if (res.item_type == 'QUIZ' || res.item_type == 'KNOWLEDGE' || res.item_type == 'TRAINING') {
							console.log ('----- poll('+(new Date()).toString()+') got event, incrementing lasteventprocessed to : ' +  res.index);
							lasteventprocessed = res.index;

							var itemid = $('#' + res.item_id);
							if (itemid.length == 0) {
								// not on the page, create!
								if (res.item_type == 'QUIZ') {
									itemid = $('#quiz-template').clone().attr({"id": res.item_id }).removeAttr("style").appendTo("#quizList").on('click', function(e) {
										launchquiz (res.item_id, res.item_data);
										 return false;
									}).find(".itemName").text(res.item_data.name).end().find(".itemDesc").text(res.item_data.desc).end();

								} else if (res.item_type == 'KNOWLEDGE') {
									
									if (!res.item_data.icon)  res.item_data.icon = 'images/icons/knowledge-icon.gif';
									itemid = $('#knowledge-template').clone().attr({"id": res.item_id }).removeAttr("style").appendTo("#knowledgeList").on('click', {itm: res.item_id, itmdata: res.item_data}, launchknowledge)
										.find(".itemName").text(res.item_data.name).end().find(".itemDesc").text(res.item_data.desc).end()
										.find(".itemResults").text(res.item_data.info).end()
										.find(".quizImage").attr({"src": res.item_data.icon}).end()
										.find(".knowRating").jRating({type: "small", isDisabled: true, defaultscore: 40});								
								} else if (res.item_type == 'TRAINING') {
    								itemid = $('#training-template').clone().attr({"id": res.item_id }).removeAttr("style").appendTo("#trainingList").on('click', {itm: res.item_id, itmdata: res.item_data}, launchtraining)
										.find(".itemName").text(res.item_data.name).end().find(".itemDesc").text(res.item_data.desc).end();
								}
								
							}
							if (res.item_type == 'QUIZ') {
								if (res.results_data) {
									$(itemid).find(".itemResults").text('attp: ' + res.results_data.attempts + ' | first attempt (best) '+res.results_data.score+'% ('+res.results_data.bestscore+'%)').end();
									if (res.results_data.passed) {
										$(itemid).find(".quizPass").removeAttr("style");
									}
								} else {
									$.jGrowl("<p>New " + res.item_type + " for you<\p>" + res.item_data.name);
									$(itemid).find(".itemResults").text(res.item_data.points + ' points available!').end();
								}
							} else if (res.item_type == 'TRAINING') {
    							if (res.results_data) {
                                    //alert ('training results data :' + res.item_id + ' : ' + JSON.stringify(res.results_data));
									$(itemid).find(".itemResults").text(res.results_data.type);
									$(itemid).find(".quizPass").show();
									//$(itemid).find("img.onclick_trainingFeed").click ({itm: res.item_id}, trainingfeed);
								} else {
									$.jGrowl("<p>New " + res.item_type + " for you<\p>" + res.item_data.name);
									$(itemid).find(".itemResults").text('click for more information and to book a place!').end();
								}
							}
					
							incrementpoints.push( { from: mypoints, to: res.my_points });
							mypoints = res.my_points;

						}
						console.log ('----- poll('+(new Date()).toString()+') success finished :  for ' + longpollidx +  ' :  response data ' + res.item_type + ' response idx ' + res.index);
					}, 
					error: function(XMLHttpRequest, textStatus, errorThrown){
							console.log ('----- poll() error() : got an error');
							poll_err = true;
							$.jGrowl("connection with server lost  (" + JSON.stringify(errorThrown) + ")");
						}, 
					dataType: "json",
		
					complete: function () {
							console.log ('----- poll() complete() :  ' + longpollidx +  ' : calling poll again');
							setTimeout (poll, 5);
							
						}, 

					timeout: 60000 
				});
			}
			return false;
		}
        
        
	function logmein(e) {
	
			_serverurl = e.data.serverurl;
			$.support.cors = true;
			// if ('undefined' !== typeof netscape) netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
			$.post(_serverurl+'ajaxlogin',{username: e.data.username , password: e.data.password} ,
				function(data) {
					console.log ('returned from the server ' + JSON.stringify(data));
					if (data.username) {
						_userdata = data.userdata;

						if (e.data.targetdiv) {
							e.data.targetdiv.empty();
							var urltarget = _serverurl+'home.html';
							console.log ('loading ' + urltarget);
							e.data.targetdiv.load (urltarget, function() {
	 
								$('body').removeAttr('style');
								$('#myuserName').text( _userdata.fullname);
								$('#myimage').attr ({'src': _userdata.picture_url});
								$('#myoutletimage').attr ({'src': _userdata.outlet.picture_url});
								$('#userOrg1').text( _userdata.outlet.name);
								$('#userOrg2').text( _userdata.outlet.name);

								
								initPoints ();
								
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
			
								if (data.current_index > 0) {
									lasteventprocessed = data.current_index;
								}
								//alert ('launching poll with ' + lasteventprocessed);
								poll();
								
							});
						}

					} else {
						$('#logerrors').text (data.message);
					 }
				}, 'json').error(function(e) { $('#logerrors').text("POST error " + JSON.stringify(e)); });
			  return false;
	 }
            
            