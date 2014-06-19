var Service = require('../lib/service');
var Client  = require('../lib/client');

// Here, we create a simple service which will talk to
// example_2 over the network. This file will ask the 
// other service `example_2` to mutiply the number it
// gives it. Easy.

var service = new Service('example_service', {
	port: 8001 // start this on another port
});

var client = new Client();

service.on('getNumber', {}, function(data, callback) {

	// a Client has called getNumber, return a random number.

	console.log("getNumber called!");

	callback({
		number: Math.floor(Math.random()*100)
	});

});

service.ready(function() {

	console.log("Example service has started, going to multiply a couple of numbers!");

	// call the 'multiply' function in the 'math' service

	client('math', 'multiply', {
		number: 10
	}, function(err, response) {

		if(err && err.message == "no services found") {
			// woops, need to start one.js first!
			console.error("Woops! It seems you haven't started one.js - start that then try running this file again!");
			process.exit(1);
		}

		console.log("Got a response from the math service!");
		console.log(response);

	});

});