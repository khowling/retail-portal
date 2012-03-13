
var express = require('express'),
    fs = require ('fs'),
    OAuth= require("oauth").OAuth2,
    foauth = require('./force_oauth_pass.js'),
    https = require('https');
    
var _oAuth;
var SFDC_API_VERSION = '22';
/* HTTPS Server 
var app = express.createServer({ //sample cert setup
      	key: fs.readFileSync('../server.key').toString(),
  		cert: fs.readFileSync('../server.crt').toString()
});
*/
/* */
var app = express.createServer(); 

var port = process.env.PORT || 3001;


// 'require' is a global object, it require's modules (module == .js file)

// Node's HTTP API is very low-level. It deals with stream handling and message parsing only. It parses a message into headers and body but it does not parse the actual headers or the body

//var http = require ('https');


function get_type(thing){
    if(thing===null)return "[object Null]"; // special case
    return Object.prototype.toString.call(thing);
}

var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;
var sfuser = process.env.SFDC_USERNAME;
var sfpasswd = process.env.SFDC_PASSWORD;
var redirectUri = 'http://localhost:'+port+'/auth-callback';




foauth.login(clientId, clientSecret , sfuser, sfpasswd, function(){
    app.listen(port);
    console.log ('Server started on port ' + port);
});

app.get('/mytoken', function(req, res){
    queryAPI('query?q='+escape('select Name, PortalID__C, Points__c, Quiz_Completed__c, Account.Name, Account.id from Contact where PortalID__c = \'' + 'keith' + '\''), null,  function (results) {
        console.log ('mytoken output ' + JSON.stringify(results) + ' totalSize : ' + results.totalSize);
        if (results.totalSize == 1) {
           res.end ('Welcome ' + results.records[0].Name);
        } else {
            res.end ('unknown user');
        }
    });
});

app.get('/trainings', function(req, res){
   queryAPI('query?q='+escape('select Name from Training_Availability__c where Contact__r.PortalID__c = \'' + 'keith' + '\''), null, function (results) {
        console.log ('mytoken output ' + JSON.stringify(results) + ' totalSize : ' + results.totalSize);
        res.end (JSON.stringify(results.records));
     
    });
});

app.get ('/post/:mess', function (req,res) {
   var bdy = { "body" :   {"messageSegments" : [{"type": "Text", "text" : '[Portal Post] '+req.params.mess  }] }};
   queryAPI('chatter/feeds/record/'+'0012000000j7hyu'+'/feed-items', bdy, function(results) {
        res.end (JSON.stringify(results));
   });
});


function queryAPI (resturl, mbody, callback) {
    
    //console.log ('got token : ' + JSON.stringify(foauth.getOAuthResponse()));

    var data = '';
    
    var host =  (require('url').parse(foauth.getOAuthResponse().instance_url))['host'];
    
    var method = 'GET';
    if (mbody) method = 'POST';
    
    
    var options = {
        method: method,
        host: host,
        path: '/services/data/v23.0/' + resturl,
        headers: {
          'Host': host,
          'Authorization': 'OAuth '+foauth.getOAuthResponse().access_token,
          'Accept':'application/jsonrequest',
          'Cache-Control':'no-cache,no-store,must-revalidate',
          'Content-type':'application/json; charset=UTF-8'
        }
    
    }
    
    //Issue the Force.com REST API call to add a Lead record
    var req = https.request(options, function(res) {
      console.log("statusCode: ", res.statusCode);
    
      res.on('data', function(_data) {
        data += _data;
      });
    
      res.on('end', function(d) {
        if (res.statusCode == 401){
          //Our Access Token has expired, and so we need to login again
          console.log('Logging in again...');
          foauth.login(clientId, clientSecret , sfuser, sfpasswd,  queryAPI (resturl, callback));
        }else if (res.statusCode != 200 && res.statusCode != 201){
            // 200 = OK, 201 = CREATED
          //Force.com API returned an error. Display it to the user
          console.log('Error from Force.com:' + res.statusCode + ' : ' +data);
          data = JSON.parse(data);
          console.log('Error message:'+data[0].message);

        }else{
          callback (JSON.parse(data));
        }
      });
    
    }).on('error', function(e) {
      console.log(e);
    })
    
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    console.log ('sending body ' + JSON.stringify(mbody));
    req.end(JSON.stringify(mbody));
};
  
  

var token;
var instance;

function getOAuthToken(code, redirectUri, callback){
    //console.log(redirectUri);
    _oAuth.getOAuthAccessToken(code, { grant_type: 'authorization_code', redirect_uri:redirectUri, format: 'json'},
        function( error, access_token, refresh_token, results ){
            if(error){
            //console.log('in error');
            //console.log(error);
            return error;
        } else {
            //results['code'] = code;
            //console.log(results);
            callback(results, access_token, refresh_token);
        }
    });
}


// Configuration

    
app.get('/auth-callback', function(req, res){

    var code;
    var token;
    console.log ('/auth-callback');
    //check for the code that is returned from salesforce
    if(req.param('code') != null){
        code = req.param('code');
        
        //exchange the code for a token
        getOAuthToken(code, 'http://localhost:'+port+'/auth-callback', function(results, access_token, refresh_token){
     
            token = results.access_token
            instance = results.instance_url;
            code = results.code;
    
            //Redirect the user to the default landing page
            res.redirect('/query');
        });
    } else {
        res.end("<html><h1>Code was not returned</h1></html>")
    }
});



app.get ('/webserveroauthflow', function(req, res) {
    
	console.log ('/ start');
    _oAuth = new OAuth(clientId, clientSecret, 'https://login.salesforce.com', "/services/oauth2/authorize", "/services/oauth2/token");
    
    console.log ('/ _oAuth ' + _oAuth);
    
    var options = {
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        display: 'popup' };
    
    //get the auth url
    var authUrl = _oAuth.getAuthorizeUrl(options);
    console.log ('/ authUrl' + authUrl);
    
    //get the token
    _oAuth._request('GET', authUrl, '', '', '', function(data, result, response) {
    
        console.log ('/ authUrl, got response' + JSON.stringify(data));
        if(data!= null){
            //console.log(data);
            return data.data;
        }
        //if a 302 response is returned redirect
        //HACK: Need to call back to authorize to process the 302.  OAuth library does not do this automatically
        if(response.statusCode == 302){
            console.log ('respons required to ' + response.headers.location);
            res.redirect(response.headers.location, 302);
        } else {
            res.end(result);
        }
        
    });
});

	/*
	res.writeHead (200, {'Content-Type' : 'text/plain'});
	rest.query('SELECT ID FROM ACCOUNT',null,console.log);

	res.write ("line0\n");
	setTimeout(function() {	
		res.end ("end me");
	}, 1000);
	*/

// get automatic headers (its a http1.1 server)
// Connection: keep-alive  # persistant connections to webserver
	// Persistent connections allow the client to perform multiple requests without the overhead of connection tear-down and set-up between each request

// Transfer-Encoding: chunked
	// streaming - doesnt need to send the whole body in one go! dont want to buffer in the server, we'd rarther proxy it to the client (request, response, response, response)
	


// myserver, is a 'requestListener' is a function which is automatically added to the 'request' event.
// creates a http.Server, that is an 'Event Emmiter' with the following events:
//   'request' 'connection' 'close' etc
// The requestListener is a function which is automatically added to the 'request' event.


//console.log ('running on 3001');    
//var server = http.createServer( options,  myserver ).listen (3001);

/* App Server 
app.listen(port);
console.log ('Server started on port ' + port);
*/

