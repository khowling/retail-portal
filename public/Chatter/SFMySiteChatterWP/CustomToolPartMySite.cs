using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.UI.WebControls;
using Microsoft.SharePoint.WebPartPages;
using Microsoft.SharePoint;
using System.Web.UI;
using SalesForce.ChatterMiddleTier;

namespace SalesForce.ChatterWP2010
{
    public class CustomToolPartMySite : ToolPart
    {
        Panel pnlConsumerKey = null;
        TextBox txtConsumerKey = null;
        TextBox txtConsumerSecret = null;
        TextBox txtCallBackURL = null;
        LiteralControl lcTable = null;
        SPList consumerList = null;

        string strConsumerKey = string.Empty;

        /// <summary>
        /// Gets the Consumer Key
        /// </summary>
        public string ConsumerKey
        {
            get { return strConsumerKey; }
            set { strConsumerKey = value; }
        }

        string strConsumerSecret = string.Empty;
        /// <summary>
        /// Gets the Consumer Secret
        /// </summary>
        public string ConsumerSecret
        {
            get { return strConsumerSecret; }
            set { strConsumerSecret = value; }
        }

        string strCallBackURL = string.Empty;
        /// <summary>
        /// Gets the CallBackURL
        /// </summary>
        public string CallBackURL
        {
            get { return strCallBackURL; }
            set { strCallBackURL = value; }
        }

        protected override void CreateChildControls()
        {
            base.CreateChildControls();
            try
            {
                this.CreateControls();

                this.GetConsumerKeyDetails();
                this.SetValuesToControls();

                this.SendValuesToWebPart();
            }
            catch (Exception ex)
            {
                LoggingService.LogMessage(SFConstants.CONST_CHATTER, ex.Message);
            }
        }

        public CustomToolPartMySite()
        {
            this.AllowMinimize = true;
            //this.GroupingText = "Consumer Key Info";
            this.Title = "Consumer Key Info";

            if (!SPContext.Current.Web.CurrentUser.IsSiteAdmin)
                this.Visible = false;
        }

        /// <summary>
        /// Set the values to all the controls
        /// </summary>
        private void SetValuesToControls()
        {
            string strCallBckURL = this.Page.Request.Url.ToString();
            if (strCallBckURL.Contains("?"))
                strCallBckURL = strCallBckURL.Remove(strCallBckURL.IndexOf("?"), strCallBckURL.Length - strCallBckURL.IndexOf("?"));

            strCallBckURL = strCallBckURL.Replace(" ", "%20");

            this.CallBackURL = strCallBckURL;
            this.txtCallBackURL.Text = this.CallBackURL;
            this.txtConsumerKey.Text = this.ConsumerKey;
            this.txtConsumerSecret.Text = this.ConsumerSecret;
        }

        /// <summary>
        /// Gets the values from all the controls
        /// </summary>
        private void GetValuesFromControl()
        {
            this.ConsumerKey = this.txtConsumerKey.Text;
            this.ConsumerSecret = this.txtConsumerSecret.Text;
            this.CallBackURL = this.txtCallBackURL.Text;//that need to modify for current callback url
        }

        /// <summary>
        /// Gets the consumer Key information
        /// </summary>
        private void GetConsumerKeyDetails()
        {
            try
            {
                SPWeb currentWeb = SPContext.Current.Web;

                SPSecurity.RunWithElevatedPrivileges(delegate()
                {
                    using (SPSite elevatedSite = new SPSite(currentWeb.Site.ID))
                    {
                        using (SPWeb elevatedWeb = elevatedSite.OpenWeb(currentWeb.ID))
                        {
                            this.consumerList = CreateListUtility.GetList(ConsumerKeyListEntity.ConsumerKeyList, elevatedWeb);

                            string strCallBckURL = this.Page.Request.Url.ToString();
                            if (strCallBckURL.Contains("?"))
                                strCallBckURL = strCallBckURL.Remove(strCallBckURL.IndexOf("?"), strCallBckURL.Length - strCallBckURL.IndexOf("?"));

                            strCallBckURL = strCallBckURL.Replace(" ", "%20");

                            SPListItem consumerKeyItem = CreateListUtility.GetOrgsInfoItem(this.consumerList, strCallBckURL);

                            //If Consumer Key found then use those values
                            if (consumerKeyItem != null)
                            {
                                SPFieldMultiLineText fldConsumerKey = (SPFieldMultiLineText)consumerKeyItem.Fields[ConsumerKeyListEntity.ConsumerKey];
                                this.ConsumerKey = CreateListUtility.DecryptKey(fldConsumerKey.GetFieldValueAsText(consumerKeyItem[ConsumerKeyListEntity.ConsumerKey]));

                                SPFieldMultiLineText fldConsumerSecret = (SPFieldMultiLineText)consumerKeyItem.Fields[ConsumerKeyListEntity.ConsumerSecret];
                                this.ConsumerSecret = CreateListUtility.DecryptKey(fldConsumerSecret.GetFieldValueAsText(consumerKeyItem[ConsumerKeyListEntity.ConsumerSecret]));

                                this.CallBackURL = consumerKeyItem[ConsumerKeyListEntity.CallbackURLDisplayName].ToString();
                            }
                        }
                    }
                });
            }
            catch (Exception) { throw; }
        }

        /// <summary>
        /// Insert Consumer Key information into the list
        /// </summary>
        private void InsertConsumerKeyToList()
        {
            try
            {
                SPWeb currentWeb = SPContext.Current.Web;

                SPSecurity.RunWithElevatedPrivileges(delegate()
                {
                    using (SPSite elevatedSite = new SPSite(currentWeb.Site.ID))
                    {
                        using (SPWeb elevatedWeb = elevatedSite.OpenWeb(currentWeb.ID))
                        {
                            elevatedWeb.AllowUnsafeUpdates = true;

                            string strCallBckURL = this.Page.Request.Url.ToString();
                            if (strCallBckURL.Contains("?"))
                                strCallBckURL = strCallBckURL.Remove(strCallBckURL.IndexOf("?"), strCallBckURL.Length - strCallBckURL.IndexOf("?"));

                            strCallBckURL = strCallBckURL.Replace(" ", "%20");
                            this.CallBackURL = strCallBckURL;

                            SPListItem consumerKeyItem = CreateListUtility.GetOrgsInfoItem(this.consumerList, this.CallBackURL);

                            //If Consumer Key is not found then insert it
                            if (consumerKeyItem == null)
                            {
                                consumerKeyItem = consumerList.Items.Add();
                                consumerKeyItem[ConsumerKeyListEntity.ConsumerKey] = CreateListUtility.EncryptKey(this.ConsumerKey);
                                consumerKeyItem[ConsumerKeyListEntity.ConsumerSecret] = CreateListUtility.EncryptKey(this.ConsumerSecret);
                                consumerKeyItem[ConsumerKeyListEntity.CallbackURLDisplayName] = this.CallBackURL;
                                consumerKeyItem.Update();
                                consumerList.Update();
                            }
                            //else update the property
                            else
                            {
                                SPFieldMultiLineText fldConsumerKey = (SPFieldMultiLineText)consumerKeyItem.Fields[ConsumerKeyListEntity.ConsumerKey];
                                string sConsumerKey = fldConsumerKey.GetFieldValueAsText(consumerKeyItem[ConsumerKeyListEntity.ConsumerKey]);

                                if (!sConsumerKey.Equals(CreateListUtility.EncryptKey(this.ConsumerKey)))
                                {
                                    UpdateRefreshNGrpInfo(consumerKeyItem.ID);
                                }

                                consumerKeyItem[ConsumerKeyListEntity.ConsumerKey] = CreateListUtility.EncryptKey(this.ConsumerKey);
                                consumerKeyItem[ConsumerKeyListEntity.ConsumerSecret] = CreateListUtility.EncryptKey(this.ConsumerSecret);
                                consumerKeyItem[ConsumerKeyListEntity.CallbackURLDisplayName] = this.CallBackURL;
                                consumerKeyItem.Update();
                            }
                            elevatedWeb.AllowUnsafeUpdates = false;
                        }
                    }
                });
            }
            catch (Exception) { throw; }
        }

        private void UpdateRefreshNGrpInfo(int ConsumerKeyID)
        {
            try
            {
                SPWeb currentWeb = SPContext.Current.Web;
                SPSecurity.RunWithElevatedPrivileges(delegate()
                {
                    using (SPSite oElevatedSite = new SPSite(currentWeb.Site.ID))
                    {
                        using (SPWeb oElevatedWeb = oElevatedSite.OpenWeb(currentWeb.ID))
                        {
                            oElevatedWeb.AllowUnsafeUpdates = true;

                            SPList refreshTokenList = CreateListUtility.GetList(UserRefreshTokenListEntity.UserAndRefreshTokenDetailsList, oElevatedWeb);
                            SPListItemCollection oItemColl = refreshTokenList.GetItems(Utility.GetRefreshTokenQuery(ConsumerKeyID.ToString()));

                            foreach (SPListItem oRefreshTokenItem in oItemColl)
                            {
                                oRefreshTokenItem[UserRefreshTokenListEntity.RefreshToken] = string.Empty;
                                oRefreshTokenItem[UserRefreshTokenListEntity.GroupID] = string.Empty;
                                oRefreshTokenItem.Update();
                            }

                            oElevatedWeb.AllowUnsafeUpdates = false;
                        }
                    }
                });
            }
            catch (Exception) { throw; }
        }
        
        /// <summary>
        /// Create and renders the controls in table structure
        /// </summary>
        private void CreateControls()
        {
            try
            {
                this.pnlConsumerKey = new Panel();

                this.Controls.Add(pnlConsumerKey);

                lcTable = new LiteralControl();
                lcTable.Text = "<table><tr><td>Consumer Key</td><td>";

                //Add Consumer Key textbox in Panel
                this.pnlConsumerKey.Controls.Add(lcTable);
                this.txtConsumerKey = new TextBox();
                this.txtConsumerKey.TextMode = TextBoxMode.MultiLine;
                this.txtConsumerKey.Rows = 4;
                this.pnlConsumerKey.Controls.Add(this.txtConsumerKey);

                //Add Consumer Scret textbox in Panel
                lcTable = null;
                lcTable = new LiteralControl();
                lcTable.Text = "</td></tr><tr><td>Consumer Secret</td><td>";
                this.pnlConsumerKey.Controls.Add(lcTable);
                this.txtConsumerSecret = new TextBox();
                this.txtConsumerSecret.TextMode = TextBoxMode.MultiLine;
                this.txtConsumerSecret.Rows = 2;
                this.pnlConsumerKey.Controls.Add(this.txtConsumerSecret);

                ////Add CallBackURL textbox in Panel
                lcTable = null;
                lcTable = new LiteralControl();
                lcTable.Text = "</td></tr><tr><td>CallBackURL</td><td>";
                this.pnlConsumerKey.Controls.Add(lcTable);
                this.txtCallBackURL = new TextBox();
                this.pnlConsumerKey.Controls.Add(this.txtCallBackURL);

                //Complete the table
                lcTable = null;
                lcTable = new LiteralControl();
                lcTable.Text = "</td></tr></table>";
                this.pnlConsumerKey.Controls.Add(lcTable);

                lcTable.Dispose();
            }
            catch (Exception) { throw; }
        }
        
        public override void ApplyChanges()
        {
            base.ApplyChanges();
            try
            {
                this.GetValuesFromControl();
                this.InsertConsumerKeyToList();
                this.SendValuesToWebPart();
            }
            catch (Exception ex)
            {
                LoggingService.LogMessage(SFConstants.CONST_CHATTER, ex.Message);
            }
        }

        private void SendValuesToWebPart()
        {
            SalesForce.ChatterWP2010.SFMySiteChatterWP objWP = (SalesForce.ChatterWP2010.SFMySiteChatterWP)this.ParentToolPane.SelectedWebPart;
            objWP.ConsumerKey = this.ConsumerKey;
            objWP.ConsumerSecret = this.ConsumerSecret;
            objWP.CallBackURL = this.CallBackURL;
        }
    }
}


