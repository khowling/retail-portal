    	
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
			var tw = getTargetWidth();
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
				var _vLayOut = $("<video/>").attr({"id": "video-container", "width": "100%", "height": "100%", "controls": "controls"}).append( 
					$("<source/>").attr({"src": kdata.knowledgedata.url, "type": "video/mp4"}),
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
            $("#jdialog").dialog ({ 
                title: kdata.name,
                modal: true, 
                width: tw,
                buttons: {               	
    				Cancel: function() {
                        if ($("#video-container")[0])
                            $("#video-container")[0].pause();
						$("#event-container").empty();
    					$("#jdialog").dialog( "close" );
    				}
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
							$.post( '/donequiz', { id: quizid,  score: quizInfo.score, quesTried: quizInfo.quesTried},
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
                buttons: {}
                });

			return true;
		};
		
		
		var mypoints = 0;
		var incrementpoints = [];
		var incrementpoints_idx = 0;
		

		
		var lasteventprocessed = 0;		
		var poll_err = false;		
		
		function poll(){
			if (!poll_err) {
				//console.log("creating longpoll request");
				$.ajax({ 
					url: "/longpoll/" + lasteventprocessed, 
					success: function(res){
						if (res.item_type == 'QUIZ' || res.item_type == 'KNOWLEDGE') {
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
									
									if (!res.item_data.icon)  res.item_data.icon = '/image/icons/knowledge-icon.gif';
									itemid = $('#knowledge-template').clone().attr({"id": res.item_id }).removeAttr("style").appendTo("#knowledgeList").on('click', function(e) {
										launchknowledge (res.item_id, res.item_data);
										 return false;
									}).find(".itemName").text(res.item_data.name).end().find(".itemDesc").text(res.item_data.desc).end()
										.find(".itemResults").text(res.item_data.info).end()
										.find(".quizImage").attr({"src": res.item_data.icon}).end()
										.find(".knowRating").jRating({type: "small", isDisabled: true, defaultscore: 40});								
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
							
							var _orgOut = $("<img/>").attr({"src": "/image/carphone_warehouse.jpg", "width": "55"});
							$("#orgImage").append(_orgOut);
							
							
							$.modal.close();
							
							$('#chatterdiv').load('/2.html');
							poll();
					});

			});
            
         */   
            
            