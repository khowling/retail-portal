var amqp = require('amqp');

var connection = amqp.createConnection({ host: 'localhost', port : 5672}).on('ready', function () {

// Wait for connection to become established.

	var e = connection.exchange('longpolls', { type: 'fanout' }, function (exchange) {

		console.log('exchange ' + exchange.name + ' is open');
		var i = '0';
		setInterval (function (){
			i++;
			exchange.publish ('#', {m: 'keiths message ' + i}, { contentType: 'application/json'});
			}, 1000);

  	// Create a queue for this dyno, needs to be a brand new unique queue for each dyno starting,
  	// Declaring a queue with an empty name will make the server generate a random name
  	// passive = false & durable = false (both the defaults
  	connection.queue('', function(q){
      // Catch all messages
			console.log('created queue : ' + q.name);
      q.bind('longpolls', '#');

      // Receive messages
      //	Setting  { ack: true } the AMQP server only delivers a single message at a time. 
      //  When you want the next message, call q.shift(). When ack is false then you will receive messages as fast as they come in. 
      q.subscribe({ ack: true }, function (json, headers, deliveryInfo, message) {
        // Print messages to stdout
        console.log('json ' + json.m + ', delinfo : ' + JSON.stringify(deliveryInfo));

        //message.acknowledge(); // Acknowledges the last message
        message.reject(true); // requeue = true
      });
  });

	});
});

