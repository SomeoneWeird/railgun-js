var Etcd    = require('node-etcd');
var request = require('superagent');

var Client = module.exports = function(config) {
  
  var self = this;

  this.config = config || {};

  // set etcd defaults
  this.config.host = this.config.host || "127.0.0.1";
  this.config.port = this.config.port || 4001;

  this.etcd = new Etcd(this.config.host, this.config.port);

  var findServices = function(name, callback) {

    self.etcd.get('/services/' + name + '/', { recursive: true }, function(err, data) {

      if(err) {
        // not found, skip and return empty array
        if(err.error.errorCode != 100)
          return callback(err);
      }

      var services = (data || {}).node ? data.node.nodes || [] : [];

      services = services.map(function(service) {
        return JSON.parse(service.value);
      });

      return callback(null, services);

    });

  }

  var _Client = function(serviceName, event, data, callback) {

    findServices(serviceName, function(err, services) {

      if(!services || services.length == 0) {
        return callback({
          message: "no services found"
        });
      }

      // should implement some sort of
      // weighting / job bidding system
      var service = services[Math.floor(Math.random()*services.length)];

      var servicePath = "http://" + service.host + ":" + service.port + "/" + serviceName + "/api/" + event;

      request.post(servicePath).send(data).set('Accept', 'application/json').end(function(err, response) {

        if(err) {
          return callback(err);
        } else if(response.body.error && response.body.error == 'railgunerror') {
          return callback(response.body.data);
        }
        
        callback(null, response.body);

      });

    });

  }

  _Client.findServices = findServices;

  return _Client;

}
