using System;
using System.ComponentModel;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using Microsoft.SharePoint;
using Microsoft.SharePoint.WebControls;
using Microsoft.SharePoint.WebPartPages;
using SalesForce.ChatterMiddleTier;

namespace SalesForce.ChatterWP2010
{
    [ToolboxItemAttribute(false)]
    public class SFMySiteChatterWP : Microsoft.SharePoint.WebPartPages.WebPart
    {
        // Visual Studio might automatically update this path when you change the Visual Web Part project item.
        private const string _ascxPath = @"~/_CONTROLTEMPLATES/SFMySiteChatterWP/SFMySiteChatterWP/SFMySiteChatterWPUserControl.ascx";

        private ObjectStateFormatter _formatter = new ObjectStateFormatter();

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
            Control control = Page.LoadControl(_ascxPath);
            Controls.Add(control);
        }

        public override ToolPart[] GetToolParts()
        {
            // resize the tool part array 
            ToolPart[] toolparts = new ToolPart[3];
            // instantiate the standard SharePopint tool part 
            WebPartToolPart wptp = new WebPartToolPart();
            // instantiate the custom property toolpart if needed. 
            // this object is what renders our regular properties. 
            CustomPropertyToolPart custom = new CustomPropertyToolPart();
            // instantiate and add our tool part to the array. 
            // tool parts will render in the order they are added to this array. 
            toolparts[0] = new CustomToolPartMySite();
            toolparts[1] = custom;
            toolparts[2] = wptp;
            return toolparts;
        }

    }
}
