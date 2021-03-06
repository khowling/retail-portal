
// Whether you define a function like 'function foo(){}' or 'var foo = function(){}'   (a Function Declaration)
// what you end up with is an 'Identifier' for a function, that you can invoke by putting parens (parentheses, ()) after it,
// like 'foo()'

// A a function expression is a function without a Identifier that is 'executed' not 'declared'. 
//(executing a functions create a new execution context containing private varabiles and functions)
// '(function(){ /* code */ })()'   // this is a function expression that is immediatley invoked

// IIFE
// pass jQuery 'jQuery' to an IIFE (Immediately Invoked Function Expression) 
// that maps it to the dollar sign so it can't be overwritten by another library in the scope of its execution

// INVOKING
// $('#element').chatter({
//  'location' : 'left'
// });

(function( $ ) {

    $.chatter = function(element, options) {
	
		//alert (JSON.stringify (options));
		var defaults = {};
    var plugin = this;
		

    plugin.settings = {};
		plugin.feedmembers = {};
		

    var $element = $(element),
        element = element;

    var init = function() {
      plugin.settings = $.extend({}, defaults, options);
			
			_serverurl = plugin.settings.serverurl;
			plugin.lastitemdate = null;
			
			// delegated events : html doesnt need to be on the page
			$element.on('click', 'a.lnkfileUpload', compUploadClick);  
			$element.on('click', 'input.imgbtnShare', addPosting);
			$element.on('click', 'a.aCloseClick' , imgCloseClick);
			$element.on('change', 'input.fplUpload' , getNameFromPath);
			$element.on('click', 'input.imgBtnShareFrmComp' , addPostingWithPic);
			$element.on('click', 'input.imgbtnFrmSP' , imgbtnShare_Click);
			$element.on('click', 'div.newFeedItemsMessage' , loadfeeds);
			
			$element.load (_serverurl+'chat.html', function () {

				// DROPDOWN
				$("span.selected_feed", $element).text(plugin.settings.outlet);
				$("a.option1_feed", $element).text(plugin.settings.outlet);	
				$(".click_filterVisibility",$element).on ('click' , filterVisibility);
				// NEW COMMENT 
				$("img.imgCommentNew", $element).attr ({'src' : plugin.settings.user_pic});
				loadfeeds();
//				setInterval (checkfornewfeeds, 20 *1000);
			});
    }

		   
		// private properties and methods
		var _serverurl;
	
		var filterVisibility = function () {
			$("div.drop_down_listMyChatter", $element).toggle();
		}
		var parseChatterDate = function (strdate) {
				
				var debugs = 'string : '  + strdate;
				var timestamp = new Date(Date.parse(strdate));
				//alert ('parsing : ' + itm.createdDate + ', standard function = ' + timestamp.toString());
				// https://github.com/csnover/js-iso8601/blob/master/iso8601.js
				var struct, minutesOffset = 0;
				var numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
				// 1 YYYY 2 MM 3 DD 4 HH 5 mm 6 ss 7 msec 8 Z 9 � 10 tzHH 11 tzmm
				if (strdate.match(/\.000\+0000$/)) {
					strdate = strdate.replace(/\.000\+0000$/, '.000Z');
					//alert ('new string ' + itm.createdDate);
				}
				if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(strdate))) {
					// avoid NaN timestamps caused by �undefined� values being passed to Date.UTC
					for (var i = 0, k; (k = numericKeys[i]); ++i) {
						struct[k] = +struct[k] || 0;
					}
	
					// allow undefined days and months
					struct[2] = (+struct[2] || 1) - 1;
					struct[3] = +struct[3] || 1;
	
					if (struct[8] !== 'Z' && struct[9] !== undefined) {
						minutesOffset = struct[10] * 60 + struct[11];
	
						if (struct[9] === '+') {
							minutesOffset = 0 - minutesOffset;
						}
					}
					
					timestamp = new Date(Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]));
					debugs += '\n UTC ' + struct[1] + ' : ' + struct[2]+ ' : ' + struct[3] + ' : ' +  struct[4] + ' : ' + struct[5]+ ' : ' + struct[6] + ' : ' + struct[7] + ' :DATE: ' + timestamp.toString() + ' :NOW: ' + new Date().toString();
				}
				return timestamp;
		}
		
		var processsfdcfeeditem = function  (itm) {
			//console.log ('processsfdcfeeditem :' + itm.body.text);
			var posttxt = itm.body.text.split(": ");
			
			var ret = {};
			if (posttxt.length < 2) {
				ret = { pic: 'images/NokiaLogo.gif', author: 'Nokia', ptxt: posttxt[0] };
			} else {
				var pauthor = posttxt[0];
				ret = { pic: plugin.feedmembers[pauthor].pic, author: pauthor, ptxt: posttxt[1] };
			} 
			var timestamp = parseChatterDate(itm.createdDate);
			if (plugin.lastitemdate == null || plugin.lastitemdate < timestamp) plugin.lastitemdate = timestamp;
			ret.ctime = $.cuteTime({}, timestamp.toString());// + ' ::: ' + debugs;  
			ret.id = itm.id;
			return ret;
		}
		
		
		var newfeeddom = function  (itm) {
			//console.log ('newfeeddom');
			var post = processsfdcfeeditem(itm);
			//console.log ('creating feed-post with ' + JSON.stringify(post));
			var newpost = $('tr.feed-post-template', $element).clone();
			newpost = newpost.attr({"id": itm.id }).removeAttr('style').removeClass('feed-post-template').addClass('feed-post')
				.find('.spanFeed').text(post.ptxt).end()
				.find('.aFeedAuthor').text(post.author).end()
				.find('.pFeedAuthor').attr({"src": post.pic }).end()
				.find('.postCreatedDate').text(post.ctime).end()
				.find('a.linkComment').click({itmid : itm.id } , function (e) {
						// pressed button to comment on a feed item
						$('#'+e.data.itmid+' div.comment_feedback', $element).show();
						$('#'+e.data.itmid+' div.divCBox', $element).show();
						$('#'+e.data.itmid+' textarea.tbCommentClass', $element).focus();
					}).end()
				.find('a.linkLike').click({itmid : itm.id } , function (e) {
						// pressed button to like comment on a feed item
						var feeditem = e.data.itmid;
						// call POST
						$.post( _serverurl+'postcomment', { 'feeditem' : feeditem, 'mess' : 'like' }, function(cmt){
								var processed_cmt = processsfdcfeeditem(cmt);
								if (processed_cmt.ptxt == 'like') {
									$('#' + feeditem + ' div.comment_feedback').show();
									$('#' + feeditem + ' div.divLike', $element).show();
									var likes = $('#' + feeditem + ' label.lblLikes', $element);
									var who = processed_cmt.author;
									if (processed_cmt.author == plugin.settings.fullname) {
										who = 'me';
										$('#' + feeditem + ' a.linkLike', $element).hide();
									}
									likes.text (likes.text() + ' ' + who);
								}
							});
					}).end()	
				.find('input.imgBtnComment').click({itmid : itm.id }, function (e) {
						// pressed button to submit a new comment to a feed
						var txtComment = $('#'+e.data.itmid+' textarea.tbCommentClass', $element);
						var divEComment = $('#'+e.data.itmid+' div.divEComment', $element);
						var divDComment = $('#'+e.data.itmid+' div.divDComment', $element);
						var entercomment = $('#'+e.data.itmid+' div.divCBox', $element);
						var feeditem = e.data.itmid;
						
						if (txtComment.val().length > 1) {
							txtComment.attr("disabled", "disabled");
							divEComment.hide();
							divDComment.show()
						
						
							// call POST
							$.post( _serverurl+'postcomment', { 'feeditem' : feeditem, 'mess' : txtComment.val() }, function(cmt){
								
								divEComment.show();
								divDComment.hide();
								txtComment.removeAttr("disabled");
								txtComment.val('');
								entercomment.attr({'style': 'display: none;'});

								//var meteam = {};
								//meteam[plugin.settings.fullname] = { pic: plugin.settings.pic_url};
								//alert ('addComment ' + feeditem + ' team : ' + JSON.stringify(meteam));
								var feeditemdom = $('#' + feeditem + ' table.table_userComment', $element);
								var processed_cmt = processsfdcfeeditem(cmt);
								//alert ('creating new comment  fom for' + JSON.stringify(cmt));
								newcommentdom (processed_cmt, $('#' + feeditem)).appendTo(feeditemdom);
								
							});
						} else {
							divEComment.show();
							divDComment.hide();
							txtComment.removeAttr("disabled");
							txtComment.val('');
							entercomment.attr({'style': 'display: none;'});
						}
					}
				
				
			   ).end();
			   
			if (itm.attachment) {
				//console.log ('attachment : ' + JSON.stringify(itm.attachment));
				if (!itm.attachment.description) itm.attachment.description = '';
				var image_href = _serverurl+'feedfile?what=' + escape(itm.attachment.downloadUrl) + '&mt=' + escape(itm.attachment.mimeType);
				
				newpost.find('div.divFileInfo').removeAttr('style').end()
				.find('label.lblFileName').text(itm.attachment.title).end()
				//.find('a.aFileName').attr('src', image_href).end()  // Doesnt work
				.find('label.lblFileDesc').text(itm.attachment.description).end()
				.find('.imgFile, .aFileName').click(function () {
					
						console.log ('userAgent : ' + navigator.userAgent);
//					if (navigator.userAgent.indexOf('WP7') != -1 || navigator.userAgent.indexOf('Windows Phone') != -1) {
//						console.log ('opening ' + image_href);
//						window.open(image_href);  // doesnt work - x-domain request!
//					} else { 
						$("#event-container").empty();
						$("#event-container").append(
                            $("<div/>", { "style": "text-align:center;" }).append(
							$("<img/>", { "style": "max-width: 400px;", "src": image_href}) //.load (function (){
							));
						var tw = getTargetWidth();
						$("#jdialog").dialog ({ 
							title: 'View file ' + itm.attachment.title,
							modal: true, 
							width: tw,
							open: function(event, ui) {
								$(this).closest('.ui-dialog').find('.ui-dialog-titlebar-close').show();
							}
						});
						return false; 
//					}
				});
			}
			//alert ('created new post dom ' + newpost.html());
			return newpost;
		}
		var newcommentdom = function (cmt, newpost)  {
			
			var commenttr = $('tr.Like_box_template', newpost).clone();
			//alert ('comment ' + JSON.stringify(commenttr) + ' val ' + cmt.user.name);
			
			commenttr = commenttr.attr({"id": cmt.id, "class": "Like_box" }).removeAttr('style')
				.find('.commentAuthor').text(cmt.author).end()
				.find('.pcommentAuthor').attr({"src": cmt.pic }).end()
				.find('.spanComment').text(cmt.ptxt).end()
				.find('.commentCreatedDate').text(cmt.ctime).end();
			//alert ('created new comment com' + commenttr.html());
			return commenttr;
		}	 
		var checkfornewfeeds = function() {
			$.ajax({ 
				url: _serverurl+'myfeed/' + plugin.settings.feedid,
                cache: false,
				success: function(res){
						if (res.feed.items.length >0) {

							for (var idx in res.feed.items) {
								var itm = res.feed.items[idx];
								if (parseChatterDate(itm.createdDate) > plugin.lastitemdate) {
									$('div.newFeedItemsMessage', $element).show();
									return;
								}
								if (itm.comments.total >0){
									var comments = itm.comments.comments;
									for (var cidx in comments) {
										var cmt = comments[cidx];
										if (parseChatterDate(cmt.createdDate) > plugin.lastitemdate) {
											$('div.newFeedItemsMessage', $element).show();
											return;
										}
									}
								}	
							}
						}
					}
			});
		}
		var loadfeeds = function () {
			$('div.feed-loading', $element).show();
			$('div.newFeedItemsMessage', $element).hide();
			
			var teamlistUl = $('ul.team-list', $element);
			teamlistUl.empty();
			$('tr.feed-post', $element).remove();
			
			$.ajax({ 
				url: _serverurl+'myfeed/' + plugin.settings.feedid,
                cache: false,
				success: function(res){

					$('div.feed-loading', $element).hide();
					$('table.feed-table', $element).show();
					
					if (res.team) {

						plugin.feedmembers = res.team.outlet_team;
						for (var name in res.team.outlet_team) {
							var tm = res.team.outlet_team[name];
							var _member_layout = $("<li/>").attr({"style" : "float:left;"}).append(
							$("<div/>").attr({"style" : "text-align: center; width: 65px;"}).append(
								$("<img/>").attr({"style" : "margin: 5px;", "width": "45px", "height": "45px", "src": tm.pic}),
								$("<div/>").attr({"class" : "itemName"}).text(name),
								$("<div/>").attr({"class" : "itemResults"}).text(tm.points)
								)
							);
							teamlistUl.append(_member_layout);
						}
					}

					if (res.feed.items.length >0) {

						for (var idx in res.feed.items) {
							var itm = res.feed.items[idx];
							//alert ('creating new feed dom for ' + JSON.stringify(itm));
							var newpost = newfeeddom (itm);
							
							if (itm.comments.total >0){
								// SHOW THE COMMENT DIV HOLDER! 
								newpost.find('div.comment_feedback').show();
								var comments = itm.comments.comments;
								for (var cidx in comments) {

									var cmt = comments[cidx];
									var processed_cmt = processsfdcfeeditem(cmt);
									//alert ('creating new comment  fom for' + JSON.stringify(cmt));
									if (processed_cmt.ptxt == 'like') {
										$("div.divLike", newpost).show();
										var likes = $("label.lblLikes", newpost);
										var who = processed_cmt.author;
										//alert ('i have a like by ' + who + ' existing ' + likes.text());
										if (processed_cmt.author == plugin.settings.fullname) {
											who = 'me';
											$('a.linkLike', newpost).hide();
										}
										likes.text (likes.text() + ' ' + who);
									} else {
										newcommentdom (processed_cmt, newpost).appendTo(newpost.find('table.table_userComment'));
									}
								}
							}
							//alert ('appending newpost to feed-table');
							newpost.appendTo($('table.feed-table', $element));
						}
					}
				}
			});
		}
		var addPosting = function () {

			var divActiveNoAttach = $('div.divActiveNoAttach', $element);
			var divInactiveNoAttach = $('div.divInactiveNoAttach', $element);
			var ptxt = $('textarea.txtNewFeedStyle', $element); 
			
			divActiveNoAttach.hide();
			divInactiveNoAttach.show();
			if (ptxt.val().length > 1) {
			
				$.post( _serverurl+'post/'+plugin.settings.feedid, { 'mess' : ptxt.val() }, function(results){

					newfeeddom (results).prependTo('table.feed-table', $element);

					ptxt.val(null);
					divActiveNoAttach.show();
					divInactiveNoAttach.hide();
				});
			} else {
				ptxt.val(null);
				divActiveNoAttach.show();
				divInactiveNoAttach.hide();
			}
		}	
		/* Upload File from Computer */
		var compUploadClick = function () {
			
			$("div.divAttachFile", $element).hide();
			$("div.compUploadDiv", $element).show();
			//$("input.fplUpload", $element).focus();
		}
		var its_setup = false;
		var addPostingWithPic = function () {

			$('div.divActiveShareFrmComp').hide();
			$('div.divInactiveShareFrmComp').show();
			
			var ptxt = $('textarea.txtNewFeedStyle', $element); 
			var fname = $("input.txtFileName", $element); 
			var fdesc = $('input.txtDescription', $element); 

			if (ptxt.val().length == 0) {
				ptxt.val ('Posted a File');
			}
			if (fdesc.val().length == 0) {
				fdesc.val ('No description');
			}
			
			// Create an iframe to submit through, using a semi-unique ID
			var frame_id = 'ajaxUploader-iframe-' + Math.round(new Date().getTime() / 1000)
			$('body').after('<iframe width="0" height="0" style="display:none;" name="'+frame_id+'" id="'+frame_id+'"/>');
			$('#'+frame_id).load(function() {
				if (its_setup) {
					
					
					var response, responseStr = this.contentWindow.document.body.innerHTML;
					var r = /^\<pre(.*)\>(.*)\<\/pre\>$/
					responseStr = responseStr.match(r)[2]
					response = JSON.parse(responseStr);

		   
					// Tear-down the wrapper form
					$("input.fplUpload", $element).siblings().remove();
					$("input.fplUpload", $element).unwrap();
					its_setup = false;
					
					
					newfeeddom (response).prependTo('table.feed-table', $element);
					$('textarea.txtNewFeedStyle', $element).val(null);
					imgCloseClick();
				}
			});
			
			// Wrap it in a form
			$("input.fplUpload", $element).wrap('<form action="' + _serverurl+'post/'+plugin.settings.feedid + '" method="POST" enctype="multipart/form-data" target="'+frame_id+'" />'
			).after('<input type="hidden" name="' + 'mess' + '" value="' + ptxt.val() + '" />'+
					'<input type="hidden" name="' + 'fname' + '" value="' + fname.val() + '" />'+
					'<input type="hidden" name="' + 'fdesc' + '" value="' + fdesc.val() + '" />');
			its_setup = true; 
			$("input.fplUpload", $element).parent('form').submit();

		}
		/*  USING THIS FOR PHONEGAP */
		// properties & public method
		plugin.setmobileattachments = function() {

			$element.off('click', 'a.lnkfileUpload', compUploadClick);
			$element.on('click', 'a.lnkfileUpload', showUploadOptions);

			$element.on ('click', '.upload_camera',  function () {
					navigator.camera.getPicture(
						uploadPhoto,
						function onFail(message)   {
							alert('Error taking picture');
						},
						{sourceType : Camera.PictureSourceType.CAMERA});
				});

			$element.on ('click', '.upload_photo',  function () {
				navigator.camera.getPicture(
					uploadPhoto,
					function onFail(message)   {
						alert('Error selecting picture');
					},
					{destinationType: navigator.camera.DestinationType.FILE_URI,
                     sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY});
			});
		}
		var showUploadOptions = function () {
			$("input.txtFileName", $element).val("");
			$("div.divFileUpload", $element).show();
			$("div.divAttachFile", $element).hide(); // File & Link options against a post
		}
		var readyURI;
		var uploadPhoto = function (imageURI) {
			readyURI = imageURI;
			$("div.compUploadDiv", $element).hide(); // FILE UPLOAD FROM COMPUTER
			$("div.divFileUpload", $element).hide(); // div Mobile file upload options
			$("div.documentDiv", $element).show(); // FILE ATTACHED, ready to POST-
			var filename = readyURI.substr(readyURI.lastIndexOf('/')+1);
			
			$('span.uploadFileName', $element).text(filename);
			$('img.imgThumbNail', $element).attr ('src', imageURI);
		}
		var imgbtnShare_Click = function  () {
			$("div.divShareBtnFrmSP", $element).hide();
			$("div.divShareImgFrmSP", $element).show();
			
			var options = new FileUploadOptions();
			options.fileKey="attach";
			options.fileName=readyURI.substr(readyURI.lastIndexOf('/')+1);
			options.mimeType="image/jpeg";
			
			var ptxt = $('textarea.txtNewFeedStyle', $element);   
			if (ptxt.val().length == 0) {
				ptxt.val ('Posted a File');
			}

			
			var params = new Object();
			params.mess = ptxt.val();
			params.fname = options.fileName;
			params.fdesc = "From my Windows Phone";
			params.me = plugin.settings.fullname;
			options.params = params;

			//console.log ('imgbtnShare_Click '+readyURI+' options : '  + JSON.stringify(options));

			var ft = new FileTransfer();
			
			ft.upload(readyURI, _serverurl+'post/'+plugin.settings.feedtopostid, function success(results) {
				$("div.divShareBtnFrmSP", $element).show();
				$("div.divShareImgFrmSP", $element).hide();

				//console.log ('got Results ' + results.response);
				var jsonres = jQuery.parseJSON (results.response);
				newfeeddom (jsonres).prependTo('table.feed-table', $element);
				//console.log ('setting text to empty ');
				$('textarea.txtNewFeedStyle', $element).val('');
				
				imgCloseClick();
				} , function fail(error) {
			alert("An error has occurred: Code = " + error.code);
			}, options);
		}
		var imgCloseClick =  function () {
			$("div.divFileUpload", $element).hide(); //  div Mobile file upload options
			$("div.divAttachFile", $element).show(); // File & Link options against a post
			$("div.documentDiv", $element).hide(); // FILE ATTACHED, ready to POST-
			$("div.divShareBtnFrmSP", $element).show();
			$("div.divShareImgFrmSP", $element).hide();
			$("div.compUploadDiv", $element).hide(); // FILE UPLOAD FROM COMPUTER
			var fplUpload = $("input.fplUpload", $element); // Input to select file.
			$("input.txtFileName", $element).val(''); // Filename
			$('input.txtDescription', $element).val('');
			
			$("label.feedLengthError", $element).hide();
			$("label.lblErrMsg", $element).hide();
			$("label.descLengthError", $element).hide();
			$("label.lblValidationMsg", $element).hide();
			$("label.lblFileCheck", $element).hide();
		}
	  	/* When a file is selected from the computer, enable the share button */
		var getNameFromPath = function (e) {
			var lblFileCheck = $("label.lblFileCheck", $element);
			var divActiveShareFrmComp = $("div.divActiveShareFrmComp", $element);
			var divInactiveShareFrmComp = $("div.divInactiveShareFrmComp", $element);
			var fplUpload = $("input.fplUpload", $element);
			var txtFileName = $("input.txtFileName", $element);
			var strFilepath = $(this).val();
			
			if (strFilepath.length == 0) {
				divActiveShareFrmComp.hide();
				divInactiveShareFrmComp.show();
				txtFileName.val ("");
				lblFileCheck.show();
				lblFileCheck.innerHTML = "Please choose a file to upload."
			} else {
				lblFileCheck.hide();
				var objRE = new RegExp(/([^\/\\]+)$/);
				var strName = objRE.exec(strFilepath);
				if (strName == null) {
					return null
				} else {
					var extIndex = strName[0].lastIndexOf(".");
					var fileName = strName[0].substring(0, extIndex);
					$("input.txtFileName", $element).val (fileName);
					divActiveShareFrmComp.show();
					divInactiveShareFrmComp.hide();

					$("label.lblErrMsg", $element).hide();
					$("label.lblValidationMsg", $element).hide();
					return strName[0]
				}
			}
		}
	
		init();
	}
			
	


	$.fn.chatter = function(options) {

        return this.each(function() {
            if (undefined == $(this).data('chatter')) {
                var plugin = new $.chatter(this, options);
                $(this).data('chatter', plugin);
            }
        });

    }
})( jQuery );

