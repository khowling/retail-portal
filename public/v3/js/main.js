
// Require.js allows us to configure shortcut alias
// There usage will become more apparent futher along in the tutorial.
require.config({
  'paths': {
    'underscore': 'libs/backbone/underscore',
    'backbone': 'libs/backbone/backbone-min',
    'bootstrap': 'libs/bootstrap/bootstrap-min'
  },
  'shim': 
    {
		backbone: {
			'deps': ['jquery', 'underscore'],
			'exports': 'Backbone'
		}
	}	


});



require(
    ['underscore', 'backbone', 'app' ], 
    function(_, Backbone, app) {
    //the jquery.alpha.js and jquery.beta.js plugins have been loaded.
        app.init();
    });