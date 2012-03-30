




function processsfdcfeeditem (itm, outletteam) {
    
    var posttxt = itm.body.text.split(": ");
    //alert ('processsfdcfeeditem ' + itm.body.text + '('+posttxt.length+') :: ' + JSON.stringify(outletteam));
    
    var ret = {};
    if (posttxt.length < 2) {
        ret = { pic: '/image/NokiaLogo.gif', author: 'Nokia', ptxt: posttxt[0] };
    } else {
        var pauthor = posttxt[0];
        ret = { pic: outletteam[pauthor].pic, author: pauthor, ptxt: posttxt[1] };
    } 
    
    var pdate = new Date(Date.parse(itm.createdDate));
    ret.ctime = $.cuteTime({}, pdate.toString());  
    
    return ret;
}
   
function newfeeddom (itm, outletteam, feedid) {

    var post = processsfdcfeeditem(itm, outletteam);

    var newpost = $('#feed-post'+feedid).clone();
    newpost = newpost.attr({"id": itm.id }).removeAttr('style')
        .find('.spanFeed').text(post.ptxt).end()
        .find('.aFeedAuthor').text(post.author).end()
        .find('.pFeedAuthor').attr({"src": post.pic }).end()
        .find('.postCreatedDate').text(post.ctime).end()
        .find('.linkComment').click(function () {
                var divActivity = $(this).parent().parent().parent().next();
                var dslComment = divActivity.children('.comment_feddbackBox').children('.Like_box_BG');
                var divCBox = dslComment.next();
                var tbComment = divCBox.children('.Like_box_right').children('.users_comment3').children('.tbCommentClass');
                //tbComment.TextAreaExpander(30);
                //tbComment.keydown(function () {
                //    CheckCommentLength($(this))
                //});
                //tbComment.keyup(function () {
                //     CheckCommentLength($(this))
                //});
                
                //var lblLengthError = tbComment.next();
                
                
                divActivity.attr({'style': 'display : block;'});
                //	dslComment.hide();
                divCBox.show();
                tbComment.focus();
                //	lblLengthError.hide();
                
       }).end();
       
    if (itm.attachment) {
        if (!itm.attachment.description) itm.attachment.description = '';
      newpost.find('#divFileInfo').removeAttr('style').end()
        .find('#lblFileName').text(itm.attachment.title).end()
        .find('#lblFileDesc').text(itm.attachment.description).end()
        .find('#imgFile').click(function () {
            $("#event-container").empty();
            $("#event-container").append(
                $("<img/>").attr({ "src": '/feedfile?what=' + escape(itm.attachment.downloadUrl) + '&mt=' + escape(itm.attachment.mimeType)})
                );
                
            var tw = getTargetWidth();
            $("#jdialog").dialog ({ 
                title: 'View file ' + itm.attachment.title,
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
            
            
            });
    }
    
    return newpost;
}

function newcommentdom(cmt, outletteam, newpost)  {
    
    var post = processsfdcfeeditem(cmt, outletteam);
    
    var commenttr = newpost.find('tr.Like_box_template').clone();
    //	alert ('comment ' + JSON.stringify(commenttr) + ' val ' + cmt.user.name);
    
    commenttr = commenttr.attr({"id": cmt.id, "class": "Like_box" }).removeAttr('style')
        .find('.commentAuthor').text(post.author).end()
        .find('.pcommentAuthor').attr({"src": post.pic }).end()
        .find('.spanComment').text(post.ptxt).end()
        .find('.commentCreatedDate').text(post.ctime).end();
        
    return commenttr;
}
   
function loadfeeds(feedid) {
    $.ajax({ 
		url: "/myfeed/" + feedid, 
		success: function(res){
            var outletteam = {};
            
            //$('#imgCommentNew').attr ({ 'src' : res.me.picture_url });
            
            if (res.team) {
                var teamlistDiv = $('#team-list'+feedid);
                //$('#selected_feed').text(res.team.outlet.name);
                //$('#option1_feed').text(res.team.outlet.name);
                
                outletteam = res.team.outlet_team;
                for (var name in res.team.outlet_team) {
                    var tm = res.team.outlet_team[name];
                    var _member_layout = $("<li/>").attr({"style" : "float:left;"}).append(
                    $("<div/>").attr({"style" : "text-align: center; width: 65px;"}).append(
                        $("<img/>").attr({"style" : "margin: 5px;", "width": "45px", "height": "45px", "src": tm.pic}),
                		$("<div/>").attr({"class" : "itemName"}).text(name),
    					$("<div/>").attr({"class" : "itemResults"}).text(tm.points)
                        )
                    );
                    teamlistDiv.append(_member_layout);
                }
            }

            if (res.feed.items.length >0) {

				for (var idx in res.feed.items) {
                    var itm = res.feed.items[idx];
                   
                    var newpost = newfeeddom (itm, outletteam, feedid);
				
                    var nocomments = itm.comments.total;
					if (nocomments >0){
                        // adds in the arrow divider! 
                        newpost.find('div.comment_feedback').attr({'style': 'display : block;'});
                        var comments = itm.comments.comments;
						for (var cidx in comments) {

							var cmt = comments[cidx];
                            var commenttr = newcommentdom (cmt, outletteam, newpost);    
							commenttr.appendTo(newpost.find('.table_userComment'));
						}
					}
					newpost.appendTo('#feed-table'+feedid);
				}
			}
		}
    });
}

    
    function addComment(e, pic_url, fullname) {
        var txtComment = $(e).parent().prev().children(".tbCommentClass");
        
        var divEComment = txtComment.parent().next();
        var divDComment = divEComment.next();
        var feeditem = $(e).parents('tr');
        
        var entercomment = $(e).parents('div.Like_box');
        //if (typeof (Page_ClientValidate) == 'function') {
        //    if (Page_ClientValidate() == false) {
        //        return false
         //   }
        //}
        if (txtComment.val().length > 1) {
            txtComment.attr("disabled", "disabled");
            divEComment.hide();
            divDComment.show()
        
        
            // call POST
            $.post( '/postcomment', { 'feeditem' : feeditem.attr('id'), 'mess' : txtComment.val() }, function(cmt){
                
                divEComment.show();
                divDComment.hide();
                txtComment.removeAttr("disabled");
                entercomment.attr({'style': 'display: none;'});
                
                var meteam = {};
                meteam[fullname] = { pic: pic_url};
                //alert ('addComment ' + JSON.stringify(meteam));
                var commenttr = newcommentdom (cmt, meteam , feeditem);  

				commenttr.appendTo(feeditem.find('.table_userComment'));
            });
        } else {
            divEComment.show();
            divDComment.hide();
            txtComment.removeAttr("disabled");
            entercomment.attr({'style': 'display: none;'});
        }
    };
    
    
function addPosting(e, feedid, pic_url, fullname) {

    $(e).parent().attr({'style': 'display: none;'});
    $(e).parent().next().attr({'style': 'display: block; '});
    
    //$('#divActive').attr({'style': 'display: none;'});
    //$('#divInactive').attr({'style': 'display: block;'});
    
    var ptxt = $('#txtNewFeed'+feedid).val(); 
    
    if (ptxt.length > 1) {
    
        $.post( '/post/'+feedid, { 'mess' : ptxt }, function(results){
        
            var meteam = {};
            meteam[fullname] = { pic: pic_url};
            var newpost = newfeeddom (results, meteam, feedid);
            newpost.prependTo('#feed-table'+feedid);
            
            $('#txtNewFeed'+feedid).val(null);
            $(e).parent().attr({'style': 'display: block;'});
            $(e).parent().next().attr({'style': 'display: none;'});
            //$('#divActive').attr({'style': 'display: block;'});
            //$('#divInactive').attr({'style': 'display: none;'});
        });
    } else {
        $('#txtNewFeed'+feedid).val(null);
        $(e).parent().attr({'style': 'display: block;'});
        $(e).parent().next().attr({'style': 'display: none;'});
        //$('#divActive').attr({'style': 'display: block;'});
        //$('#divInactive').attr({'style': 'display: none;'});
    
    }
}
    
var its_setup = false;
function addPostingWithPic(e, feedid, pic_url, fullname) {

    $(e).parent().attr({'style': 'display: none;'});
    $(e).parent().next().attr({'style': 'display: block; '});
    
    var ptxt = $('#txtNewFeed'+feedid).val(); 
    var fname = $('#txtFileName').val(); 
    var fdesc = $('#txtDescription').val(); 

    if (ptxt.length == 0) {
        ptxt = 'Posted a File';
    }
    
    // Create an iframe to submit through, using a semi-unique ID
    var frame_id = 'ajaxUploader-iframe-' + Math.round(new Date().getTime() / 1000)
    $('body').after('<iframe width="0" height="0" style="display:none;" name="'+frame_id+'" id="'+frame_id+'"/>');
    $('#'+frame_id).load(function() {
        if (its_setup) {
            
            
            var response, responseStr = this.contentWindow.document.body.innerHTML;
            var r = /^\<pre\>(.*)\<\/pre\>$/
            responseStr = responseStr.match(r)[1]
            response = JSON.parse(responseStr);

   
            // Tear-down the wrapper form
            $('#fplUpload'+feedid).siblings().remove();
            $('#fplUpload'+feedid).unwrap();
            its_setup = false;
            
            imgCloseClick();
            
            var meteam = {};
            meteam[fullname] = { pic: pic_url};
            var newpost = newfeeddom (response, meteam, feedid);
            newpost.prependTo('#feed-table'+feedid);
            
            $('#txtNewFeed'+feedid).val(null);
            $(e).parent().attr({'style': 'display: block;'});
            $(e).parent().next().attr({'style': 'display: none;'});
        }
    });
    
    // Wrap it in a form
    $('#fplUpload'+feedid).wrap('<form action="' + '/post/'+feedid + '" method="POST" enctype="multipart/form-data" target="'+frame_id+'" />'
    ).after('<input type="hidden" name="' + 'mess' + '" value="' + ptxt + '" />'+
            '<input type="hidden" name="' + 'fname' + '" value="' + fname + '" />'+
            '<input type="hidden" name="' + 'fdesc' + '" value="' + fdesc + '" />');
    its_setup = true; 
    $('#fplUpload'+feedid).parent('form').submit();

}
    
   
   function btnOnClientClick() {
        document.getElementById(btnChatterLoginID).style.display = 'none';
    }
    
    function OpenDialog() {
        var options = SP.UI.$create_DialogOptions();
        options.url = WebRelativeUrl + "/_layouts/SFChatterWP/SalesChatterFileUpload.aspx?FromWebPart=Yes";
        options.width = 700;
        options.height = 600;
        options.dialogReturnValueCallback = CloseCallback;
        SP.UI.ModalDialog.showModalDialog(options)
    }
    var messageId;

    /* Upload selected file to server, and ready to go */
    function imgbtnShare_Click() {
        alert ('ok');
        var target = '/pathname/filename.jpg';
        var divAttachFile = document.getElementById("compUploadDiv");
        var divFileUpload = document.getElementById("divFileUpload");
        //if (result === SP.UI.DialogResult.OK) {
        divFileUpload.style.display = 'none';
        document.getElementById("documentDiv").style.display = 'block';
        var fileurl = target;
        var tempfile1 = fileurl.substring(fileurl.lastIndexOf('/') + 1);
        var tempfile2 = tempfile1.substring(tempfile1.lastIndexOf('/') + 1);
        var filename = tempfile2.split("#");
        document.getElementById('path').innerHTML = filename[0];
        document.getElementById("hdnSharePointFilePath").value = target + "#FromSharePoint"
        divAttachFile.style.display = 'none';
            
            
        //} else {
        //    if (document.getElementById("documentDiv").style.display == 'block') {
        //        divAttachFile.style.display = 'none'
        //    } else if (divAttachFile.style.display == 'block') {
        //        divFileUpload.style.display = 'none'
        //    }
        //}
        
    }
    
    function CloseCallback(result, target) {
        var divAttachFile = document.getElementById("<%=divAttachFile.ClientID%>");
        var divFileUpload = document.getElementById("<%=divFileUpload.ClientID%>");
        if (result === SP.UI.DialogResult.OK) {
            divFileUpload.style.display = 'none';
            document.getElementById("<%=documentDiv.ClientID%>").style.display = 'block';
            var fileurl = target;
            var tempfile1 = fileurl.substring(fileurl.lastIndexOf('/') + 1);
            var tempfile2 = tempfile1.substring(tempfile1.lastIndexOf('/') + 1);
            var filename = tempfile2.split("#");
            document.getElementById('path').innerHTML = filename[0];
            document.getElementById("hdnSharePointFilePath").value = target + "#FromSharePoint"
        } else {
            if (document.getElementById("<%=documentDiv.ClientID%>").style.display == 'block') {
                divAttachFile.style.display = 'none'
            } else if (divAttachFile.style.display == 'block') {
                divFileUpload.style.display = 'none'
            }
        }
    }
    function OpenDialogForUserList(sFeedID, sUserID, sCK, sCS) {
        var options1 = SP.UI.$create_DialogOptions();
        options1.url = WebRelativeUrl + "/_layouts/SFChatterWP/LikesUserList.aspx?FID=" + sFeedID + "&UID=" + sUserID + "&CK=" + sCK + "&CS=" + sCS + "&WebUrl=" + CurrentWebUrl;
        options1.width = 445;
        options1.height = 420;
        SP.UI.ModalDialog.showModalDialog(options1)
    }
    
    /*  USING THIS FOR PHONEGAP- shows sharepoint / computer file upload options */
    function showUploadOptions() {
        //var fplUpload = document.getElementById("fplUpload");
        var divFileUpload = $("#divFileUpload");
        var divAttachFile = document.getElementById("divAttachFile");
        var divLinkPost = document.getElementById("divLinkPost");
        divLinkPost.style.display = 'none';
        //document.getElementById("hdnSharePointFilePath").value = "";
        document.getElementById("txtFileName").value = "";
        //fplUpload.value = null;
        divFileUpload.attr({'style': 'display: block;'});
        divAttachFile.style.display = 'none'
    }
    
    /* Upload File from Computer */
    function compUploadClick() {
        
        var divAttachFile = document.getElementById("divAttachFile");
        divAttachFile.style.display = 'none';
        
        var divFileUpload = document.getElementById("divFileUpload");
        var compUploadDiv = document.getElementById("compUploadDiv");
        var divImgBtnShareFrmComp = document.getElementById("divImgBtnShareFrmComp");
        var divimagShareFrmComp = document.getElementById("divimagShareFrmComp");
        divFileUpload.style.display = 'none';
        compUploadDiv.style.display = 'block';
        divImgBtnShareFrmComp.style.display = 'none';
        divimagShareFrmComp.style.display = 'block'
    }
    
    
    function imgCloseClick() {
        var divFileUpload = document.getElementById("divFileUpload");
        var divAttachFile = document.getElementById("divAttachFile");
        var documentDiv = document.getElementById("documentDiv");
        var compUploadDiv = document.getElementById("compUploadDiv");
        var fplUpload = document.getElementById("fplUpload");
        var txtFileName = document.getElementById("txtFileName");
        var txtDescription = document.getElementById("txtDescription");
        var errLabel = document.getElementById("feedLengthError");
        var lblErrMsg = document.getElementById("lblErrMsg");
        var descLengthError = document.getElementById("descLengthError");
        var lblValidationMsg = document.getElementById("lblValidationMsg");
        var lblFileCheck = document.getElementById("lblFileCheck");
        errLabel.style.display = 'none';
        lblErrMsg.style.display = 'none';
        divAttachFile.style.display = 'block';
        divFileUpload.style.display = 'none';
        documentDiv.style.display = 'none';
        compUploadDiv.style.display = 'none';
        descLengthError.style.display = 'none';
        lblValidationMsg.style.display = 'none';
        lblFileCheck.style.display = 'none';
        txtFileName.value = "";
        txtDescription.value = "";
        //var originaFileUpload = document.getElementsByName('fplUpload.')[0];
        //originaFileUpload.value = "";
        //var dummyFileUpload = originaFileUpload.cloneNode(false);
        //dummyFileUpload.onchange = originaFileUpload.onchange;
        //originaFileUpload.parentNode.replaceChild(dummyFileUpload, originaFileUpload)
    }
    function ShowDeleteImage(imageID) {
        var btnDeletePost = document.getElementById(imageID);
        btnDeletePost.style.display = 'block'
    }
    function HideDeleteImage(imageID) {
        var btnDeletePost = document.getElementById(imageID);
        btnDeletePost.style.display = 'none'
    }
    function CnfrmPostDel() {
        return confirm('Are you sure you want to delete this post?')
    }
    function CnfrmCmntDel() {
        return confirm('Are you sure you want to delete this comment?')
    }
    function imgCloseLinkClick() {
        var divLinkPost = document.getElementById("divLinkPost");
        var txtLinkUrl = document.getElementById("txtLinkUrl");
        var txtLinkName = document.getElementById("txtLinkName");
        var divAttachFile = document.getElementById("divAttachFile");
        var LinkLengthError = document.getElementById("LinkLengthError");
        var lblLinkUrlValidation = document.getElementById("lblLinkUrlValidation");
        var LinkNameError = document.getElementById("LinkNameError");
        var RegExpLinkValidator = document.getElementById("RegExpLinkValidator");
        ValidatorEnable(RegExpLinkValidator, false);
        divLinkPost.style.display = 'none';
        divAttachFile.style.display = 'block';
        txtLinkUrl.value = "";
        txtLinkName.value = "";
        LinkLengthError.style.display = 'none';
        lblLinkUrlValidation.style.display = 'none';
        LinkNameError.style.display = 'none'
    }
    function pageLoad() {
        showMoreLink();
        jQuery("textarea[class*=expand]").TextAreaExpander()
    }
    function showMoreLink() {
        var maxlines = 6;
        var lineheight = 13;
        var maxheight = (maxlines * lineheight);
        var allowedExtraLines = 3;
        var showText = "More";
        var hdnMoreFeedId = document.getElementById("hdnMoreFeedId");
        $(".expandmorelink").each(function () {
            var text = $(this);
            var feedID;
            if (text.height() > maxheight + allowedExtraLines * lineheight) {
                text.css({
                    'overflow': 'hidden',
                    'line-height': lineheight + 'px',
                    'height': maxheight + 'px'
                });
                var link = $('<a href="#"> ' + showText + '</a>');
                var dots = $('<span>...</span>');
                link.click(function (event) {
                    event.preventDefault();
                    feedID = $(text).find(":input").val();
                    if (hdnMoreFeedId.value != "") {
                        hdnMoreFeedId.value = hdnMoreFeedId.value + "," + feedID
                    } else hdnMoreFeedId.value = feedID;
                    if (text.css('height') == 'auto') {
                        text.css('height', maxheight + 'px')
                    } else {
                        $(this).remove();
                        dots.remove();
                        text.css('height', 'auto')
                    }
                });
                var linkDiv = $('<div style="display:inline;padding-left:5px;" ></div>');
                linkDiv.append(dots);
                linkDiv.append(link);
                $(this).after(linkDiv)
            }
        })
    }
    
    /* When a file is selected from the computer, enable the share button */
    function getNameFromPath(strFilepath, target) {
        var lblFileCheck = document.getElementById("lblFileCheck");
        if (strFilepath.length == 0) {
            var divImgBtnShareFrmComp = document.getElementById("divImgBtnShareFrmComp");
            var divimagShareFrmComp = document.getElementById("divimagShareFrmComp");
            var fplUpload = document.getElementById("fplUpload");
            var txtFileName = document.getElementById("txtFileName");
            divImgBtnShareFrmComp.style.display = 'none';
            divimagShareFrmComp.style.display = 'block';
            txtFileName.value = "";
            lblFileCheck.style.display = 'block';
            lblFileCheck.innerHTML = "Please choose a file to upload."
        } else {
            lblFileCheck.style.display = 'none';
            var objRE = new RegExp(/([^\/\\]+)$/);
            var strName = objRE.exec(strFilepath);
            if (strName == null) {
                return null
            } else {
                document.getElementById("hdnSharePointFilePath").value = "FromComputer";
                var hdnFileUploadPath = document.getElementById("hdnFileUploadPath");
                var divImgBtnShareFrmComp = document.getElementById("divImgBtnShareFrmComp");
                var divimagShareFrmComp = document.getElementById("divimagShareFrmComp");
                hdnFileUploadPath.value = strFilepath;
                var extIndex = strName[0].lastIndexOf(".");
                var fileName = strName[0].substring(0, extIndex);
                document.getElementById("txtFileName").value = fileName;
                divImgBtnShareFrmComp.style.display = 'block';
                divimagShareFrmComp.style.display = 'none';
                var lblErrMsg = document.getElementById("lblErrMsg");
                lblErrMsg.style.display = 'none';
                var lblValidationMsg = document.getElementById("lblValidationMsg");
                lblValidationMsg.style.display = 'none';
                return strName[0]
            }
        }
    }
    
    function showLinkUploadOptions() {
        document.getElementById("<%=hdnSharePointFilePath.ClientID%>").value = "";
        var divAttachFile = document.getElementById("<%=divAttachFile.ClientID%>");
        var divLinkPost = document.getElementById("<%=divLinkPost.ClientID%>");
        document.getElementById("<%=txtLinkUrl.ClientID%>").value = "http://";
        document.getElementById("<%=txtLinkName.ClientID%>").value = "";
        divLinkPost.style.display = 'block';
        divAttachFile.style.display = 'none';
        var RegExpLinkValidator = document.getElementById("<%=RegExpLinkValidator.ClientID%>");
        RegExpLinkValidator.enabled = true
    }
    function MouseToolTip(imgPicId, imgPicUrl, ActorId, ActorName, IsFollow, Phone, subscriptionUrl, IsChatterGuest) {
        var bottomPosition = $(document).height() / 2;
        var divID = $("#dvUserAction");
        imageId = "#" + imgPicId;
        $("#<%=hdnPersistDiv.ClientID%>").val(imageId);
        $("#<%=hdnFollowUserID.ClientID%>").val(ActorId);
        $("#<%=hdnSubscriptionUrl.ClientID%>").val(subscriptionUrl);
        $("#<%=hdnFollowUserName.ClientID%>").val(ActorName);
        $("#<%=hdnPhotoURL.ClientID%>").val(imgPicUrl);
        Id = ActorId;
        Name = ActorName;
        var pos = $(imageId).offset();
        setDivControls(imgPicUrl, ActorId, ActorName, IsFollow, Phone, IsChatterGuest);
        $("#<%=hdnPosition.ClientID%>").val(pos.top);
        $("#<%=hdnLeftPostion.ClientID%>").val(pos.left);
        setDivPosition(pos.top, pos.left, bottomPosition, ActorId);
        $(imageId).hover(function () {
            var pos = $(imageId).offset();
            setDivControls(imgPicUrl, ActorId, ActorName, IsFollow, Phone, IsChatterGuest);
            $("#<%=hdnPosition.ClientID%>").val(pos.top);
            $("#<%=hdnLeftPostion.ClientID%>").val(pos.left);
            setDivPosition(pos.top, pos.left, bottomPosition, ActorId)
        }, function () {
            $(divID).hide()
        });
        $(divID).hover(function () {
            setDivControls(imgPicUrl, ActorId, ActorName, IsFollow, Phone, IsChatterGuest)
        }, function () {
            $(divID).hide()
        });
        $("#UnFollowImg").hover(function () {
            $("#UnFollowImg").attr('src', '/_layouts/images/SFChatterWP/close2.png')
        }, function () {
            $("#UnFollowImg").attr('src', '/_layouts/images/SFChatterWP/close.png')
        })
    }
    function setDivControls(imgPicUrl, ActorId, ActorName, IsFollow, Phone, IsChatterGuest) {
        var divID = $("#dvUserAction");
        $(divID).show();
        lnkFollowID = $("lnkFollowUser");
        lnkUnFollowID = $("unfollow");
        lnkSendId = $("#lnkSendMsg");
        loggedInUserId = $("#hdnMyUserID").val();
        $("#<%=imgUserPic.ClientID%>").attr({
            title: ActorName,
            src: imgPicUrl
        });
        $("#<%=hUserName.ClientID%>").attr("href", sAPIEndPoint + "/" + ActorId);
        $("#<%=hUserName.ClientID%>").text(ActorName);
        if (loggedInUserId == ActorId) {
            $(lnkFollowID).hide();
            $(lnkSendId).hide();
            $(lnkUnFollowID).hide()
        } else {
            if (IsChatterGuest == 'True') {
                $(lnkFollowID).hide();
                $(lnkUnFollowID).hide()
            } else if (IsFollow == 'yes') {
                $(lnkFollowID).show();
                $(lnkUnFollowID).hide()
            } else {
                $(lnkFollowID).hide();
                $(lnkUnFollowID).show()
            }
            $(lnkSendId).show()
        }
        if (Phone != '') {
            if (Phone.indexOf(":") == -1) {
                $("#<%=lblPhone1.ClientID %>").text(Phone.split("*")[0]);
                $("#<%=lbltype1.ClientID %>").text(Phone.split("*")[1]);
                $("#<%=lblPhone2.ClientID %>").text('');
                $("#<%=lbltype2.ClientID %>").text('')
            } else {
                var phone1 = Phone.split(":")[0];
                var phone2 = Phone.split(":")[1];
                $("#<%=lblPhone1.ClientID %>").text(phone1.split("*")[0]);
                $("#<%=lbltype1.ClientID %>").text(phone1.split("*")[1]);
                $("#<%=lblPhone2.ClientID %>").text(phone2.split("*")[0]);
                $("#<%=lbltype2.ClientID %>").text(phone2.split("*")[1])
            }
        } else {
            $("#<%=lblPhone1.ClientID %>").text('');
            $("#<%=lbltype1.ClientID %>").text('');
            $("#<%=lblPhone2.ClientID %>").text('');
            $("#<%=lbltype2.ClientID %>").text('')
        }
    }
    function setDivPositionAfterClick(imgPicId, imgPicUrl, ActorId, ActorName, IsFollow, Phone, subscriptionUrl, IsChatterGuest, TopPosition, LeftPostion) {
        var bottomPosition = $(document).height() / 2;
        var divID = $("#dvUserAction");
        imageId = "#" + imgPicId;
        $("#<%=hdnPersistDiv.ClientID%>").val(imageId);
        $("#<%=hdnFollowUserID.ClientID%>").val(ActorId);
        $("#<%=hdnSubscriptionUrl.ClientID%>").val(subscriptionUrl);
        $("#<%=hdnFollowUserName.ClientID%>").val(ActorName);
        $("#<%=hdnPhotoURL.ClientID%>").val(imgPicUrl);
        Id = ActorId;
        Name = ActorName;
        setDivControls(imgPicUrl, ActorId, ActorName, IsFollow, Phone, IsChatterGuest);
        $("#<%=hdnPosition.ClientID%>").val(TopPosition);
        $("#<%=hdnLeftPostion.ClientID%>").val(LeftPostion);
        setDivPosition(TopPosition, LeftPostion, bottomPosition, ActorId);
        $(imageId).hover(function () {
            var pos = $(imageId).offset();
            setDivControls(imgPicUrl, ActorId, ActorName, IsFollow, Phone, IsChatterGuest);
            $("#<%=hdnPosition.ClientID%>").val(TopPosition);
            $("#<%=hdnLeftPostion.ClientID%>").val(LeftPostion);
            setDivPosition(TopPosition, LeftPostion, bottomPosition, ActorId)
        }, function () {
            $(divID).hide()
        });
        $(divID).hover(function () {
            setDivControls(imgPicUrl, ActorId, ActorName, IsFollow, Phone, IsChatterGuest)
        }, function () {
            $(divID).hide()
        });
        $("#UnFollowImg").hover(function () {
            $("#UnFollowImg").attr('src', '/_layouts/images/SFChatterWP/close2.png')
        }, function () {
            $("#UnFollowImg").attr('src', '/_layouts/images/SFChatterWP/close.png')
        })
    }
    function setDivPosition(TopPostion, LeftPostion, bottomPosition, ActorId) {
        var divID = $("#dvUserAction");
        $(divID).show();
        arrowUp = $("#<%=arrow_up.ClientID%>");
        arrowDown = $("#<%=arrow_down.ClientID%>");
        loggedInUserId = $("#<%=hdnMyUserID.ClientID%>").val();
        var height = ($(divID).height() - 10);
        height = TopPostion - height;
        if (bottomPosition < TopPostion) {
            $(divID).offset({
                top: height,
                left: LeftPostion
            });
            $(divID).show();
            $(arrowDown).show();
            $(arrowUp).hide()
        } else {
            $(divID).offset({
                top: TopPostion + 5,
                left: LeftPostion
            });
            $(divID).show();
            $(arrowDown).hide();
            $(arrowUp).show()
        }
    }
    function OpenSendMsgDialog() {
        var divID = $("#dvUserAction");
        $(divID).hide();
        var sendOptions = SP.UI.$create_DialogOptions();
        sendOptions.url = WebRelativeUrl + "/_layouts/SFChatterWP/SendMessage.aspx?ID=" + Id + "&Name=" + Name + "&AT=" + document.getElementById("<%=hdnAccessToken.ClientID%>").value + "&IU=" + document.getElementById("<%=hdnInstanceUrl.ClientID%>").value + "&LGUSER=" + document.getElementById("<%=hdnMyUserID.ClientID%>").value + "&ACSUC=" + sAutoCompleteSearchUserCount;
        sendOptions.title = "Send a Message";
        sendOptions.width = 550;
        sendOptions.height = 400;
        SP.UI.ModalDialog.showModalDialog(sendOptions)
    }

    //BindLoadEvents();

    function BindLoadEvents() {
        $(document).ready(function () {
        		
    		
						
            try {
                document.getElementById('chatterdiv').onscroll = function () {
                    $(".ac_results").hide()
                }
            } catch (Exception) {}
            var controlID;
            var currentControl;
            var lastIndex;
            var currentCtrlText;
            $(".autoCompleteClass").autocomplete('/handleURL', {
                width: $(this).outerWidth(),
                extraParams: {
                    CP: function () {
                        id = $(this).attr('id');
                        var textarea = document.getElementById(id);
                        if ($.browser.mozilla) return getCaret(textarea) + ',' + 0;
                        else return getCaret(textarea) + ',' + 1
                    }
                },
                max: 5,
                formatItem: function (data, i, n, value) {
                    if (value != "NO RESULT") {
                        if (value.split("*")[2] == "user") {
                            var returnText = "<div id='dvAutocompleteResult' style='padding-left:15px;vertical-align:middle;'>";
                            returnText += "<img alt='' src='" + value.split("*")[1] + ImgAppend + "' height='16' width='16'/>&nbsp;&nbsp;&nbsp;" + value.split("*")[0];
                            returnText += "</div>";
                            return returnText
                        } else {
                            var returnText = "<div id='dvAutocompleteResult' style='padding-left:10px;'>";
                            returnText += value.split("*")[0];
                            returnText += "</div>";
                            return returnText
                        }
                    } else {
                        if ($.browser.mozilla) {
                            $("#dvAutocompleteResult").val('');
                            $(".ac_results").hide();
                            $("#dvAutocompleteResult").hide();
                            $("#dvAutocompleteResult").removeAttr("style")
                        } else {
                            $("#dvAutocompleteResult").removeAttr("style");
                            return null
                        }
                    }
                },
                formatResult: function (data, value) {
                    if (value.split("*")[2] == "user") {
                        if ($.browser.mozilla) {
                            currentControl = document.getElementById(controlID);
                            var position = value.split("*")[4];
                            var FirstVal = $(currentControl).val().substring(0, position);
                            FirstVal = FirstVal.substring(0, (FirstVal.lastIndexOf("@") + 1));
                            var SecondVal = $(currentControl).val().substring(position, $(currentControl).val().length);
                            return FirstVal + "[" + value.split("*")[0] + "]" + SecondVal
                        } else {
                            currentControl = document.getElementById(controlID);
                            var position = value.split("*")[4];
                            var actualText = $(currentControl).val();
                            var FirstVal = actualText.substring(0, position);
                            FirstVal = FirstVal.substring(0, (FirstVal.lastIndexOf("@") + 1));
                            var totalBreaks = FirstVal.split("\n");
                            var SecondVal = actualText.substring(position - (totalBreaks.length - 1), actualText.length);
                            return FirstVal + "[" + value.split("*")[0] + "]" + SecondVal
                        }
                    }
                    if (value.split("*")[1] == "msg") {
                        currentControl = document.getElementById(controlID);
                        currentCtrlText = $(currentControl).val();
                        return currentCtrlText
                    }
                }
            });
            $(".autoCompleteClass").keyup(function () {
                controlID = $(this).attr("id");
                id = $(this).attr('id');
                var textarea = document.getElementById(id);
                var text = $(this).val();
                cursor = getCaret(textarea)
            });
            $(".autoCompleteClass").result(function (event, data, formatted) {
                var hdnMentionsUserList = document.getElementById("<%=hdnMentionsUserList.ClientID%>");
                var dataParts = data.toString().split("*");
                var jsonObj;
                if (hdnMentionsUserList.value != "") {
                    hdnMentionsUserList.value = hdnMentionsUserList.value + ","
                }
                jsonObj = hdnMentionsUserList.value + '{"UserName":"' + "@[" + dataParts[0] + "]" + '",' + '"ID":"' + dataParts[dataParts.length - 3] + '"' + '}';
                hdnMentionsUserList.value = jsonObj
            });

            function getCaret(el) {
                if (el.selectionStart) {
                    return el.selectionStart
                } else if (document.selection) {
                    el.focus();
                    var r = document.selection.createRange();
                    if (r == null) {
                        return 0
                    }
                    var re = el.createTextRange(),
                        rc = re.duplicate();
                    re.moveToBookmark(r.getBookmark());
                    rc.setEndPoint('EndToStart', re);
                    return rc.text.length
                }
                return 0
            }
            function CheckCommentLength(txtComment) {
                var errLabel = txtComment.next();
                var divEComment = txtComment.parent().next();
                var divDComment = divEComment.next();
                var $this = txtComment;
                var val = $this.val();
                if (val.length >= 1000) {
                    errLabel.show();
                    divEComment.hide();
                    divDComment.show()
                } else {
                    errLabel.hide();
                    divEComment.show();
                    divDComment.hide()
                }
            }
            function CheckFeedLength(txtFeed) {
                var $this = txtFeed;
                var val = $this.val();
                var errLabel = $this.next();
                var divActive = $(".divActive");
                var divInactive = $(".divInactive");
                if (val.length >= 1000) {
                    errLabel.show();
                    divActive.hide();
                    divInactive.show()
                } else {
                    errLabel.hide();
                    divActive.show();
                    divInactive.hide()
                }
            }
            function CheckDescLength(txtDesc) {
                var $this = txtDesc;
                var val = $this.val();
                var errLabel = $this.next().next();
                var divActive = $(".divActiveShareFrmComp");
                var divInactive = $(".divInactiveShareFrmComp");
                var fplUpload = $(".fplUpload");
                var txtFileName = $(".txtFileName");
                if (val.length >= 1000) {
                    errLabel.show();
                    divActive.hide();
                    divInactive.show()
                } else {
                    errLabel.hide();
                    if (fplUpload.val().length > 0 && txtFileName.val().length > 0) {
                        divActive.show();
                        divInactive.hide()
                    }
                }
            }
            
            function CheckFileNameLength(txtFileName) {
                var $this = txtFileName;
                var val = $this.val();
                var divActive = $(".divActiveShareFrmComp");
                var divInactive = $(".divInactiveShareFrmComp");
                var fplUpload = $(".fplUpload");
                var lblErrMsg = $this.next().next();
                var lblValidationMsg = lblErrMsg.next();
                if (val.length > 0 && fplUpload.val().length > 0) {
                    if (val.length >= 256) {
                        divActive.hide();
                        divInactive.show();
                        $this.val(val.substring(0, 260));
                        lblErrMsg.show();
                        lblValidationMsg.hide()
                    } else {
                        $(".hdnSharePointFilePath").next().val("FromComputer");
                        divActive.show();
                        divInactive.hide();
                        lblErrMsg.hide();
                        lblValidationMsg.hide()
                    }
                } else {
                    if (val.length == 0) {
                        lblValidationMsg.show();
                        lblErrMsg.hide()
                    } else {
                        lblValidationMsg.hide();
                        if (val.length >= 256) lblErrMsg.show();
                        else lblErrMsg.hide()
                    }
                    divActive.hide();
                    divInactive.show()
                }
            }
            function CheckLinkUrlLength(txtLinkUrl) {
                var $this = txtLinkUrl;
                var val = $this.val();
                var divActiveLinkShare = $(".divActiveLinkShare");
                var divInactiveLinkShare = $(".divInactiveLinkShare");
                var LinkLengthError = $(".LinkLengthError");
                var lblLinkUrlValidation = $(".lblLinkUrlValidation");
                if (val.length > 0) {
                    if (val.length > 1000) {
                        $this.val(val.substring(0, 1000));
                        LinkLengthError.show();
                        divActiveLinkShare.hide();
                        divInactiveLinkShare.show();
                        lblLinkUrlValidation.hide()
                    }
                    if (val.length < 1000) {
                        $(".hdnSharePointFilePath").next().val("FromLink");
                        LinkLengthError.hide();
                        divActiveLinkShare.show();
                        divInactiveLinkShare.hide();
                        lblLinkUrlValidation.hide()
                    }
                } else {
                    lblLinkUrlValidation.show();
                    divActiveLinkShare.hide();
                    divInactiveLinkShare.show()
                }
            }
            function CheckLinkNameLength(txtLinkName) {
                var $this = txtLinkName;
                var val = $this.val();
                var txtLinkUrl = $(".txtLinkUrl");
                var divActiveLinkShare = $(".divActiveLinkShare");
                var divInactiveLinkShare = $(".divInactiveLinkShare");
                var LinkNameError = $this.next().next();
                if (val.length > 255) {
                    txtLinkName.val(val.substring(0, 255));
                    LinkNameError.show();
                    divActiveLinkShare.hide();
                    divInactiveLinkShare.show()
                }
                if (val.length < 255) {
                    if (txtLinkUrl.val().length > 0) {
                        $(".hdnSharePointFilePath").next().val("FromLink");
                        divActiveLinkShare.show();
                        divInactiveLinkShare.hide()
                    }
                    LinkNameError.hide()
                }
            }
            $(".tbCommentClass").TextAreaExpander(30);
            $(".tbCommentClass").keydown(function () {
                CheckCommentLength($(this))
            });
            $(".tbCommentClass").keyup(function () {
                CheckCommentLength($(this))
            });
            $(".textfield_com2").click(function () {
                var divActivity = $(this).parent().parent().parent();
                var dslComment = $(this).parent();
                var divCBox = dslComment.next();
                var tbComment = divCBox.children(".Like_box_right").children(".users_comment3").children(".tbCommentClass");
                var lblLengthError = tbComment.next();
                divActivity.show();
                dslComment.hide();
                divCBox.show();
                tbComment.focus();
                lblLengthError.hide()
            });
            $(".linkComment").click(function () {
                var divActivity = $(this).parent().parent().parent().next();
                var dslComment = divActivity.children(".comment_feddbackBox").children(".Like_box_BG");
                var divCBox = dslComment.next();
                var tbComment = divCBox.children(".Like_box_right").children(".users_comment3").children(".tbCommentClass");
                var lblLengthError = tbComment.next();
                divActivity.show();
                dslComment.hide();
                divCBox.show();
                tbComment.focus();
                lblLengthError.hide()
            });
            
            $(".txtNewFeedStyle").click(function () {
                var $this = $(this);
                var val = $this.val();
                if (val == "What are you working on?") {
                    $this.val("")
                }
                $this.css("color", "#000000")
            });
            $(".txtNewFeedStyle").keydown(function () {
                CheckFeedLength($(this))
            });
            $(".txtNewFeedStyle").keyup(function () {
                CheckFeedLength($(this))
            });
            $(".txtDescription").keydown(function () {
                CheckDescLength($(this))
            });
            $(".txtDescription").keyup(function () {
                CheckDescLength($(this))
            });
            $(".txtFileName").keydown(function () {
                CheckFileNameLength($(this))
            });
            $(".txtFileName").keyup(function () {
                CheckFileNameLength($(this))
            });
            $(".txtLinkUrl").keydown(function () {
                CheckLinkUrlLength($(this))
            });
            $(".txtLinkUrl").keyup(function () {
                CheckLinkUrlLength($(this))
            });
            $(".txtLinkName").keydown(function () {
                CheckLinkNameLength($(this))
            });
            $(".txtLinkName").keyup(function () {
                CheckLinkNameLength($(this))
            });
            $(".txtFeedNCommentSearch").keydown(function (event) {
                CheckFeedNCommentSearch($(this), event)
            });
            $(".txtFeedNCommentSearch").keyup(function (event) {
                CheckFeedNCommentSearch($(this), event)
            })
        })
    }
    function CheckFeedNCommentSearch(controlID, event) {
        var txtFeedNCommentSearch = controlID;
        var keycode = (event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode));
        if ($(txtFeedNCommentSearch).val().length == 0) {
            if (keycode == 13) {
                $(".imgBtnSearch").focus();
                return false
            } else {
                return true
            }
        } else {
            if (keycode == 13) {
                $(".imgBtnSearch").focus();
                return false
            } else {
                return true
            }
        }
    }
    function filterVisibility() {
        var divFilter = document.getElementById("drop_down_list");
        if (divFilter.style.display == 'inline-block') {
            divFilter.style.display = 'none'
        } else {
            divFilter.style.display = 'inline-block'
        }
    }
