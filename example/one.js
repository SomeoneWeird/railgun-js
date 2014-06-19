var Joi = require('joi');

var Service = require('../lib/service');
var Client  = require('../lib/client');

// Here, we create a simple service which will 
// provide simple maths functions. To make this a
// little trickier, it also calls back to the service
// running in `two.js` to get the other multiplication
// number.

var client = new Client();

var service = new Service('math');

service.on('multiply', {
	number: Joi.number()
}, function(data, callback) {

	// we got a request to multiply something
	// lets call back to the other service
	// and get another number

	client('example_service', 'getNumber', {}, function(err, response) {

		console.log("Got number", response.number, "from example_service");

		var result = data.number * response.number;

		console.log("Resulting number is", result);

		callback({ result: result });

	});

});

service.ready();
