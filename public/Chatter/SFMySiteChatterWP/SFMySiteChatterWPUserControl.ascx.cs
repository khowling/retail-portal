﻿using System;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Serialization;
using System.Data;
using Microsoft.SharePoint;
using System.IO;
using Microsoft.SharePoint.Utilities;
using System.Net;
using System.Web.UI.HtmlControls;
using SalesForce.ChatterMiddleTier;
using System.Text.RegularExpressions;
using System.Text;


namespace SalesForce.ChatterWP2010
{
    public partial class SFMySiteChatterWPUserControl : UserControl
    {
        #region Variables and objects

        string m_sMylikeID = string.Empty;
        List<FeedItem> olistAllFeeds = new List<FeedItem>();
        ChatterRESTAPI m_oChatterRESTAPI = new ChatterRESTAPI();
        SFChatterBAL m_oSFChatterBAL = new SFChatterBAL();
        GlobalEntities m_oUserEntities = new GlobalEntities();
        string sFollow = string.Empty;
        string sSubscriptionUrl = string.Empty;
        string sPhoneNumber = string.Empty;
        string sPhotoURL = string.Empty;
        string sPhotoURLFormat = "{0}/{1}";
        StringBuilder sbUserIdList = new StringBuilder();
        #endregion

        #region All Events

        /// <summary>
        /// Event is used to remove unnecessary spaces
        /// </summary>
        protected override void Render(HtmlTextWriter writer)
        {
            using (HtmlTextWriter htmlwriter = new HtmlTextWriter(new System.IO.StringWriter()))
            {
                base.Render(htmlwriter);
                writer.Write(m_oSFChatterBAL.ReplaceHTML(htmlwriter.InnerWriter.ToString()).Trim());
            }
        }

        /// <summary>
        /// This method perform oauth procedure, get logged in users basic info and load logged in users group info.
        /// </summary>
        protected void Page_Load(object sender, EventArgs e)
        {
            AccessToken oAccessToken = null;
            try
            {
                if (Request.QueryString[SFConstants.CONST_QS_ERROR] != null)
                {
                    if (Request.QueryString[SFConstants.CONST_QS_ERROR].Contains("access_denied"))
                    {
                        Page.ClientScript.RegisterStartupScript(this.GetType(), "PopupCloseOnDeny", "window.close();", true);
                    }
                }

                SFMySiteChatterWP oChatterWP = (SFMySiteChatterWP)this.Parent;

                if (string.IsNullOrEmpty(oChatterWP.ConsumerKey))
                {
                    SetControlVisibility(SFConstants.enControlVisibility.InValidConsumerKey);
                    RegisterHandlerScript(string.Empty);
                    return;
                }
                else
                {
                    SetControlVisibility(SFConstants.enControlVisibility.ValidConsumerKey);
                    if (!this.Page.ClientScript.IsStartupScriptRegistered("ChatterFirstLogin"))
                        this.Page.ClientScript.RegisterClientScriptBlock(this.GetType(), "ChatterFirstLogin",
                            string.Format(SFConstants.CONST_FIVE_PARAM_FORMAT, "var WebRelativeUrl='", SPContext.Current.Web.Url,
                            "'; var btnChatterLoginID = '", divChatterFstLogin.ClientID, "';"), true);
                    if (ViewState[SFConstants.CONST_VS_GLOBALENTITIES] == null)
                        GetConsumerKeyDetails();
                }

                if (!Page.IsPostBack)
                {
                    SetControlVisibility(SFConstants.enControlVisibility.Load);
                    ViewState[SFConstants.CONST_SHOW_MORE_FEED_ID] = null;
                    hdnMoreFeedId.Value = string.Empty;

                    if (ViewState[SFConstants.CONST_VS_GLOBALENTITIES] == null)
                        GetConsumerKeyDetails();

                    GetChatterAPIConfigData();
                    GetChatterAPINUSERInfoFRMVS();

                    if (Request[SFConstants.CONST_QS_CODE] != null)
                    {
                        oAccessToken = m_oChatterRESTAPI.GetRefreshToken(enMethod.POST, Request[SFConstants.CONST_QS_CODE], m_oUserEntities);
                        m_oUserEntities.RefreshToken = oAccessToken.Refresh_Token;
                        m_oUserEntities.InstanceURL = oAccessToken.Instance_URL;
                        m_oChatterRESTAPI.ChatterAPIEndpoint = m_oUserEntities.InstanceURL;
                        Utility.InsertUpdateRTNGRP(m_oUserEntities, SFConstants.CONST_OTHER_USER_LOGIN);
                        Page.ClientScript.RegisterStartupScript(this.GetType(), "newWindowtest", "window.close();", true);
                    }
                    else if (Request.QueryString["IsChild"] != null)
                    {
                        // To check whwther user has successfully login to chatter or not
                        if (!string.IsNullOrEmpty(m_oUserEntities.RefreshToken))
                            btnLogin_Click(null, null);
                    }

                    if (divChatterFstLogin.Style["display"].Equals("none"))
                    {
                        if (string.IsNullOrEmpty(hdnMyEmailID.Value))
                        {
                            GetAccessToken();
                            UserDetail m_oUserDetails = m_oChatterRESTAPI.GetUserProfile();
                            if (string.IsNullOrEmpty(m_oUserDetails.Email))
                                hdnMyEmailID.Value = m_oUserDetails.Name;
                            else
                                hdnMyEmailID.Value = m_oUserDetails.Email;
                        }
                        lblLoggedInUser.Text = hdnMyEmailID.Value;
                    }
                }
                else
                {
                    BindFeedGrid();
                }
                RegisterHandlerScript();
            }
            catch (WebException webex)
            {
                HandleLoginException(webex);
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.OrgException);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_PAGELOAD, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
            }
        }

        /// <summary>
        /// event is used to auto refresh the page after configured time
        /// </summary>
        protected void tmrAutoRefresh_Click(object sender, EventArgs e)
        {
            try
            {
                GetChatterAPINUSERInfoFRMVS();

                SetControlVisibility(SFConstants.enControlVisibility.AutoRefreshTimer);
                SetFilter(SFConstants.CONST_MYCHATTER, hdnMyChatterUrl.Value);
                //LoadAllChatterFeeds(SFConstants.enFeedState.AutoRefresh, SFConstants.enFilterType.Filter, hdnFilterUrl.Value, string.Empty);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("404"))
                {
                    ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";

                    LoadAllChatterFeeds(SFConstants.enFeedState.AutoRefresh, SFConstants.enFilterType.Filter, hdnFilterUrl.Value, string.Empty);
                }
                else
                {
                    SetControlVisibility(SFConstants.enControlVisibility.AutoRefreshTimerErr);
                    lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_TMR_AUTO, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                }
            }
        }

        /// <summary>
        /// event is used to clear access token value and get the new value
        /// </summary>
        protected void tmrAccessToken_Tick(object sender, EventArgs e)
        {
            try
            {
                ViewState[SFConstants.CONST_ACCESS_TOKEN] = null;
                ViewState[SFConstants.CONST_VS_GLOBALENTITIES] = null;
                SetAPIInfoFrmVS();
            }

            catch (WebException webex)
            {
                HandleLoginException(webex);
            }
            catch (Exception ex)
            {
                lblExceptions.Visible = true;
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_TMR_ACCESSTOKEN, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
            }
        }

        /// <summary>
        /// event is used to enter comment for feeds
        /// </summary>
        protected void btnComment_Click(object sender, ImageClickEventArgs e)
        {
            ImageButton btnSender = null;
            Control ctrlParent = null;
            HiddenField hdnFeedId = null;
            TextBox txtComment = null;
            GridView gvCommentList = null;
            HtmlGenericControl divActivity = null;
            Image imgCommentNew = null;
            Label lblFeedError = null;
            ImageButton btnComment = null;
            HtmlGenericControl divShowAllComments = null;
            HtmlGenericControl divCBox = null;
            HtmlGenericControl dslComment = null;
            HtmlGenericControl divCommentList = null;
            HtmlGenericControl divDComment = null;
            HtmlGenericControl divEComment = null;
            Label lblLengthError = null;
            List<Comments> oCommentList = null;
            Comments oComments = null;
            HiddenField hdnRowIndex = null;
            int iCommentsCount = 0;
            int iRowIndex = 0;
            LinkButton lnkShowAllComments = null;


            try
            {
                // find controls
                btnSender = (ImageButton)sender;
                ctrlParent = btnSender.Parent;
                hdnFeedId = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNFEEDID);
                hdnRowIndex = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNROWINDEX);
                txtComment = (TextBox)ctrlParent.FindControl(SFConstants.CONST_CTRL_TBCOMMENT);
                lblFeedError = (Label)ctrlParent.FindControl(SFConstants.CONST_CTRL_FEEDERROR);
                lblLengthError = (Label)ctrlParent.FindControl(SFConstants.CONST_CTRL_LBLLENGTHERROR);
                gvCommentList = (GridView)ctrlParent.FindControl(SFConstants.CONST_CTRL_GVCOMMENTLIST);
                divActivity = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_DIVACTIVITY);
                imgCommentNew = (Image)ctrlParent.FindControl(SFConstants.CONST_CTRL_IMAGECOMMENTNEW);
                lnkShowAllComments = (LinkButton)ctrlParent.FindControl(SFConstants.CONST_CTRL_LINKSHOWALLCOMMENTS);
                btnComment = (ImageButton)ctrlParent.FindControl(SFConstants.CONST_CTRL_BTNCOMMENT);
                divCBox = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_COMMENTBOX);
                dslComment = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_SINGLE_LINE_COMMENT);
                divCommentList = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_DIV_COMMENT_LIST);
                divShowAllComments = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_SHOW_ALL_COMMENTS);
                divEComment = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_DIV_ENABLE_COMMENT);
                divDComment = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_DIV_DISABLE_COMMENT);
                btnSender.Enabled = false;

                //Set API infromation from viewstate 
                SetAPIInfoFrmVS();

                lblFeedError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);

                if (string.IsNullOrEmpty(txtComment.Text.Trim()))
                {
                    btnSender.Enabled = true;
                    divCBox.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                    dslComment.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                    return;
                }

                if (txtComment.Text.Trim().Length > 1000)
                {
                    btnSender.Enabled = true;
                    lblLengthError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                    txtComment.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                    lblLengthError.Text = "Error: Your comment can't have more than 1000 characters.";
                    lblLengthError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                    return;
                }

                lblLengthError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);

                // Post the comment 
                oComments = m_oChatterRESTAPI.PostComment(hdnFeedId.Value, hdnMentionsUserList.Value, txtComment.Text.Trim());

                iRowIndex = Convert.ToInt32(hdnRowIndex.Value);

                // append comment in viewstate and bind the datagrid
                List<FeedItem> olistFeed = new List<FeedItem>();
                olistFeed = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;
                olistFeed[iRowIndex].Comments.Total = olistFeed[iRowIndex].Comments.Total + 1;
                oCommentList = olistFeed[iRowIndex].Comments.Comments.ToList();
                oCommentList.Insert(oCommentList.Count, oComments);
                iCommentsCount = olistFeed[iRowIndex].Comments.Total;
                olistFeed[iRowIndex].Comments.Comments = oCommentList.ToArray();
                ViewState[SFConstants.CONST_VS_FEEDDATA] = olistFeed;


                if (divShowAllComments.Style["display"].Equals("block"))
                {
                    lnkShowAllComments.Text = string.Format(SFConstants.CONST_sShowComments, iCommentsCount.ToString());
                }

                gvCommentList.DataSource = oCommentList;
                gvCommentList.DataBind();


                if (iCommentsCount > 0)
                    divCommentList.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);

                txtComment.Text = string.Empty;
                divActivity.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                divCBox.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                dslComment.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);

                btnSender.Enabled = true;

                //clear Mentions list in hidden variable
                hdnMentionsUserList.Value = string.Empty;
            }
            catch (WebException webex)
            {
                btnSender.Enabled = true;
                if (webex.Message.Contains("404"))
                {
                    ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";
                    lblFeedError.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNCOMMENT_CLICK, webex.Message, SFConstants.CONST_POSTDELETED_ERR_MSG);
                    lblFeedError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                    txtComment.Text = string.Empty;
                }
                else
                {
                    txtComment.Text = string.Empty;
                    string sWebException = new StreamReader(webex.Response.GetResponseStream()).ReadToEnd();
                    if (sWebException.Contains(SFConstants.CONST_STORAGE_LIMIT_ERR_MSG))
                    {
                        lblExceptionTop.Visible = true;
                        lblExceptionTop.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNCOMMENT_CLICK, webex.Message, SFConstants.CONST_STORAGE_LIMIT_ERR_MSG);
                    }
                    else
                    {
                        lblLengthError.Text = sWebException;
                        lblLengthError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                        m_oSFChatterBAL.HandleError(webex.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                btnSender.Enabled = true;
                txtComment.Text = string.Empty;
                lblLengthError.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNCOMMENT_CLICK, ex.Message, SFConstants.CONST_SUBMITCOMMENT_ERR_MSG);
                lblLengthError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
            }
        }

        /// <summary>
        /// RowData Bound event for gvCommentList GridView
        /// </summary>
        protected void gvCommentList_RowDataBound(object sender, GridViewRowEventArgs e)
        {
            HiddenField hdnPostIndex = null;
            Label lblCommentIndex = null;
            Label lblPostIndex = null;
            ImageButton btnDeleteComment = null;
            HyperLink lblAuthor = null;
            HtmlGenericControl spanComment = null;
            Image imgComment = null;
            HtmlGenericControl dvExpand = null;
            string sParentURLFormat = "{0}/{1}";

            try
            {
                int iIndex = 0;
                string sActorID = string.Empty;
                string sActorName = string.Empty;
                //safe check
                if (e.Row.RowType != DataControlRowType.DataRow)
                    return;
                hdnPostIndex = (HiddenField)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_HDNPOSTINDEX);
                lblCommentIndex = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLCOMMENTINDEX);
                lblPostIndex = (Label)((GridView)sender).Parent.FindControl(SFConstants.CONST_CTRL_LBLPOSTINDEX);
                spanComment = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_SPAN_COMMENT);
                imgComment = (Image)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_IMGCOMMENT);
                dvExpand = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_DVEXPAND);

                hdnPostIndex.Value = lblPostIndex.Text;
                iIndex = Convert.ToInt32(hdnPostIndex.Value);

                lblAuthor = (HyperLink)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLAUTHOR);
                olistAllFeeds = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;
                btnDeleteComment = (ImageButton)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_BTNDELETECOMMENT);
                e.Row.Attributes.Add(SFConstants.CONST_MOUSEOVER, string.Format(SFConstants.CONST_Show_DeleteImg_Format, btnDeleteComment.ClientID));
                //// when mouse leaves the row, change the bg color to its original value   
                e.Row.Attributes.Add(SFConstants.CONST_MOUSEOUT, string.Format(SFConstants.CONST_Hide_DeleteImg_Format, btnDeleteComment.ClientID));
                btnDeleteComment.Attributes.Add(SFConstants.CONST_EVENT_ON_CLICK, "return CnfrmCmntDel();");

                sActorID = olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].User.ID;
                sActorName = olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].User.Name;
                sPhotoURL = olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].User.Photo.SmallPhotoURL;

                lblAuthor.NavigateUrl = string.Format(sParentURLFormat, m_oUserEntities.InstanceURL, sActorID);
                lblAuthor.Text = sActorName;

                if (!sPhotoURL.Contains(SFConstants.CONST_HTTP))
                {
                    sPhotoURL = string.Format(sPhotoURLFormat, m_oUserEntities.InstanceURL, sPhotoURL);
                }

                imgComment.ImageUrl = string.Format(SFConstants.CONST_sOAuth_Token, sPhotoURL,
                                        ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString());

                if (olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].User.MySubscription != null)
                {
                    sFollow = SFConstants.CONST_NO;
                    sSubscriptionUrl = olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].User.MySubscription.URL;
                }
                else
                {
                    sFollow = SFConstants.CONST_YES;
                    sSubscriptionUrl = string.Empty;
                }

                sPhoneNumber = GetPhoneNumber(sActorID);
                imgComment.Attributes.Add(SFConstants.CONST_MOUSEOVER, string.Format(SFConstants.CONST_MouseToolTip_Format, imgComment.ClientID, imgComment.ImageUrl, sActorID, sActorName, sFollow, sPhoneNumber, sSubscriptionUrl,
                    olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].User.IsChatterGuest.ToString()));
                lblAuthor.Attributes.Add(SFConstants.CONST_MOUSEOVER, string.Format(SFConstants.CONST_MouseToolTip_Format, lblAuthor.ClientID, imgComment.ImageUrl, sActorID, sActorName, sFollow, sPhoneNumber, sSubscriptionUrl,
                    olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].User.IsChatterGuest.ToString()));

                //Keep More Position
                if (!string.IsNullOrEmpty(hdnMoreFeedId.Value))
                {
                    if (hdnMoreFeedId.Value.Contains(olistAllFeeds[iIndex].Comments.Comments[Convert.ToInt32(lblCommentIndex.Text)].ID))
                    {
                        if (dvExpand != null)
                        {
                            dvExpand.Attributes[SFConstants.CONST_CLASS] = SFConstants.CONST_USERS_COMMENT;
                            dvExpand.Attributes[SFConstants.CONST_HEIGHT] = SFConstants.CONST_AUTO;
                            Label lblMoreSpace = new Label();
                            lblMoreSpace.Text = "<br/>&nbsp;";
                            spanComment.Controls.Add(lblMoreSpace);
                        }
                    }
                }

                #region Comment Format
                FeedItem oFeedItem = olistAllFeeds[int.Parse(hdnPostIndex.Value)];
                int iRowIndex = e.Row.RowIndex;
                MessageSegments[] oMessaageSegments = oFeedItem.Comments.Comments[iRowIndex].Body.MessageSegments;
                BuildFeedNCommentBody(oMessaageSegments, spanComment, iIndex);

                #endregion


            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// RowDataBound event for gvFeedList Gridview
        /// </summary>
        protected void gvFeedList_RowDataBound(object sender, GridViewRowEventArgs e)
        {
            #region private variables
            int iIndex = 0;
            string sLikeText = string.Empty;
            string sClientInfoFormat = "{0} via {1}";
            string sPhotoURL = string.Empty;
            string sPhotoURLFormat = "{0}/{1}";
            string sParentURLFormat = "{0}/{1}";

            GridView gvFeedComments = null;
            Label lblLike = null;
            Label lblCreatedDate = null;
            HtmlGenericControl divActivity = null;
            TextBox txtComment = null;
            TextBox txtSLComment = null;
            ImageButton btnComment = null;
            Label lblLengthError = null;
            Label lblFeedError = null;
            Image imgCommentNew = null;
            HiddenField hdnFeedId = null;
            HiddenField hdnRowIndex = null;
            Image imgPic = null;
            LinkButton lnkShowAllComments = null;
            HyperLink lblParent = null;
            HyperLink lblActor = null;
            Label lblFileName = null;
            Label lblFileDesc = null;
            HyperLink lblLinkName = null;
            Label lblLinkUrl = null;
            LinkButton lnkLike = null;
            LinkButton lnkUnlike = null;
            Control divLike = null;
            Control divFileInfo = null;
            Control divCBox = null;
            Control divLinkInfo = null;
            HtmlGenericControl dslComment = null;
            HtmlGenericControl divShowAllComments = null;
            HtmlGenericControl divCommentList = null;
            HtmlGenericControl divDComment = null;
            HtmlGenericControl divEComment = null;
            HtmlGenericControl spanFeed = null;
            ImageButton btnDeletePost = null;
            HtmlGenericControl dvExpand = null;
            bool bIsLikedByCurrentUser = false;

            Image imgFile = null;
            int iLikesTotalCount = 0;
            bool bIsLoggedUserLiked = false;
            string sMyLikeID = string.Empty;

            #endregion

            try
            {
                //safe check
                if (e.Row.RowType != DataControlRowType.DataRow)
                    return;

                iIndex = e.Row.RowIndex;

                //Find Feed Comments control
                gvFeedComments = (GridView)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_GVCOMMENTLIST);
                lblLike = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLLIKES);
                lblCreatedDate = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLCREATEDDATE);
                divActivity = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_DIVACTIVITY);
                hdnFeedId = (HiddenField)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_HDNFEEDID);
                hdnRowIndex = (HiddenField)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_HDNROWINDEX);
                imgPic = (Image)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_IMGPIC);
                txtComment = (TextBox)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_TBCOMMENT);
                btnComment = (ImageButton)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_BTNCOMMENT);
                lblLengthError = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLLENGTHERROR);
                lnkShowAllComments = (LinkButton)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LINKSHOWALLCOMMENTS);
                lblFeedError = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_FEEDERROR);
                lblParent = (HyperLink)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLPARENT);
                lblActor = (HyperLink)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLACTOR);
                imgCommentNew = (Image)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_IMAGECOMMENTNEW);
                imgCommentNew.ImageUrl = hdnMyImageUrl.Value;
                divLike = (Control)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LIKE);
                divCBox = (Control)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_COMMENTBOX);
                dslComment = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_SINGLE_LINE_COMMENT);
                divShowAllComments = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_SHOW_ALL_COMMENTS);
                divCommentList = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_DIV_COMMENT_LIST);
                divDComment = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_DIV_DISABLE_COMMENT);
                divEComment = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_DIV_ENABLE_COMMENT);
                txtSLComment = (TextBox)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_TXTSINGLELINE);
                spanFeed = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_SPAN_FEED);
                dvExpand = (HtmlGenericControl)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_DVEXPAND);

                //Build Feed Body
                MessageSegments[] oMessaageSegments = olistAllFeeds[iIndex].Body.MessageSegments;
                BuildFeedNCommentBody(oMessaageSegments, spanFeed, iIndex);

                btnDeletePost = (ImageButton)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_BTNDELETEPOST);
                e.Row.Attributes.Add(SFConstants.CONST_MOUSEOVER, string.Format(SFConstants.CONST_Show_DeleteImg_Format, btnDeletePost.ClientID));
                //// when mouse leaves the row, change the bg color to its original value   
                e.Row.Attributes.Add(SFConstants.CONST_MOUSEOUT, string.Format(SFConstants.CONST_Hide_DeleteImg_Format, btnDeletePost.ClientID));
                btnDeletePost.Attributes.Add(SFConstants.CONST_EVENT_ON_CLICK, "return CnfrmPostDel();");


                if (!olistAllFeeds[iIndex].Actor.Name.Equals(olistAllFeeds[iIndex].Parent.Name))
                {
                    lblParent.Text = string.Format(SFConstants.CONST_TWO_PARAM_FORMAT, olistAllFeeds[iIndex].Parent.Name, " - ");
                    lblParent.NavigateUrl = string.Format(sParentURLFormat, m_oUserEntities.InstanceURL, olistAllFeeds[iIndex].Parent.ID);
                }

                //Actor Url Bind 
                lblActor.NavigateUrl = string.Format(sParentURLFormat, m_oUserEntities.InstanceURL, olistAllFeeds[iIndex].Actor.ID);

                sPhotoURL = olistAllFeeds[iIndex].PhotoURL;
                if (!sPhotoURL.Contains(SFConstants.CONST_HTTP))
                {
                    sPhotoURL = string.Format(sPhotoURLFormat, m_oUserEntities.InstanceURL, sPhotoURL);
                }

                //User Image Bind
                imgPic.ImageUrl = string.Format(SFConstants.CONST_sOAuth_Token, sPhotoURL, ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString());

                // If Feed User and Logged in user is same don't show Follow, UnFollow 
                // and Send Message buttons                

                // If Feed User is not having followers disable UnFollow User
                if (olistAllFeeds[iIndex].Actor.MySubscription != null)
                {
                    sFollow = SFConstants.CONST_NO;
                    sSubscriptionUrl = olistAllFeeds[iIndex].Actor.MySubscription.URL;
                }
                else
                {
                    sFollow = SFConstants.CONST_YES;
                    sSubscriptionUrl = string.Empty;
                }

                sPhoneNumber = GetPhoneNumber(olistAllFeeds[iIndex].Actor.ID);

                imgPic.Attributes.Add(SFConstants.CONST_MOUSEOVER, string.Format(SFConstants.CONST_MouseToolTip_Format,
                   imgPic.ClientID,
                   imgPic.ImageUrl,
                   olistAllFeeds[iIndex].Actor.ID,
                   olistAllFeeds[iIndex].Actor.Name,
                   sFollow,
                   sPhoneNumber, sSubscriptionUrl, olistAllFeeds[iIndex].Actor.IsChatterGuest.ToString()));
                lblActor.Attributes.Add(SFConstants.CONST_MOUSEOVER, string.Format(SFConstants.CONST_MouseToolTip_Format, lblActor.ClientID, imgPic.ImageUrl, olistAllFeeds[iIndex].Actor.ID, olistAllFeeds[iIndex].Actor.Name, sFollow, sPhoneNumber, sSubscriptionUrl, olistAllFeeds[iIndex].Actor.IsChatterGuest.ToString()));


                //Set row index
                hdnRowIndex.Value = e.Row.RowIndex.ToString();

                //Link Div Visibility
                divLinkInfo = (Control)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_DIVLINKINFO);
                lblLinkName = (HyperLink)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLLINKNAME);
                lblLinkUrl = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLLINKURL);

                if (olistAllFeeds[iIndex].Type == "LinkPost")
                {
                    divLinkInfo.Visible = true;
                    if (olistAllFeeds[iIndex].Attachment != null)
                    {
                        lblLinkName.Text = olistAllFeeds[iIndex].Attachment.Title;
                        lblLinkName.NavigateUrl = olistAllFeeds[iIndex].Attachment.URL;
                        lblLinkUrl.Text = olistAllFeeds[iIndex].Attachment.URL;
                    }
                }

                //file Panel visibility
                lblFileName = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLFILENAME);
                lblFileDesc = (Label)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LBLFILEDESC);
                divFileInfo = (Control)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_FILEINFO);
                imgFile = (Image)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_IMGFILE);

                if (olistAllFeeds[iIndex].Type == "ContentPost")
                {
                    divFileInfo.Visible = true;
                    if (olistAllFeeds[iIndex].Attachment != null)
                    {
                        lblFileName.Text = olistAllFeeds[iIndex].Attachment.Title;
                        lblFileDesc.Text = olistAllFeeds[iIndex].Attachment.Description;
                        imgFile.ImageUrl = string.Format(SFConstants.CONST_TWO_PARAM_FORMAT, SPContext.Current.Web.Url,
                            SalesForce.ChatterMiddleTier.Utility.GetFileImageURL(olistAllFeeds[iIndex].Attachment.FileType.ToString()));
                    }
                    else
                    {
                        lblFileDesc.Text = SFConstants.CONST_FILE_REMOVED_MSG;

                        imgFile.ImageUrl = string.Format(SFConstants.CONST_TWO_PARAM_FORMAT, SPContext.Current.Web.Url,
                            SFConstants.CONST_NO_IMG);
                    }
                }

                divShowAllComments.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                //Show more comments link visibility
                if (string.Compare(hdnSearchFlag.Value, "true") == 0)
                {
                    if (olistAllFeeds[iIndex].Comments.Total == 1 && olistAllFeeds[iIndex].Comments.Comments.Length == 0)
                    {
                        divShowAllComments.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                        lnkShowAllComments.Text = SFConstants.CONST_ONE_COMMENT;
                    }
                    else if (olistAllFeeds[iIndex].Comments.Total > 1)
                        divShowAllComments.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                }
                else
                {
                    if (olistAllFeeds[iIndex].Comments.Total > 3)
                        divShowAllComments.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                }

                if (!string.IsNullOrEmpty(hdnShowFeedID.Value))
                {
                    if (olistAllFeeds[iIndex].Comments.Total == 1)
                    {
                        lnkShowAllComments.Text = SFConstants.CONST_ONE_COMMENT;
                    }
                    if (hdnShowFeedID.Value.Contains(olistAllFeeds[iIndex].id))
                    {
                        divShowAllComments.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                    }
                    else
                    {
                        if (olistAllFeeds[iIndex].Comments.Total == 1 && olistAllFeeds[iIndex].Comments.Comments.Length == 1)
                        {
                            divShowAllComments.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                        }
                        else if (olistAllFeeds[iIndex].Comments.Total > 0)
                        {
                            divShowAllComments.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                        }
                    }
                }

                //Keep More Position
                if (!string.IsNullOrEmpty(hdnMoreFeedId.Value))
                {
                    if (hdnMoreFeedId.Value.Contains(olistAllFeeds[iIndex].id))
                    {
                        if (dvExpand != null)
                        {
                            dvExpand.Attributes[SFConstants.CONST_CLASS] = SFConstants.CONST_USERS_COMMENT;
                            dvExpand.Attributes[SFConstants.CONST_HEIGHT] = SFConstants.CONST_AUTO;
                            Label lblMoreSpace = new Label();
                            lblMoreSpace.Text = "<br/>&nbsp;";
                            spanFeed.Controls.Add(lblMoreSpace);
                        }
                    }
                }

                lnkLike = (LinkButton)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LINKLIKE);
                lnkUnlike = (LinkButton)e.Row.Cells[0].FindControl(SFConstants.CONST_CTRL_LINKUNLIKE);

                iLikesTotalCount = olistAllFeeds[iIndex].Likes.Likes.ToList().Count;
                if (olistAllFeeds[iIndex].CurrentUserLike != null)
                {
                    bIsLoggedUserLiked = true;
                    sMyLikeID = olistAllFeeds[iIndex].CurrentUserLike.ID;
                }

                if (iLikesTotalCount > 0)
                {
                    lblLike.Text = GetFeedLikesText(olistAllFeeds[iIndex].id, sMyLikeID, olistAllFeeds[iIndex].Likes.Likes.ToList(), iLikesTotalCount, bIsLoggedUserLiked);
                }

                if (string.IsNullOrEmpty(lblLike.Text.Trim()))
                    divLike.Visible = false;

                if (olistAllFeeds[iIndex].Comments.Total > 0)
                    dslComment.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                else
                    dslComment.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);

                // Check if current user likes the feed
                if (bIsLoggedUserLiked)
                {
                    // Show Unlike link and hide Like link
                    lnkLike.Visible = false;
                    lnkUnlike.Visible = true;
                }
                else
                {
                    // Show Like link and hide Unlike link
                    lnkLike.Visible = true;
                    lnkUnlike.Visible = false;
                }

                if (olistAllFeeds[iIndex].ClientInfo != null)
                    lblCreatedDate.Text = string.Format(sClientInfoFormat, lblCreatedDate.Text,
                                                       olistAllFeeds[iIndex].ClientInfo.ApplicationName);

                #region Bind Comments
                int iCommentsCount = 0;
                iCommentsCount = olistAllFeeds[iIndex].Comments.Total;
                //Bind data only if comments are available
                if (olistAllFeeds[iIndex].Comments.Comments.Length != 0)
                {
                    List<Comments> oComments = olistAllFeeds[iIndex].Comments.Comments.ToList();

                    gvFeedComments.DataSource = oComments;
                    gvFeedComments.DataBind();
                }
                else if (string.IsNullOrEmpty(lblLike.Text) && iCommentsCount == 0)
                    divActivity.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);

                if (iCommentsCount > 0)
                    divCommentList.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);

                #endregion
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// Event is used to delete Post
        /// </summary>
        protected void btnDeletePost_Click(object sender, ImageClickEventArgs e)
        {
            ImageButton btnSender = null;
            Control ctrlParent = null;
            HiddenField hdnFeedId = null;
            Label lblFeedError = null;
            HiddenField hdnRowIndex = null;

            string sAPIResponse = string.Empty;
            int iRowIndex = 0;
            try
            {
                // find controls
                btnSender = (ImageButton)sender;
                ctrlParent = btnSender.Parent;
                hdnFeedId = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNFEEDID);
                hdnRowIndex = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNROWINDEX);
                lblFeedError = (Label)ctrlParent.FindControl(SFConstants.CONST_CTRL_FEEDERROR);

                btnSender.Enabled = false;

                //Set API infromation from viewstate 
                SetAPIInfoFrmVS();
                lblFeedError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                sAPIResponse = m_oChatterRESTAPI.DeleteThisPost(hdnFeedId.Value);

                //Clear status
                m_oChatterRESTAPI.ClearMyStatus();

                iRowIndex = Convert.ToInt32(hdnRowIndex.Value);
                List<FeedItem> olistFeed = new List<FeedItem>();
                olistFeed = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;
                olistFeed.RemoveAt(iRowIndex);
                ViewState[SFConstants.CONST_VS_FEEDDATA] = olistFeed;
                olistAllFeeds = olistFeed;
                BindFeedGrid();

            }
            catch (WebException webex)
            {
                if (webex.Message.Contains("404"))
                {
                    ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";
                    lblFeedError.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNDELETEPOST_CLICK, webex.Message,
                        SFConstants.CONST_POSTDELETED_ERR_MSG);
                    lblFeedError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                }
                else
                {
                    m_oSFChatterBAL.HandleError(SFConstants.CONST_ACCESS_DENIED);
                    btnSender.Enabled = true;
                    ScriptManager.RegisterClientScriptBlock(Page, typeof(Page), "ChatterDeletePost",
                        string.Format(SFConstants.CONST_THREE_PARAM_FORMAT, "alert('", SFConstants.CONST_ACCESS_DENIED, "');"), true);
                }
            }
            catch (Exception ex)
            {
                lblFeedError.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNDELETEPOST_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                lblFeedError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
            }
        }

        /// <summary>
        /// Event is used to delete comment
        /// </summary>
        protected void btnDeleteComment_Click(object sender, ImageClickEventArgs e)
        {
            ImageButton btnSender = null;
            Control ctrlParent = null;
            HiddenField hdnCommentId = null;
            HiddenField hdnPostIndex = null;
            HtmlGenericControl divActivity = null;
            HtmlGenericControl divCommentList = null;
            HtmlGenericControl dslComment = null;
            HtmlGenericControl divShowAllComments = null;
            LinkButton lnkShowAllComments = null;

            string sAPIResponse = string.Empty;
            Label lblCommentIndex = null;
            Label lblPostIndex = null;
            Label lblLike = null;
            int iPostIndex = 0;
            int iCommentIndex = 0;
            int iCommentsCount = 0;
            List<Comments> oCommentList = new List<Comments>();
            try
            {
                // find controls
                btnSender = (ImageButton)sender;
                ctrlParent = btnSender.Parent;
                hdnCommentId = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNCOMMENTID);
                hdnPostIndex = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNPOSTINDEX);
                lblCommentIndex = (Label)ctrlParent.FindControl(SFConstants.CONST_CTRL_LBLCOMMENTINDEX);
                lblPostIndex = (Label)ctrlParent.Parent.Parent.FindControl(SFConstants.CONST_CTRL_LBLPOSTINDEX);

                btnSender.Enabled = false;

                //Set API infromation from viewstate 
                SetAPIInfoFrmVS();

                sAPIResponse = m_oChatterRESTAPI.DeleteThisComment(hdnCommentId.Value);

                iCommentIndex = Convert.ToInt32(lblCommentIndex.Text);
                iPostIndex = Convert.ToInt32(hdnPostIndex.Value);

                List<FeedItem> olistFeed = new List<FeedItem>();
                olistFeed = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;

                oCommentList = olistFeed[iPostIndex].Comments.Comments.ToList();
                oCommentList.RemoveAt(iCommentIndex);
                olistFeed[iPostIndex].Comments.Comments = oCommentList.ToArray();
                ViewState[SFConstants.CONST_VS_FEEDDATA] = olistFeed;

                olistFeed[iPostIndex].Comments.Total = olistFeed[iPostIndex].Comments.Total - 1;

                iCommentsCount = olistFeed[iPostIndex].Comments.Total;

                divActivity = (HtmlGenericControl)gvFeed.Rows[iPostIndex].FindControl(SFConstants.CONST_CTRL_DIVACTIVITY);
                divCommentList = (HtmlGenericControl)gvFeed.Rows[iPostIndex].FindControl(SFConstants.CONST_CTRL_DIV_COMMENT_LIST);
                lblLike = (Label)gvFeed.Rows[iPostIndex].FindControl(SFConstants.CONST_CTRL_LBLLIKES);
                dslComment = (HtmlGenericControl)gvFeed.Rows[iPostIndex].FindControl(SFConstants.CONST_CTRL_SINGLE_LINE_COMMENT);
                lnkShowAllComments = (LinkButton)gvFeed.Rows[iPostIndex].FindControl(SFConstants.CONST_CTRL_LINKSHOWALLCOMMENTS);
                divShowAllComments = (HtmlGenericControl)gvFeed.Rows[iPostIndex].FindControl(SFConstants.CONST_CTRL_SHOW_ALL_COMMENTS);

                GridView gvCommentList = gvFeed.Rows[iPostIndex].FindControl(SFConstants.CONST_CTRL_GVCOMMENTLIST) as GridView;


                if (divShowAllComments.Style["display"].Equals("block"))
                {
                    lnkShowAllComments.Text = string.Format(SFConstants.CONST_sShowComments, iCommentsCount.ToString());
                }

                if (iCommentsCount > 0)
                {
                    gvCommentList.DataSource = oCommentList;
                    gvCommentList.DataBind();
                    divCommentList.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                    dslComment.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                }
                else
                {
                    dslComment.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                    divCommentList.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                    if (string.IsNullOrEmpty(lblLike.Text))
                        divActivity.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                }
            }
            catch (WebException webex)
            {
                if (webex.Message.Contains("404"))
                {
                    ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";
                    lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNDELETECOMMENT_CLICK, webex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                }
                else
                {
                    m_oSFChatterBAL.HandleError(SFConstants.CONST_ACCESS_DENIED);
                    btnSender.Enabled = true;
                    ScriptManager.RegisterClientScriptBlock(Page, typeof(Page), "ChatterDeleteComment",
                        string.Format(SFConstants.CONST_THREE_PARAM_FORMAT, "alert('", SFConstants.CONST_ACCESS_DENIED, "');"), true);
                }
            }
            catch (Exception ex)
            {
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNDELETECOMMENT_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
            }
        }

        /// <summary>
        /// Event is used to clear status
        /// </summary>
        protected void lnkStatusClear_Click(object sender, EventArgs e)
        {
            try
            {
                SetAPIInfoFrmVS();
                m_oChatterRESTAPI.ClearMyStatus();
                lblUserStatusDetail.Text = string.Empty;
                lnkStatusClear.Visible = false;
            }
            catch (WebException webex)
            {
                if (webex.Message.Contains("404"))
                {
                    ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";
                    lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_LNKSTATUSCLEAR_CLICK, webex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                }
                else
                {
                    HandleException(webex);
                }
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.OrgException);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_LNKSTATUSCLEAR_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
            }
        }

        /// <summary>
        /// Event is used to share new post
        /// </summary>
        protected void imgbtnShare_Click(object sender, ImageClickEventArgs e)
        {
            lblExceptions.Text = string.Empty;
            FeedItem oFeedItem = null;
            string sLinkURL = string.Empty;
            string sFilePost = SFConstants.CONST_FilePost;
            string SLinkPost = SFConstants.CONST_LinkPost;
            bool IsPostSuccess = false;
            string sURLName = string.Empty;
            try
            {
                lblExceptions.Visible = false;
                lblExceptionTop.Visible = false;
                m_oUserEntities = (GlobalEntities)ViewState[SFConstants.CONST_VS_GLOBALENTITIES];

                txtNewFeed.Text = txtNewFeed.Text.Replace("\r\n", "\n");

                SetAPIInfoFrmVS();

                if (string.Compare(hdnSearchFlag.Value, "true") == 0)
                    ViewState[SFConstants.CONST_VS_FEEDDATA] = null;


                if (hdnSharePointFilePath.Value.ToString().Equals("FromLink"))
                {
                    if (!string.IsNullOrEmpty(txtNewFeed.Text) && txtNewFeed.Text != SFConstants.CONST_DEFAULTMESSAGE)
                        SLinkPost = txtNewFeed.Text;
                    if (!string.IsNullOrEmpty(txtLinkUrl.Text.Trim()))
                    {
                        if (txtLinkUrl.Text.Contains("http"))
                        {
                            sLinkURL = txtLinkUrl.Text;
                        }
                        else
                        {
                            sLinkURL = string.Format(SFConstants.CONST_TWO_PARAM_FORMAT, "http://", txtLinkUrl.Text);
                        }

                        if (!string.IsNullOrEmpty(txtLinkName.Text))
                            sURLName = txtLinkName.Text;
                        oFeedItem = m_oChatterRESTAPI.PostLinkToMyWall(sLinkURL, sURLName, SLinkPost, hdnMentionsUserList.Value);
                        IsPostSuccess = true;
                    }
                }
                else
                {
                    if (!hdnSharePointFilePath.Value.Contains("From"))
                    {
                        if (string.IsNullOrEmpty(txtNewFeed.Text.Trim()))
                            return;

                        if (!string.IsNullOrEmpty(txtNewFeed.Text.Trim()) && txtNewFeed.Text.Trim() != SFConstants.CONST_DEFAULTMESSAGE)
                        {
                            oFeedItem = m_oChatterRESTAPI.PostToMyWall(hdnMentionsUserList.Value, txtNewFeed.Text.Trim());
                            IsPostSuccess = true;

                            if (oFeedItem.Body.Text != null)
                            {
                                lblUserStatusDetail.Text = oFeedItem.Body.Text;
                                lnkStatusClear.Visible = true;
                            }
                        }
                    }
                    else
                    {
                        //If Hidden field contans value as FromComputer then get the file from Computer and upload it to Chatter
                        if (hdnSharePointFilePath.Value.Contains("FromComputer"))
                        {
                            string sFilepath = string.Empty;

                            if (!string.IsNullOrEmpty(txtNewFeed.Text) && txtNewFeed.Text != SFConstants.CONST_DEFAULTMESSAGE)
                                sFilePost = txtNewFeed.Text;


                            if (fplUpload.PostedFile.ContentLength > 104857600)
                            {
                                lblFileCheck.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                                lblFileCheck.Text = SFConstants.CONST_FileSizeErr;
                                compUploadDiv.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                                return;
                            }

                            oFeedItem = m_oSFChatterBAL.UploadFile(fplUpload.PostedFile.InputStream, fplUpload.PostedFile.FileName, txtFileName.Text, txtDescription.Text, sFilePost, string.Empty, m_oChatterRESTAPI, hdnMentionsUserList.Value);
                            IsPostSuccess = true;
                        }
                        //Else if Hidden field contans value as FromSharePoint then get the file from SharePoint and upload it to Chatter
                        else
                        {
                            string[] arrFilePathWebGUID = hdnSharePointFilePath.Value.Split('#');
                            SPFile oFileToUpload = null;

                            if (string.IsNullOrEmpty(arrFilePathWebGUID[(int)SFConstants.enSPFilePath.SPWebGUID]))
                                return;

                            using (SPSite oCurrentSite = new SPSite(SPContext.Current.Site.ID))
                            {
                                using (SPWeb oCurrentWeb = oCurrentSite.OpenWeb(new Guid(arrFilePathWebGUID[(int)SFConstants.enSPFilePath.SPWebGUID])))
                                {
                                    oCurrentWeb.AllowUnsafeUpdates = true;
                                    oFileToUpload = oCurrentWeb.GetFile(arrFilePathWebGUID[(int)SFConstants.enSPFilePath.FilePath]);

                                    if (!string.IsNullOrEmpty(txtNewFeed.Text) && txtNewFeed.Text != SFConstants.CONST_DEFAULTMESSAGE)
                                        sFilePost = txtNewFeed.Text;

                                    byte[] byteFileData = oFileToUpload.OpenBinary();
                                    oFeedItem = m_oChatterRESTAPI.UploadFile(byteFileData, oFileToUpload.Name, txtDescription.Text, sFilePost, string.Empty, hdnMentionsUserList.Value);
                                    IsPostSuccess = true;
                                }
                            }
                        }

                    }
                }
                if (string.Compare(hdnSearchFlag.Value, "true") == 0)
                {
                    hdnSearchFlag.Value = "false";
                    btnLogin_Click(sender, e);
                    txtFeedNCommentSearch.Value = string.Empty;
                    return;
                }

                if (string.Compare(lblFilter.Text, SFConstants.CONST_MYCHATTER) == 0)
                    BindFeedGrid(oFeedItem);
                else
                    SetFilter(SFConstants.CONST_MYCHATTER, hdnMyChatterUrl.Value);

                txtNewFeed.Text = SFConstants.CONST_DEFAULTMESSAGE;
                //clear Mentions list in hidden variable
                hdnMentionsUserList.Value = string.Empty;
            }
            catch (WebException webex)
            {
                HandleException(webex);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("404"))
                {
                    try
                    {
                        ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";
                        LoadAllChatterFeeds(SFConstants.enFeedState.AutoRefresh, SFConstants.enFilterType.Filter, hdnFilterUrl.Value, string.Empty);
                    }
                    catch (Exception exp)
                    {
                        txtNewFeed.Text = SFConstants.CONST_DEFAULTMESSAGE;
                        SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                        lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_IMGBTNSHARE_CLICK, exp.Message, SFConstants.CONST_GENERIC_ERR_MSG);

                    }
                }
                else
                {
                    txtNewFeed.Text = SFConstants.CONST_DEFAULTMESSAGE;
                    SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                    lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_IMGBTNSHARE_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                }
            }

            finally
            {
                //Set value of hidden field back to null
                hdnSharePointFilePath.Value = string.Empty;
                txtDescription.Text = string.Empty;
                divFilter.Visible = true;
                lblFeedInfo.Visible = false;
            }
        }

        /// <summary>
        /// Event is used to Login 
        /// </summary>
        protected void btnLogin_Click(object sender, ImageClickEventArgs e)
        {
            LinkButton lnkFilter = null;
            try
            {
                GetChatterAPINUSERInfoFRMVS();

                BindFeedFilterList();

                lnkFilter = (LinkButton)rptFeedFilter.Items[0].FindControl(SFConstants.CONST_CTRL_LNKFILTER);
                hdnFilterUrl.Value = lnkFilter.CommandArgument;
                txtFeedNCommentSearch.Value = string.Empty;

                SetControlVisibility(SFConstants.enControlVisibility.Authenticated);
                GetLoggedInUserDetails();

                divNewComment.Visible = true;
                divAttachFile.Visible = true;
                SetControlVisibility(SFConstants.enControlVisibility.GroupSelection);
                SetControlVisibility(SFConstants.enControlVisibility.AllChatterSelection);
                LoadAllChatterFeeds(SFConstants.enFeedState.FilterChange, SFConstants.enFilterType.Filter, hdnFilterUrl.Value, string.Empty);

                tmrAutoRefresh.Enabled = true;
                tmrAccessToken.Enabled = true;
                tmrAutoRefresh.Interval = m_oChatterRESTAPI.AutoRefreshTimer;
                tmrAccessToken.Interval = SFConstants.CONST_TimeInterval;

                RegExpLinkValidator.Enabled = false;
            }
            catch (WebException webex)
            {
                HandleLoginException(webex);
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.OrgException);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNLOGIN_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
            }
        }

        /// <summary>
        /// Event is used to Swith user
        /// </summary>
        protected void btnSwitchUser_Click(object sender, ImageClickEventArgs e)
        {
            try
            {
                hdnMyEmailID.Value = string.Empty;
                divOtherUser.Visible = false;
                this.Page.ClientScript.RegisterClientScriptBlock(this.GetType(), "ChatterOtherUserLogin",
                    string.Format(SFConstants.CONST_FIVE_PARAM_FORMAT, "var WebRelativeUrl='", SPContext.Current.Web.Url,
                    "'; var btnChatterLoginID = '", divChatterFstLogin.ClientID, "';"), true);
                this.Page.ClientScript.RegisterStartupScript(this.GetType(), "ChatterSwitchUser", "btnOnClientClick();", true);
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.OrgException);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNSWITCHUSER_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
            }
        }

        /// <summary>
        /// LogOut Event
        /// </summary>
        protected void lnkLogOut_Click(object sender, EventArgs e)
        {
            try
            {
                SetControlVisibility(SFConstants.enControlVisibility.LogOut);
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_LNKLOGOUT_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
            }
        }

        /// <summary>
        /// Show More Feeds Event
        /// </summary>
        protected void btnShowMoreFeeds_Click(object sender, EventArgs e)
        {
            try
            {
                LoadAllChatterFeeds(SFConstants.enFeedState.ShowMoreFeed, SFConstants.enFilterType.Filter, string.Empty, string.Empty);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("404"))
                {
                    try
                    {
                        ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";
                        LoadAllChatterFeeds(SFConstants.enFeedState.AutoRefresh, SFConstants.enFilterType.Filter, hdnFilterUrl.Value, string.Empty);
                    }
                    catch (Exception exp)
                    {
                        lblExceptions.Visible = true;
                        lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNSHOWMOREFEEDS_CLICK, exp.Message, SFConstants.CONST_GENERIC_ERR_MSG);

                    }
                }
                else
                {
                    lblExceptions.Visible = true;
                    lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_BTNSHOWMOREFEEDS_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                }
            }

        }

        /// <summary>
        /// Event is used to handle command links
        /// </summary>
        protected void command_Click(object sender, CommandEventArgs e)
        {
            #region Members
            LinkButton lnkSender = null;
            Control ctrlParent = null;
            HiddenField hdnFeedId = null;
            Label lblLikes = null;
            Label lblFeedError = null;
            LinkButton btnLike = null;
            LinkButton btnUlike = null;
            HtmlGenericControl divActivity = null;
            GridView gvCommentList = null;
            HtmlGenericControl divShowAllComments = null;
            Control divLike = null;
            HtmlGenericControl divCommentList = null;
            ImageButton btnComment = null;
            HiddenField hdnRowIndex = null;
            Like oLike = null;
            List<Like> olikeList = null;
            bool bIsLikedByCurrentUser = false;
            int iRowIndex = 0;
            int iSearchIndex = -1;
            #endregion

            try
            {
                #region Find Controls
                lnkSender = (LinkButton)sender;
                ctrlParent = lnkSender.Parent;
                hdnFeedId = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNFEEDID);
                lblLikes = (Label)ctrlParent.FindControl(SFConstants.CONST_CTRL_LBLLIKES);
                lblFeedError = (Label)ctrlParent.FindControl(SFConstants.CONST_CTRL_FEEDERROR);
                btnUlike = (LinkButton)ctrlParent.FindControl(SFConstants.CONST_CTRL_LINKUNLIKE);
                btnLike = (LinkButton)ctrlParent.FindControl(SFConstants.CONST_CTRL_LINKLIKE);
                divActivity = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_DIVACTIVITY);
                gvCommentList = (GridView)ctrlParent.FindControl(SFConstants.CONST_CTRL_GVCOMMENTLIST);
                divShowAllComments = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_SHOW_ALL_COMMENTS);
                divLike = (Control)ctrlParent.FindControl(SFConstants.CONST_CTRL_LIKE);
                divCommentList = (HtmlGenericControl)ctrlParent.FindControl(SFConstants.CONST_CTRL_DIV_COMMENT_LIST);
                btnComment = (ImageButton)ctrlParent.FindControl(SFConstants.CONST_CTRL_BTNCOMMENT);
                hdnRowIndex = (HiddenField)ctrlParent.FindControl(SFConstants.CONST_CTRL_HDNROWINDEX);
                #endregion
                lblExceptionTop.Visible = false;

                SetAPIInfoFrmVS();

                iRowIndex = Convert.ToInt32(hdnRowIndex.Value);
                lblFeedError.Text = string.Empty;

                switch (e.CommandArgument.ToString())
                {
                    #region Case Like
                    case SFConstants.CONST_LIKE:
                        //lnkSender.Enabled = false;
                        oLike = m_oChatterRESTAPI.LikeItem(hdnFeedId.Value);
                        if (ViewState[SFConstants.CONST_VS_FEEDDATA] != null)
                        {
                            olistAllFeeds = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;
                            olikeList = olistAllFeeds[iRowIndex].Likes.Likes.ToList();
                            olikeList.Insert(olikeList.Count, oLike);

                            Reference oReference = new Reference();

                            oReference.ID = oLike.ID;
                            oReference.URL = oLike.URL;
                            olistAllFeeds[iRowIndex].CurrentUserLike = oReference;
                            olistAllFeeds[iRowIndex].Likes.Likes = olikeList.ToArray();
                            ViewState[SFConstants.CONST_VS_FEEDDATA] = olistAllFeeds;
                        }
                        lnkSender.Visible = false;
                        btnUlike.Visible = true;
                        btnUlike.Enabled = true;
                        lblLikes.Text = GetFeedLikesText(hdnFeedId.Value, oLike.ID, olistAllFeeds[iRowIndex].Likes.Likes.ToList(), olistAllFeeds[iRowIndex].Likes.Likes.ToList().Count, true);
                        divActivity.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                        divLike.Visible = true;
                        lnkSender.Enabled = true;
                        break;
                    #endregion

                    #region Case Unlike
                    case SFConstants.CONST_UNLIKE:

                        if (ViewState[SFConstants.CONST_VS_FEEDDATA] != null)
                        {
                            olistAllFeeds = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;

                        }
                        lnkSender.Enabled = false;
                        m_sMylikeID = olistAllFeeds[iRowIndex].CurrentUserLike.ID;

                        //m_oSFChatterBAL.GetFeedLikeID(m_oChatterRESTAPI.GetFeedItemLikesUpdate(hdnFeedId.Value), hdnMyUserID.Value);
                        m_oChatterRESTAPI.UnLikeItem(m_sMylikeID);
                        lnkSender.Visible = false;
                        btnLike.Visible = true;

                        olikeList = olistAllFeeds[iRowIndex].Likes.Likes.ToList();
                        olistAllFeeds[iRowIndex].CurrentUserLike = null;

                        iSearchIndex = olikeList.FindIndex(iLikeID => iLikeID.ID == m_sMylikeID);

                        if (iSearchIndex >= 0)
                        {
                            olikeList.RemoveAt(iSearchIndex);
                        }
                        olistAllFeeds[iRowIndex].Likes.Likes = olikeList.ToArray();
                        ViewState[SFConstants.CONST_VS_FEEDDATA] = olistAllFeeds;

                        if (olikeList.Count > 0)
                        {
                            lblLikes.Text = GetFeedLikesText(hdnFeedId.Value, string.Empty, olistAllFeeds[iRowIndex].Likes.Likes.ToList(), olistAllFeeds[iRowIndex].Likes.Likes.ToList().Count, false);
                        }
                        else
                        {
                            lblLikes.Text = string.Empty;
                        }


                        if (string.IsNullOrEmpty(lblLikes.Text) && gvCommentList.Rows.Count == 0)
                        {
                            divLike.Visible = false;
                            divActivity.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                        }
                        else if (string.IsNullOrEmpty(lblLikes.Text))
                            divLike.Visible = false;

                        break;
                    #endregion

                    #region Case ShowAll
                    case SFConstants.CONST_SHOWALL:
                        List<FeedItem> olistFeed = new List<FeedItem>();
                        List<Comments> oCommentList = null;
                        olistFeed = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;

                        if (ViewState[SFConstants.CONST_SHOW_MORE_FEED_ID] != null)
                            hdnShowFeedID.Value = ViewState[SFConstants.CONST_SHOW_MORE_FEED_ID] as string;

                        if (!string.IsNullOrEmpty(hdnShowFeedID.Value))
                            hdnShowFeedID.Value += "," + hdnFeedId.Value;
                        else
                            hdnShowFeedID.Value = hdnFeedId.Value;

                        ViewState[SFConstants.CONST_SHOW_MORE_FEED_ID] = hdnShowFeedID.Value;

                        oCommentList = m_oChatterRESTAPI.GetFeedItemCommentsUpdate(hdnFeedId.Value).ToList();
                        olistFeed[iRowIndex].Comments.Comments = oCommentList.ToArray();
                        ViewState[SFConstants.CONST_VS_FEEDDATA] = olistFeed;
                        BindFeedGrid();
                        break;
                    #endregion
                }
            }
            catch (WebException webex)
            {
                if (webex.Message.Contains("404"))
                {
                    ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "true";
                    lblFeedError.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_COMMAND_CLICK, webex.Message, SFConstants.CONST_POSTDELETED_ERR_MSG);
                    lblFeedError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                }
                else
                {
                    HandleException(webex);
                }
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                lblFeedError.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_COMMAND_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                lblFeedError.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
            }
        }

        /// <summary>
        /// Filter Item Command
        /// </summary>
        protected void rptFeedFilter_ItemCommand(object source, RepeaterCommandEventArgs e)
        {
            LinkButton lnkFilter = null;

            try
            {
                lnkFilter = (LinkButton)e.Item.FindControl(SFConstants.CONST_CTRL_LNKFILTER);

                SetAPIInfoFrmVS();

                SetFilter(lnkFilter.Text, lnkFilter.CommandArgument);
            }
            catch (WebException webEx) { HandleException(webEx); }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_RPTFEEDFILTER_ITEMCOMMAND, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                lblExceptions.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
            }
        }

        /// <summary>
        /// Search Feeds Event
        /// </summary>  
        protected void imgBtnSearch_Click(object sender, ImageClickEventArgs e)
        {
            try
            {
                if (string.IsNullOrEmpty(txtFeedNCommentSearch.Value))
                    return;

                hdnSearchFlag.Value = "true";
                SetAPIInfoFrmVS();
                SetControlVisibility(SFConstants.enControlVisibility.FeedSearch);
                LoadAllChatterFeeds(SFConstants.enFeedState.FilterChange, SFConstants.enFilterType.Search, string.Empty, txtFeedNCommentSearch.Value.Trim());
            }
            catch (WebException webex)
            {
                HandleException(webex);
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_IMGBTNSEARCH_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                lblExceptions.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
            }

        }

        /// <summary>
        /// Hashtag click event
        /// </summary> 
        void lnkHashtag_Click(object sender, EventArgs e)
        {
            LinkButton lnkHashtag = (LinkButton)sender;
            try
            {
                gvFeed.DataSource = null;
                gvFeed.DataBind();

                hdnSearchFlag.Value = "true";

                SetAPIInfoFrmVS();
                SetControlVisibility(SFConstants.enControlVisibility.FeedSearch);
                LoadAllChatterFeeds(SFConstants.enFeedState.FilterChange, SFConstants.enFilterType.Search, string.Empty, lnkHashtag.Text);
                txtFeedNCommentSearch.Value = string.Empty;
            }
            catch (WebException webex)
            {
                HandleException(webex);
            }
            catch (Exception ex)
            {
                SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_LNKHASHTAG_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                lblExceptions.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
            }

        }

        /// <summary>
        /// This will follow or unfollow user based on status
        /// </summary>        
        protected void lnkFollowUnFollowUser_Click(object sender, CommandEventArgs e)
        {
            Subscription m_oSubscription = null;
            string sSubscriptionUrl = hdnSubscriptionUrl.Value;
            string sPhotoURL = hdnPhotoURL.Value;
            string sActorId = hdnFollowUserID.Value;
            string sPhoneNumber = string.Empty;
            string sScript = string.Empty;
            string sActorID = string.Empty;
            string sFollow = SFConstants.CONST_NO;
            string sNewSubscriptionUrl = string.Empty;
            try
            {
                sActorID = hdnFollowUserID.Value;

                //Set API infromation from viewstate 
                SetAPIInfoFrmVS();
                List<FeedItem> olistAllFeeds = new List<FeedItem>();
                olistAllFeeds = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;

                switch (e.CommandName.ToString())
                {
                    case SFConstants.CONST_FOLLOW:
                        //Follow User
                        m_oSubscription = m_oChatterRESTAPI.FollowUser(sActorID);
                        sNewSubscriptionUrl = m_oSubscription.Subject.MySubscription.URL;
                        olistAllFeeds = SalesForce.ChatterMiddleTier.Utility.UpdateFollowStatus(olistAllFeeds, sActorID, m_oSubscription.Subject.MySubscription);
                        sFollow = SFConstants.CONST_NO;

                        break;

                    case SFConstants.CONST_UNFOLLOW:
                        //UnFollow User
                        if (!string.IsNullOrEmpty(sSubscriptionUrl))
                            m_oChatterRESTAPI.UnFollowUser(sSubscriptionUrl);
                        olistAllFeeds = SalesForce.ChatterMiddleTier.Utility.UpdateFollowStatus(olistAllFeeds, sActorID, null);
                        sFollow = SFConstants.CONST_YES;
                        break;

                    default: break;
                }

                ViewState[SFConstants.CONST_VS_FEEDDATA] = olistAllFeeds;

                //Get Phone number of user                
                sPhoneNumber = GetPhoneNumber(sActorId);

                gvFeed.DataSource = olistAllFeeds;
                gvFeed.DataBind();


                //Register JS Function to maintain Div Position
                sScript = string.Format(SFConstants.CONST_SetDivAfterClick_Format, hdnPersistDiv.Value.Substring(1, hdnPersistDiv.Value.Length - 1), sPhotoURL, sActorId, hdnFollowUserName.Value, sFollow, sPhoneNumber, sNewSubscriptionUrl, "False", hdnPosition.Value, hdnLeftPostion.Value);

                ScriptManager.RegisterStartupScript(upnlChatter, upnlChatter.GetType(), "CloseWindow", sScript, true);
            }
            catch (WebException webex)
            {
                HandleException(webex);
            }
            catch (Exception ex)
            {
                lblExceptions.Text = m_oSFChatterBAL.HandleError(SFConstants.CONST_EVENT_LNKFOLLOWUNFOLLOWUSER_CLICK, ex.Message, SFConstants.CONST_GENERIC_ERR_MSG);
                lblExceptions.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
            }
        }

        #endregion

        #region All Public Methods

        /// <summary>
        /// Method is used to Get Photo URL 
        /// </summary>
        public string GetPhotoURL(string sInputURL)
        {
            try
            {
                if (ViewState[SFConstants.CONST_ACCESS_TOKEN] != null)
                    return string.Format(SFConstants.CONST_sOAuth_Token, sInputURL, ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString());
                return string.Empty;
            }
            catch (Exception ex)
            {
                m_oSFChatterBAL.HandleError(ex.Message);
                return string.Empty;
            }
        }

        /// <summary>
        /// Method is used to get Feed Text as HTML
        /// </summary>
        public string GetFeedTextAsHtml(string sInputFeed)
        {
            try
            {
                return m_oSFChatterBAL.GetFeedTextAsHtml(sInputFeed);
            }
            catch (Exception ex)
            {
                m_oSFChatterBAL.HandleError(ex.Message);
                return string.Empty;
            }
        }

        #endregion

        #region All private methods

        /// <summary>
        /// Method to handle Login Exception
        /// </summary>
        private void HandleLoginException(WebException webex)
        {
            string sError = string.Empty;
            try
            {
                SetControlVisibility(SFConstants.enControlVisibility.OrgException);
                if (webex.Message.Contains("407"))
                    lblExceptions.Text = SFConstants.CONST_ERR_CONNECTION;
                else
                {
                    sError = m_oSFChatterBAL.HandleException(webex);
                    lblExceptions.Text = string.Concat(SFConstants.CONST_ERR_STD, sError);
                }
            }
            catch (Exception)
            {
                sError = SFConstants.CONST_ERR_STANDARD;
                lblExceptions.Text = sError;
            }
            finally
            {
                divOtherUser.Visible = false;
                divbtnLogin.Visible = false;
                divChatterFstLogin.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                btnChatterLogin.Visible = true;
            }
        }

        /// <summary>
        /// Method to handle Exception
        /// </summary>
        private void HandleException(WebException webex)
        {
            string sError = string.Empty;
            try
            {
                SetControlVisibility(SFConstants.enControlVisibility.Exceptions);
                lblExceptionTop.Visible = true;
                if (webex.Message.Contains("407"))
                    lblExceptionTop.Text = SFConstants.CONST_ERR_SHARE;
                else
                {
                    sError = m_oSFChatterBAL.HandleException(webex);
                    lblExceptionTop.Text = string.Concat("Error: ", sError);
                }
            }
            catch (Exception)
            {
                sError = SFConstants.CONST_ERR_STANDARD;
                lblExceptionTop.Text = sError;
            }
        }

        /// <summary>
        /// This method is used to get Chatter API and User Information from the viewstate
        /// </summary>
        private void GetChatterAPINUSERInfoFRMVS()
        {
            string[] arrConfigData = new string[6];
            try
            {
                m_oUserEntities = (GlobalEntities)ViewState[SFConstants.CONST_VS_GLOBALENTITIES];
                if (!string.IsNullOrEmpty(m_oUserEntities.RefreshToken))
                {
                    GetAccessToken();
                    m_oChatterRESTAPI.AccessToken = ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString();
                }

                GetChatterAPIConfigData();

                arrConfigData = (string[])ViewState[SFConstants.CONSTANT_VS_CONFIG_DATA];
                m_oChatterRESTAPI.AccessTokenAPI = arrConfigData[(int)SFConstants.enConfigData.AccessTokenAPI];
                m_oChatterRESTAPI.ChatterAPIBase = arrConfigData[(int)SFConstants.enConfigData.ChatterAPIBase];
                m_oChatterRESTAPI.AuthorizeAPI = arrConfigData[(int)SFConstants.enConfigData.AuthorizeAPI];
                m_oChatterRESTAPI.AutoRefreshTimer = Convert.ToInt32(arrConfigData[(int)SFConstants.enConfigData.AutoRefreshTimer]);
                m_oChatterRESTAPI.AutoCompleteSearchUserCount = Convert.ToInt32(arrConfigData[(int)SFConstants.enConfigData.AutoCompleteSearchUserCount]);
                m_oChatterRESTAPI.ChatterAPIEndpoint = m_oUserEntities.InstanceURL;
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// Get the name of the user who likes the feed 
        /// </summary>
        private string GetFeedLikesText(string sFeedID, string sMyLikeID, List<Like> lstAllLikes, int iTotalCount, bool bIsLoggedUserLiked)
        {

            #region Local Variables
            string sLikeText = string.Empty;
            string sMyId = hdnMyUserID.Value;
            #endregion

            try
            {
                sLikeText = m_oSFChatterBAL.GetFeedLikesText(iTotalCount, bIsLoggedUserLiked, lstAllLikes, sMyLikeID,
                                                            sFeedID, sMyId, m_oUserEntities.ConsumerKey, m_oUserEntities.ConsumerSecret, (iTotalCount - 2).ToString() /*These parameters are required for setting the 'others' text and to pass to the popup window.*/
                                                            );

                #region Set the javascript variable 'CurrentWebUrl'
                // Set the javascript variable 'CurrentWebUrl' that is used in javascript function OpenDialogForUserList()
                if (iTotalCount > 3)
                {
                    using (SPSite oSite = new SPSite(SPContext.Current.Site.ID))
                    {
                        using (SPWeb oWeb = oSite.OpenWeb(SPContext.Current.Web.ID))
                        {
                            if (!this.Page.ClientScript.IsStartupScriptRegistered("CurrentWebUrlScript"))
                                this.Page.ClientScript.RegisterClientScriptBlock(this.GetType(), "CurrentWebUrlScript", "<script type=\"text/javascript\">var CurrentWebUrl='" + oWeb.ID.ToString() + "';</script>");
                        }
                    }
                }
                #endregion

                return sLikeText;
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This function sotres configuration details into viewstate.
        /// </summary>
        private void InsertChatterAPIInfoInVS(ChatterRESTAPI oChatterRestAPI)
        {
            string[] arrConfigData = new string[6];
            try
            {
                if (ViewState[SFConstants.CONSTANT_VS_CONFIG_DATA] != null)
                    return;
                arrConfigData[(int)SFConstants.enConfigData.AccessTokenAPI] = oChatterRestAPI.AccessTokenAPI;
                arrConfigData[(int)SFConstants.enConfigData.ChatterAPIBase] = oChatterRestAPI.ChatterAPIBase;
                arrConfigData[(int)SFConstants.enConfigData.AuthorizeAPI] = oChatterRestAPI.AuthorizeAPI;
                arrConfigData[(int)SFConstants.enConfigData.AutoRefreshTimer] = oChatterRestAPI.AutoRefreshTimer.ToString();
                arrConfigData[(int)SFConstants.enConfigData.AutoCompleteSearchUserCount] = oChatterRestAPI.AutoCompleteSearchUserCount.ToString();
                ViewState[SFConstants.CONSTANT_VS_CONFIG_DATA] = arrConfigData;
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This function get logged in user's Photo url and the user ID.
        /// Store these values in hidden field variables.
        /// </summary>
        private void GetLoggedInUserDetails()
        {
            UserDetail oLoggedInUser = null;
            try
            {
                oLoggedInUser = m_oChatterRESTAPI.GetUserProfile();
                hdnMyImageUrl.Value = string.Format(SFConstants.CONST_sOAuth_Token, oLoggedInUser.Photo.SmallPhotoURL, ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString());
                hdnMyUserID.Value = oLoggedInUser.ID;

                lblUserStatus.Text = oLoggedInUser.Name;
                lblUserStatusDetail.Text = string.Empty;
                lnkStatusClear.Visible = false;

                if (oLoggedInUser.CurrentStatus == null)
                    return;
                if (oLoggedInUser.CurrentStatus.Body == null)
                    return;

                if (string.IsNullOrEmpty(oLoggedInUser.CurrentStatus.Body.Text))
                    return;

                lblUserStatusDetail.Text = oLoggedInUser.CurrentStatus.Body.Text;
                lnkStatusClear.Visible = true;
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// Get Consumer key 
        /// </summary>
        private void GetConsumerKeyDetails()
        {
            try
            {
                m_oUserEntities = new GlobalEntities();

                SFMySiteChatterWP objChatter = (SFMySiteChatterWP)this.Parent;
                m_oUserEntities.ConsumerKey = objChatter.ConsumerKey;
                m_oUserEntities.ConsumerSecret = objChatter.ConsumerSecret;
                m_oUserEntities.CallBackURL = objChatter.CallBackURL;

                string[] arrUserInfo = Utility.GetRefreshTokenDetails(m_oUserEntities.ConsumerKey);

                //If Refresh token is there in the list then use the same refresh token
                if (!string.IsNullOrEmpty(m_oUserEntities.ConsumerKey))
                {
                    lblConfigError.Visible = false;
                    if (!string.IsNullOrEmpty(arrUserInfo[(int)SFConstants.enUserInfo.REFRESHTOKEN]))
                    {
                        divChatterFstLogin.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                        btnChatterLogin.Visible = false;
                        divbtnLogin.Visible = true;
                        m_oUserEntities.RefreshToken = arrUserInfo[(int)SFConstants.enUserInfo.REFRESHTOKEN];
                        m_oUserEntities.GroupID = arrUserInfo[(int)SFConstants.enUserInfo.GROUPID];
                        m_oUserEntities.InstanceURL = arrUserInfo[(int)SFConstants.enUserInfo.INSTANCEURL];
                        divOtherUser.Visible = true;
                    }
                    else
                    {
                        divChatterFstLogin.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                        divbtnLogin.Visible = false;
                        btnChatterLogin.Visible = true;
                        divOtherUser.Visible = false;
                    }

                    ViewState[SFConstants.CONST_VS_GLOBALENTITIES] = m_oUserEntities;

                    //CustomToolPartMySite objCTP = new CustomToolPartMySite();

                    hdnCK.Value = m_oUserEntities.ConsumerKey;
                    hdnCallbackURL.Value = m_oUserEntities.CallBackURL;
                }
                else
                {
                    divbtnLogin.Visible = false;
                    btnChatterLogin.Visible = false;
                    lblConfigError.Visible = true;
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// Load chatter feeds
        /// </summary>
        private void LoadAllChatterFeeds(SFConstants.enFeedState eFeedState, SFConstants.enFilterType eFilterType, string sFeedPageURL, string sSearchText)
        {
            FeedItemPage oFeed = null;
            List<FeedItem> olistFeedVS = new List<FeedItem>();
            string sNextPageURL = string.Empty;
            bool bIsNewPageURL = false;
            bool bISNewFeed = false;
            try
            {
                m_oUserEntities = (GlobalEntities)ViewState[SFConstants.CONST_VS_GLOBALENTITIES];
                if (ViewState[SFConstants.CONST_ACCESS_TOKEN] == null)
                    ViewState[SFConstants.CONST_ACCESS_TOKEN] = m_oChatterRESTAPI.GetAccessToken(m_oUserEntities);

                m_oChatterRESTAPI.AccessToken = ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString();

                GetChatterAPINUSERInfoFRMVS();

                switch (eFeedState)
                {
                    case SFConstants.enFeedState.AutoRefresh:
                    case SFConstants.enFeedState.FilterChange:
                        ViewState[SFConstants.CONST_VS_FEEDDATA] = null;
                        bIsNewPageURL = false;
                        break;
                    case SFConstants.enFeedState.NewFeed:
                        bISNewFeed = true;
                        break;
                    case SFConstants.enFeedState.ShowMoreFeed:
                        sNextPageURL = hdnNextPageFeedURL.Value;
                        sFeedPageURL = sNextPageURL;
                        bIsNewPageURL = true;
                        break;
                }


                if (ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] != null)
                {
                    string sWebResponseErr = (string)ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR];
                    if (sWebResponseErr.Equals("true"))
                    {
                        ViewState[SFConstants.CONST_VS_FEEDDATA] = null;
                        sNextPageURL = string.Empty;
                        bIsNewPageURL = false;
                        ViewState[SFConstants.CONST_VS_WEBRESPONSE_ERR] = "false";
                    }
                }

                if (eFilterType == SFConstants.enFilterType.Filter)
                {
                    oFeed = m_oChatterRESTAPI.GetFilterFeeds(sFeedPageURL, bIsNewPageURL);
                    if (oFeed.items.Count() == 0)
                    {
                        gvFeed.DataSource = null;
                        gvFeed.DataBind();
                        SetControlVisibility(SFConstants.enControlVisibility.FilterNoUpdates);
                        return;
                    }
                    else if (oFeed.items.Count() < 4)
                    {
                        lblFeedInfo.Visible = false;
                        pnlBlank.Height = Unit.Pixel(500);
                    }
                    else
                    {
                        lblFeedInfo.Visible = false;
                        pnlBlank.Height = Unit.Pixel(0);
                    }
                }
                else
                {
                    oFeed = m_oChatterRESTAPI.SearchFeeds(sSearchText);
                    if (oFeed.items.Count() == 0)
                    {
                        gvFeed.DataSource = null;
                        gvFeed.DataBind();
                        SetControlVisibility(SFConstants.enControlVisibility.FeedSearchNoMatch);
                        return;
                    }
                    else
                        SetControlVisibility(SFConstants.enControlVisibility.FeedSearch);
                }

                olistAllFeeds = oFeed.items.ToList();

                // Bind data from the viewstate or API
                if (ViewState[SFConstants.CONST_VS_FEEDDATA] != null)
                {
                    olistFeedVS = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;
                }

                if (bISNewFeed)
                {
                    olistFeedVS.Insert(0, olistAllFeeds[0]);
                }
                else
                {
                    olistFeedVS.InsertRange(olistFeedVS.Count, olistAllFeeds);
                }

                ViewState[SFConstants.CONST_VS_FEEDDATA] = olistFeedVS;
                olistAllFeeds = olistFeedVS;

                BindFeedGrid();

                if (bISNewFeed)
                    return;

                sNextPageURL = oFeed.NextPageURL;

                if (string.IsNullOrEmpty(sNextPageURL))
                    divShowMoreFeeds.Visible = false;
                else
                {
                    divShowMoreFeeds.Visible = true;
                    hdnNextPageFeedURL.Value = sNextPageURL;
                }

            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method is used to set visiblity to controls as per selected action
        /// </summary>
        private void SetControlVisibility(SFConstants.enControlVisibility eAction)
        {
            try
            {
                switch (eAction)
                {
                    case SFConstants.enControlVisibility.Administrator:
                        divLogin.Visible = false;
                        divMain.Visible = true;
                        lblExceptions.Visible = false;
                        lblExceptionTop.Visible = false;
                        divFilter.Visible = true;
                        lblFeedInfo.Visible = false;
                        break;
                    case SFConstants.enControlVisibility.Authenticated:
                        divLogin.Visible = false;
                        divMain.Visible = true;
                        upnlChatter.Visible = true;
                        lblExceptions.Visible = false;
                        lblExceptionTop.Visible = false;
                        divFilter.Visible = true;
                        lblFeedInfo.Visible = false;
                        break;
                    case SFConstants.enControlVisibility.Load:
                        lblExceptions.Visible = false;
                        lblExceptionTop.Visible = false;
                        divLogin.Visible = true;
                        divMain.Visible = false;
                        upnlChatter.Visible = false;
                        break;
                    case SFConstants.enControlVisibility.Exceptions:
                        lblExceptions.Visible = true;
                        txtNewFeed.Text = SFConstants.CONST_DEFAULTMESSAGE;
                        txtDescription.Text = string.Empty;
                        txtFileName.Text = string.Empty;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        hdnShowFeedID.Value = string.Empty;
                        hdnSearchFlag.Value = "false";
                        break;
                    case SFConstants.enControlVisibility.AutoRefreshTimerErr:
                        upnlChatter.Visible = false;
                        txtDescription.Text = string.Empty;
                        txtFileName.Text = string.Empty;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        txtFeedNCommentSearch.Value = string.Empty;
                        txtLinkUrl.Text = string.Empty;
                        txtNewFeed.Text = string.Empty;
                        hdnShowFeedID.Value = string.Empty;
                        hdnSearchFlag.Value = "false";
                        hdnMoreFeedId.Value = string.Empty;
                        break;
                    case SFConstants.enControlVisibility.AutoRefreshTimer:
                        txtDescription.Text = string.Empty;
                        txtFileName.Text = string.Empty;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        txtFeedNCommentSearch.Value = string.Empty;
                        txtLinkUrl.Text = string.Empty;
                        hdnShowFeedID.Value = string.Empty;
                        hdnSearchFlag.Value = "false";
                        hdnMoreFeedId.Value = string.Empty;
                        divFilter.Visible = true;
                        lblFilter.Text = SFConstants.CONST_MYCHATTER;
                        lblFeedInfo.Visible = false;
                        lblErrMsg.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                        lblConfigError.Visible = false;
                        lblExceptions.Visible = false;
                        txtNewFeed.Text = SFConstants.CONST_DEFAULTMESSAGE;
                        break;
                    case SFConstants.enControlVisibility.GroupSelection:
                        upnlChatter.Visible = true;
                        lblExceptions.Visible = false;
                        lblExceptionTop.Visible = false;
                        txtNewFeed.Text = SFConstants.CONST_DEFAULTMESSAGE;
                        txtDescription.Text = string.Empty;
                        txtFileName.Text = string.Empty;
                        break;

                    case SFConstants.enControlVisibility.OrgException:
                        divLogin.Visible = true;
                        divMain.Visible = false;
                        lblExceptions.Visible = true;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        hdnShowFeedID.Value = string.Empty;
                        hdnSearchFlag.Value = "false";
                        break;
                    case SFConstants.enControlVisibility.AllChatterSelection:
                        lblExceptionTop.Visible = false;
                        divMain.Visible = true;
                        lblExceptions.Visible = false;
                        divFilter.Visible = true;
                        lblFeedInfo.Visible = false;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        lblFilter.Text = SFConstants.CONST_MYCHATTER;
                        hdnSearchFlag.Value = "false";
                        hdnMoreFeedId.Value = string.Empty;
                        break;
                    case SFConstants.enControlVisibility.ToMeSelection:
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        break;

                    case SFConstants.enControlVisibility.InValidConsumerKey:
                        divbtnLogin.Visible = false;
                        divChatterFstLogin.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                        btnChatterLogin.Visible = false;
                        lblConfigError.Visible = true;
                        divOtherUser.Visible = false;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        hdnShowFeedID.Value = string.Empty;
                        break;

                    case SFConstants.enControlVisibility.ValidConsumerKey:
                        compUploadDiv.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_NONE);
                        divbtnLogin.Visible = false;
                        divChatterFstLogin.Attributes.Add(SFConstants.CONST_STYLE, SFConstants.CONST_DISPLAY_BLOCK);
                        btnChatterLogin.Attributes.Add("onClick", "return false;");
                        btnChatterLogin.Visible = true;
                        lblConfigError.Visible = false;
                        divOtherUser.Visible = false;
                        break;
                    case SFConstants.enControlVisibility.LogOut:
                        divbtnLogin.Visible = true;
                        tmrAccessToken.Enabled = false;
                        tmrAutoRefresh.Enabled = false;
                        divShowMoreFeeds.Visible = false;
                        btnChatterLogin.Visible = false;
                        gvFeed.DataSource = null;
                        gvFeed.DataBind();
                        txtNewFeed.Text = SFConstants.CONST_DEFAULTMESSAGE;
                        SetControlVisibility(SFConstants.enControlVisibility.Load);
                        divOtherUser.Visible = true;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        hdnFilterUrl.Value = string.Empty;
                        hdnShowFeedID.Value = string.Empty;
                        hdnSearchFlag.Value = "false";
                        hdnMoreFeedId.Value = string.Empty;
                        ViewState[SFConstants.CONST_VS_FEEDDATA] = null;
                        break;

                    case SFConstants.enControlVisibility.FeedSearch:
                        lblExceptionTop.Visible = false;
                        divMain.Visible = true;
                        lblExceptions.Visible = false;
                        divFilter.Visible = false;
                        lblFeedInfo.Text = SFConstants.CONST_ALL_UPDATES;
                        lblFeedInfo.Visible = true;
                        divShowMoreFeeds.Visible = false;
                        pnlBlank.Height = Unit.Pixel(0);
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        hdnMoreFeedId.Value = string.Empty;
                        break;

                    case SFConstants.enControlVisibility.FilterNoUpdates:
                        lblFeedInfo.Text = SFConstants.CONST_NO_UPDATES;
                        lblFeedInfo.Visible = true;
                        pnlBlank.Height = Unit.Pixel(500);
                        divShowMoreFeeds.Visible = false;
                        hdnMoreFeedId.Value = string.Empty;
                        break;

                    case SFConstants.enControlVisibility.FeedSearchNoMatch:
                        lblFeedInfo.Text = SFConstants.CONST_NO_MATCH_FOUND;
                        lblFeedInfo.Visible = true;
                        pnlBlank.Height = Unit.Pixel(500);
                        divShowMoreFeeds.Visible = false;
                        //clear Mentions list in hidden variable
                        hdnMentionsUserList.Value = string.Empty;
                        hdnMoreFeedId.Value = string.Empty;
                        break;
                }
            }
            catch (Exception)
            {
                //throw;
            }
        }

        /// <summary>
        /// This method is used to set API information from view state
        /// </summary>
        private void SetAPIInfoFrmVS()
        {
            try
            {
                if (ViewState[SFConstants.CONST_VS_GLOBALENTITIES] == null)
                    GetConsumerKeyDetails();
                else
                    m_oUserEntities = (GlobalEntities)ViewState[SFConstants.CONST_VS_GLOBALENTITIES];

                GetChatterAPINUSERInfoFRMVS();

            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method will bind Feed Grid View
        /// </summary>
        private void BindFeedGrid()
        {
            try
            {
                GetChatterAPINUSERInfoFRMVS();

                if (ViewState[SFConstants.CONST_VS_FEEDDATA] != null)
                {
                    olistAllFeeds = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;
                    //ViewState[SFConstants.CONST_VS_FEEDDATA] = olistAllFeeds;
                    // update User's Phone details into viewstate
                    UpdateUserPhoneDetailsIntoVS(olistAllFeeds);

                    gvFeed.DataSource = olistAllFeeds;
                    gvFeed.DataBind();
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method will bind Feed Grid View with default Feed Item
        /// </summary>
        private void BindFeedGrid(FeedItem oFeedItem)
        {
            try
            {
                if (oFeedItem == null)
                    return;

                if (ViewState[SFConstants.CONST_VS_FEEDDATA] != null)
                {
                    olistAllFeeds = ViewState[SFConstants.CONST_VS_FEEDDATA] as List<FeedItem>;
                    olistAllFeeds.Insert(0, oFeedItem);
                    ViewState[SFConstants.CONST_VS_FEEDDATA] = olistAllFeeds;
                    gvFeed.DataSource = olistAllFeeds;
                    gvFeed.DataBind();
                }
                else
                {
                    olistAllFeeds.Insert(0, oFeedItem);
                    ViewState[SFConstants.CONST_VS_FEEDDATA] = olistAllFeeds;
                    gvFeed.DataSource = olistAllFeeds;
                    gvFeed.DataBind();
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method will bind the Filters Repeater
        /// </summary>
        private void BindFeedFilterList()
        {
            try
            {
                FeedDirectory ofeed = new FeedDirectory();
                ofeed = m_oChatterRESTAPI.GetFilterList();

                List<FeedDirectoryItem> ofeedList = ofeed.Feeds.ToList();

                ofeedList.Sort((x, y) => string.Compare(x.Label, y.Label));

                FeedDirectoryItem oMeItem = ofeedList.Find(item => item.Label == SFConstants.CONST_ME);
                FeedDirectoryItem oMyChatterItem = ofeedList.Find(item => item.Label == SFConstants.CONST_MYCHATTER);

                hdnMyChatterUrl.Value = oMyChatterItem.FeedItemsUrl;

                ofeedList.Remove(oMeItem);
                ofeedList.Remove(oMyChatterItem);

                ofeedList.Insert(0, oMeItem);
                ofeedList.Insert(0, oMyChatterItem);

                rptFeedFilter.DataSource = ofeedList;
                rptFeedFilter.DataBind();

                Control imgTick = rptFeedFilter.Items[0].FindControl(SFConstants.CONST_CTRL_IMGTICK);
                imgTick.Visible = true;
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This will check for Config data if it is null will get from Config.Xml
        /// </summary>
        private void GetChatterAPIConfigData()
        {
            try
            {
                if (ViewState[SFConstants.CONSTANT_VS_CONFIG_DATA] == null)
                {
                    Utility.LoadConfigDataFrmXml(m_oChatterRESTAPI);
                    InsertChatterAPIInfoInVS(m_oChatterRESTAPI);
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// If Access token is null in VS get and update in VS
        /// Set AccessToken and API information from the viewstate
        /// </summary>
        private void GetAccessToken()
        {
            try
            {
                if (ViewState[SFConstants.CONST_ACCESS_TOKEN] == null)
                    ViewState[SFConstants.CONST_ACCESS_TOKEN] = m_oChatterRESTAPI.GetAccessToken(m_oUserEntities);
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// Build span for feed message segments
        /// </summary>
        private void BuildFeedNCommentBody(MessageSegments[] oMessageSegments, HtmlGenericControl ctrlSpan, int iRowId)
        {
            Literal litFeedText = null;
            HyperLink hlFeedLink = null;
            LinkButton lnkHashtag = null;

            try
            {
                for (int i = 0; i < oMessageSegments.Count(); i++)
                {
                    switch (oMessageSegments[i].Type)
                    {
                        case SFConstants.CONST_TEXT:
                            litFeedText = new Literal();
                            litFeedText.Text = GetFeedTextAsHtml(oMessageSegments[i].Text);
                            ctrlSpan.Controls.Add(litFeedText);
                            break;

                        case SFConstants.CONST_LINK:
                            hlFeedLink = new HyperLink();
                            hlFeedLink.Text = oMessageSegments[i].Text;
                            hlFeedLink.NavigateUrl = oMessageSegments[i].URL;
                            hlFeedLink.Target = SFConstants.CONST_ATTR_BLANK;
                            ctrlSpan.Controls.Add(hlFeedLink);
                            break;

                        case SFConstants.CONST_HASHTAG:
                            lnkHashtag = new LinkButton();
                            lnkHashtag.Text = oMessageSegments[i].Text;
                            lnkHashtag.Click += new EventHandler(lnkHashtag_Click);
                            ctrlSpan.Controls.Add(lnkHashtag);
                            ScriptManager.GetCurrent(this.Page).RegisterPostBackControl(lnkHashtag);
                            break;

                        case SFConstants.CONST_MENTION:
                            hlFeedLink = new HyperLink();
                            hlFeedLink.Text = oMessageSegments[i].Text;
                            hlFeedLink.NavigateUrl = string.Format(SFConstants.m_sMentionUrl, m_oChatterRESTAPI.ChatterAPIEndpoint, oMessageSegments[i].User.ID);
                            hlFeedLink.Target = SFConstants.CONST_ATTR_BLANK;
                            ctrlSpan.Controls.Add(hlFeedLink);

                            sPhotoURL = oMessageSegments[i].User.Photo.SmallPhotoURL;

                            if (!sPhotoURL.Contains(SFConstants.CONST_HTTP))
                            {
                                sPhotoURL = string.Format(sPhotoURLFormat, m_oUserEntities.InstanceURL, sPhotoURL);
                            }
                            sPhoneNumber = GetPhoneNumber(oMessageSegments[i].User.ID);
                            if (oMessageSegments[i].User.MySubscription != null)
                            {
                                sFollow = SFConstants.CONST_NO;
                                sSubscriptionUrl = oMessageSegments[i].User.MySubscription.URL;
                            }
                            else
                            {
                                sFollow = SFConstants.CONST_YES;
                                sSubscriptionUrl = string.Empty;
                            }

                            hlFeedLink.Attributes.Add(SFConstants.CONST_MOUSEOVER, string.Format(SFConstants.CONST_MouseToolTip_Format, hlFeedLink.ClientID,
                          string.Format(SFConstants.CONST_sOAuth_Token, sPhotoURL, ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString())
                          , oMessageSegments[i].User.ID, oMessageSegments[i].User.Name, sFollow, sPhoneNumber, sSubscriptionUrl, oMessageSegments[i].User.IsChatterGuest.ToString()));

                            break;
                    }
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method is used to register handler script and assing handler url to the javascript variable
        /// </summary>
        private void RegisterHandlerScript()
        {
            string[] arrConfigData = new string[6];
            try
            {
                m_oUserEntities = (GlobalEntities)ViewState[SFConstants.CONST_VS_GLOBALENTITIES];
                arrConfigData = (string[])ViewState[SFConstants.CONSTANT_VS_CONFIG_DATA];

                //Assign Access token and Instance Url to hidden variables for send message
                if (ViewState[SFConstants.CONST_ACCESS_TOKEN] != null)
                    hdnAccessToken.Value = ViewState[SFConstants.CONST_ACCESS_TOKEN].ToString();
                hdnInstanceUrl.Value = m_oUserEntities.InstanceURL;

                string sHandlerUrl = string.Format(SFConstants.CONST_FIVE_PARAM_FORMAT, SPContext.Current.Web.Url,
                                SFConstants.CONST_AUTOCOMPLETE_HANDLER, hdnAccessToken.Value,
                                "&IU=", m_oUserEntities.InstanceURL);

                string sJsVariables = "var sAPIEndPoint='" + m_oUserEntities.InstanceURL + "'," + "HandlerUrl='" + sHandlerUrl + "'," +
                    "ImgAppend='?oauth_token=" + hdnAccessToken.Value +
                    "', sAutoCompleteSearchUserCount='" + Convert.ToInt32(arrConfigData[(int)SFConstants.enConfigData.AutoCompleteSearchUserCount]) + "';";

                if (!this.Page.ClientScript.IsStartupScriptRegistered("ChatterJSVariables"))
                {
                    this.Page.ClientScript.RegisterClientScriptBlock(this.GetType(), "ChatterJSVariables", sJsVariables, true);
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method is used to register handler script and assing handler url to the javascript variable
        /// </summary>
        private void RegisterHandlerScript(string sInvalidConsumer)
        {
            try
            {
                string sJsVariables = "var HandlerUrl='" + string.Empty + "', sAutoCompleteSearchUserCount='" + string.Empty + "';";
                if (!this.Page.ClientScript.IsStartupScriptRegistered("ChatterInvalidConsumerKey"))
                {
                    this.Page.ClientScript.RegisterClientScriptBlock(this.GetType(), "ChatterInvalidConsumerKey", sJsVariables, true);
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method is used to update User's Phone details into viewstate
        /// </summary>
        private void UpdateUserPhoneDetailsIntoVS(List<FeedItem> olistAllFeeds)
        {
            StringBuilder sbUserIDList = new StringBuilder(100);
            string sUserIDList = string.Empty;
            bool bIsUserListChanged = false;
            string[] sNewResult = null;
            string[] sOldResult = null;
            try
            {
                // Get All User's List
                sbUserIDList = SalesForce.ChatterMiddleTier.Utility.GetAllUserList(olistAllFeeds);

                // Remove last comma from the list and remove duplicate ID List
                sUserIDList = SalesForce.ChatterMiddleTier.Utility.RemoveDuplicateID(sbUserIDList.ToString()).TrimEnd(new char[] { ',' });

                if (ViewState[SFConstants.CONST_VS_USER_BATCH_DETAIL] != null && ViewState[SFConstants.CONST_VS_ALL_USER_LIST] != null)
                {
                    sNewResult = sUserIDList.Split(',');
                    sOldResult = (ViewState[SFConstants.CONST_VS_ALL_USER_LIST] as string).Split(',');
                    bIsUserListChanged = Enumerable.SequenceEqual(sNewResult, sOldResult);
                }

                ViewState[SFConstants.CONST_VS_ALL_USER_LIST] = sUserIDList;

                if (ViewState[SFConstants.CONST_VS_USER_BATCH_DETAIL] == null && !bIsUserListChanged)
                {
                    // Get All user's Phone Details
                    ViewState[SFConstants.CONST_VS_USER_BATCH_DETAIL] = m_oChatterRESTAPI.GetUserList(sUserIDList).Results.ToList();
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// This method is used to get Get Phone Number from the List
        /// </summary>        
        private string GetPhoneNumber(string ID)
        {

            string sPhoneNumber = string.Empty;
            string sID = string.Empty;
            object[] oAllPhoneList;
            Dictionary<string, object> oBatchSummary = new Dictionary<string, object>();
            Dictionary<string, object> oPhoneSummary = new Dictionary<string, object>();
            List<BatchResultItem> oBatchResultItem = new List<BatchResultItem>();
            try
            {

                if (ViewState[SFConstants.CONST_VS_USER_BATCH_DETAIL] == null)
                {
                    return string.Empty;
                }

                oBatchResultItem = ViewState[SFConstants.CONST_VS_USER_BATCH_DETAIL] as List<BatchResultItem>;

                foreach (BatchResultItem oBatchResult in oBatchResultItem)
                {
                    if (oBatchResult.Result == null)
                    {
                        continue;
                    }

                    oBatchSummary = (Dictionary<string, object>)oBatchResult.Result;

                    if (!oBatchSummary.Keys.Contains(SFConstants.CONST_BATCH_ID) || !oBatchSummary.Keys.Contains(SFConstants.CONST_BATCH_PHONENUMBERS))
                    {
                        continue;
                    }

                    sID = oBatchSummary[SFConstants.CONST_BATCH_ID].ToString();

                    if (!sID.Equals(ID))
                    {
                        continue;
                    }

                    oAllPhoneList = (object[])oBatchSummary[SFConstants.CONST_BATCH_PHONENUMBERS];

                    if (oAllPhoneList.Length <= 0)
                    {
                        continue;
                    }

                    foreach (object oPhoneList in oAllPhoneList)
                    {
                        oPhoneSummary = (Dictionary<string, object>)oPhoneList;
                        sPhoneNumber += oPhoneSummary[SFConstants.CONST_BATCH_NUMBER].ToString() + "*" + oPhoneSummary[SFConstants.CONST_BATCH_TYPE].ToString().Replace("Work", "Phone");
                        if (oAllPhoneList.Length > 1)
                        {
                            sPhoneNumber += ":";
                        }
                    }

                }

                return sPhoneNumber;
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sFilterText"></param>
        /// <param name="sFilterUrl"></param>
        private void SetFilter(string sFilterText, string sFilterUrl)
        {
            LinkButton lnkFilter = null;
            HtmlImage imgTick = null;
            try
            {
                LoadAllChatterFeeds(SFConstants.enFeedState.FilterChange, SFConstants.enFilterType.Filter, sFilterUrl, string.Empty);

                lblFilter.Text = sFilterText;
                hdnFilterUrl.Value = sFilterUrl;

                foreach (RepeaterItem rItem in rptFeedFilter.Items)
                {
                    lnkFilter = (LinkButton)rItem.FindControl(SFConstants.CONST_CTRL_LNKFILTER);
                    imgTick = (HtmlImage)rItem.FindControl(SFConstants.CONST_CTRL_IMGTICK);
                    imgTick.Visible = false;

                    if (string.Compare(lnkFilter.Text, sFilterText) == 0)
                        imgTick.Visible = true;
                }
            }
            catch (WebException) { throw; }
            catch (Exception) { throw; }
        }

        #endregion
    }
}
