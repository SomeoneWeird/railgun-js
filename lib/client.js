var Etcd    = require('node-etcd');
var request = require('superagent');
var filtrex = require('filtrex');

var Client = module.exports = function(config) {
  
  var self = this;

  this.config = config || {};

  // set etcd defaults
  this.config.host = this.config.host || "127.0.0.1";
  this.config.port = this.config.port || 4001;

  this.etcd = new Etcd(this.config.host, this.config.port);

  var findServices = function(name, filter, callback) {

    if(!callback) {
      callback = filter;
      filter   = null;
    }

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

      if(filter) {

        try {
          var exp = filtrex(filter);
        } catch(e) { 
          console.log(e)
          // invalid expression
          return callback({
            message: "invalid filter expression"
          });
        }

        services = services.filter(function(service) {
          return !!exp(service.host_info);
        });

      }

      return callback(null, services);

    });

  }

  var _Client = function(serviceName, event, data, callback) {

    var filter = null;
    var name   = serviceName;

    if(typeof serviceName != 'string') {
      filter = serviceName.filter;
      name   = serviceName.service;
    }

    findServices(name, filter, function(err, services) {

      if(err) {
        return callback(err);
      }

      if(!services || services.length == 0) {
        return callback({
          message: "no services found"
        });
      }

      // We got a host(s) back, pick a random one.
      service = services[Math.floor(Math.random()*services.length)];

      var servicePath = "http://" + service.host + ":" + service.port + "/" + name + "/api/" + event;

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
