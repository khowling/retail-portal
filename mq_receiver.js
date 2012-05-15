

var amqp = require('amqp');

var connection = amqp.createConnection({ host: 'localhost', port : 5672});

// Wait for connection to become established.
connection.on('ready', function () {
  // Create a queue , needs to be a brand new unique queue for each dyno starting,
	// Declaring a queue with an empty name will make the server generate a random name
	// passive = false & durable = false (both the defaults
  connection.queue('', function(q){
      // Catch all messages
      q.bind('longpolls', '#');

      // Receive messages
      q.subscribe(function (message) {
        // Print messages to stdout
        console.log(message);
      });
  });
});
