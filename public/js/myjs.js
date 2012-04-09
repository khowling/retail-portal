    	
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

		function launchknowledge (kid, kdata) {
			$("#event-container").empty();
			
			if (kdata.knowledgedata.type == 'EMBEDDED_IFRAME') {
				var _utLayOut = $("<iframe/>").attr({ "width": "100%", "height": "400px", "src": kdata.knowledgedata.url, "frameborder":"0", "allowfullscreen":""});
				$("#event-container").append(_utLayOut);
				/*
                $('#basic-modal-content').modal({ 
						close : true,
						onClose: function() {
							$("#event-container").empty();
							$.modal.close();
					}});
				*/
                //return true;
			}
			
			if (kdata.knowledgedata.type == 'HTML5_VIDEO') {
				var _vLayOut = $("<video/>").attr({"id": "video-container", "height": "300",  "controls": "controls"}).append( 
					$("<source/>").attr({"src": kdata.knowledgedata.url, "type": 'video/mp4'}),
					$("<span/>").text("Your browser does not support the video tag."));
	            $("#event-container").append(_vLayOut);
                
                /*
                $('#basic-modal-content').modal({ 
						close : true,
						onClose: function() {
							$("#video-container")[0].pause();
							$("#event-container").empty();
							$.modal.close();
					}});
                */
				//return true;
            }
			var tw = getTargetWidth();
            $("#jdialog").dialog ({ 
                title: kdata.name,
                modal: true, 
                width: tw,
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
							$.post( 'http://nokiaknowledge2.herokuapp.com/donequiz', { id: quizid,  score: quizInfo.score, quesTried: quizInfo.quesTried},
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
		
        function trainingfeed (e) {
            $("#event-container").empty();
            $("#event-container").append(
                $("<p/>").css('font-weight','bold').text('Chat with the folks on the course, here they are'),
                $("div/").attr("id", "feed-container"));
                
            var trainingid = e.data.itm;
            //$('#feed-container').load('/chat/' + trainingid);
            $('#feed-container').chatter({
				fullname: urlquery.fullname,
				user_pic: urlquery.user_pic,
				outlet: urlquery.outlet,
				feedid: trainingid
			});
			
            var tw = getTargetWidth();
            $("#jdialog").dialog ({ 
                title: 'Training Feed',
                modal: true, 
                width: tw,
				open: function(event, ui) {
					$(this).closest('.ui-dialog').find('.ui-dialog-titlebar-close').show();
				}, 
				beforeClose: function() {
                        $("#event-container").empty();
    			}
                });
            
			return true;
            
        }

        function launchtraining (tid, itemdata) {


			$("#event-container").empty();
           
                
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
                            //alert ('posting ' + tid + ' : ' + calEvent.start);
                            $.post( 'http://nokiaknowledge2.herokuapp.com/booktraining', { tid: tid, tdate: calEvent.start },
    							function() {
                                    $("#event-container").empty();
    								$("#jdialog").dialog( "close" );
    							});

                    }

                    // change the border color just for fun
                    
            
                }
            });
            //
            
			//$('#basic-modal-content').modal({ close : false});
            var tw = getTargetWidth();
            $("#jdialog").dialog ({ 
                title: itemdata.name,
                modal: true, 
                width: tw,
                 buttons: {                   
    				Close: function() {
						//$("#event-container").fullCalendar( "destroy" );
    					$("#jdialog").dialog( "close" );
    				}
                }
                });
            $("#event-container").prepend(
                $("<p/>").css('font-weight','bold').text(itemdata.desc),
                $("<p/>").css({'font-weight': 'bold', 'color': 'red'}).text('Book your place now!, there are ' + itemdata.info + ' people booked')
                );
                
            //$('#event-container').fullCalendar('option', 'height', 400);
            $('#event-container').fullCalendar( 'render' );
			return true;
		}
		
        
        
		var mypoints = 0;
		var incrementpoints = [];
		var incrementpoints_idx = 0;
		

		
		var lasteventprocessed = 0;		
		var poll_err = false;		
		
		function poll(){
			if (!poll_err) {
				//console.log("creating longpoll request");
				$.ajax({ 
					url: "http://nokiaknowledge2.herokuapp.com/longpoll/" + lasteventprocessed, 
					success: function(res){
						//alert ('success ' + JSON.stringify(res));
						if (res.item_type == 'QUIZ' || res.item_type == 'KNOWLEDGE' || res.item_type == 'TRAINING') {
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
									itemid = $('#knowledge-template').clone().attr({"id": res.item_id }).removeAttr("style").appendTo("#knowledgeList").on('click', function(e) {
										launchknowledge (res.item_id, res.item_data);
										 return false;
									}).find(".itemName").text(res.item_data.name).end().find(".itemDesc").text(res.item_data.desc).end()
										.find(".itemResults").text(res.item_data.info).end()
										.find(".quizImage").attr({"src": res.item_data.icon}).end()
										.find(".knowRating").jRating({type: "small", isDisabled: true, defaultscore: 40});								
								} else if (res.item_type == 'TRAINING') {
    								itemid = $('#training-template').clone().attr({"id": res.item_id }).removeAttr("style").appendTo("#trainingList").on('click', function(e) {
										launchtraining (res.item_id, res.item_data);
										 return false;
									}).find(".itemName").text(res.item_data.name).end().find(".itemDesc").text(res.item_data.desc).end();
								}
								$.jGrowl("<p>New " + res.item_type + " for you<\p>" + res.item_data.name);
							}
							if (res.item_type == 'QUIZ') {
								if (res.results_data) {
									$(itemid).find(".itemResults").text('attp: ' + res.results_data.attempts + ' | first attempt (best) '+res.results_data.score+'% ('+res.results_data.bestscore+'%)').end();
									if (res.results_data.passed) {
										$(itemid).find(".quizPass").removeAttr("style");
									}
								} else {
									$(itemid).find(".itemResults").text(res.item_data.points + ' points available!').end();
								}
							} else if (res.item_type == 'TRAINING') {
    							if (res.results_data) {
                                    //alert ('training results data :' + res.item_id + ' : ' + JSON.stringify(res.results_data));
									$(itemid).find(".itemResults").text(res.results_data.type);
									$(itemid).find(".quizPass").show();
									$(itemid).find("img.onclick_trainingFeed").click ({itm: res.item_id}, trainingfeed);
								} else {
									$(itemid).find(".itemResults").text('click for more information and to book a place!').end();
								}
							}
					
							incrementpoints.push( { from: mypoints, to: res.my_points });
							mypoints = res.my_points;

						}
					}, 
					error: function(XMLHttpRequest, textStatus, errorThrown){
							
							poll_err = true;
							$.jGrowl("error: connection with server lost  (" + JSON.stringify(errorThrown) + ")");
						}, 
					dataType: "json", 
					complete: poll, 
					timeout: 60000 
				});
			}
		}
        
        
        /*
        
        $("#logmein").submit(function(event) {
    		
				event.preventDefault(); 
						
				// get some values from elements on the page: 
				var $form = $( this ),
						un = $form.find( 'input[name="username"]' ).val(),
						url = $form.attr( 'action' );
						if (!un) {
							//alert ('Please enter username');
							 un = 'keith';
						}
				// Send the data using post and put the results in a div 
				$.post( url, { username: un },
					function( data ) {
						
						// data.userdata.points
						// data.username
						
							var _userOut = $("<img/>").attr({"src": data.userdata.picture_url, "width": "75", "style": "margin: 5px;"});
							$("#userImage").append(_userOut);
							$("#myuserName").text(data.username);
												
							$("#userOrg1").text("Carphone Warehouse - Slough");
							$("#userOrg2").text("Carphone Warehouse - Slough");
							
							var _orgOut = $("<img/>").attr({"src": "/images/carphone_warehouse.jpg", "width": "55"});
							$("#orgImage").append(_orgOut);
							
							
							$.modal.close();
							
							$('#chatterdiv').load('/2.html');
							poll();
					});

			});
            
         */   
            
            