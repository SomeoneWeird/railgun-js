
var hapi = require('hapi');
var slug = require('slug');
var Etcd = require('node-etcd');
var uuid = require('uuid');
var Joi  = require('joi');


var Service = module.exports = function Service(name, config, log) {

  this.name = name;
  this.id   = uuid.v4();

  this.config = config || {};

  // setup defaults for config
  this.config.host      = this.config.host      || "127.0.0.1";
  this.config.etcd_host = this.config.etcd_host || "127.0.0.1";
  this.config.port      = this.config.port      || 8000;
  this.config.etcd_port = this.config_etcd_port || 4001; 
  this.config.timeout   = this.config.timeout   || 5000;

  this.log = log || console.log;

  this.etcd = new Etcd(this.config.etcd_host, this.config.etcd_port);

  this._server = hapi.createServer(this.config.host, this.config.port);

}

Service.prototype.on = function(id, schema, fn) {
    
  var path = '/' + slug(this.name) + '/api/' + slug(id);

  this._server.route({
    path:    path,
    method:  'POST',
    config: {
      handler: function(req, res) {
        Joi.validate(req.payload, schema, function(err, body) {
          if(err) {
            if(err.name == 'ValidationError') {
              var _err = hapi.error.badRequest('POST body did not pass schema validation');
            } else {
              var _err = hapi.error.internal("Error validating POST body");
            }
            return res(_err);
          }
          fn(body, function(err, data) {
            if(err) {
              return res({ error: 'railgunerror', data: err });
            }
            res(data);
          });
        });
      }
    }
  });

}

Service.prototype.registerService = function(done) {

  var self = this;

  // Register service with etcd using a
  // uuid under /services/<servicename>/<uuid>

  var servicePath = '/services/' + this.name + '/' + this.id;

  var data = {
    host: self.config.host,
    port: self.config.port
  }

  var doRegister = function(cb) {

    self.etcd.set(servicePath, JSON.stringify(data), {
      ttl: self.config.timeout / 1000
    });

    if(cb)
      cb();

  }

  doRegister(function() {
    self.log("Sucessfully registered service with etcd.");
    done();
    self.registerInterval = setInterval(doRegister, self.config.timeout);
  });

}

Service.prototype.ready = function(done) {
  var self = this;
  this._server.start(function() {
    self.log("%s started on %s:%s", self.name, self.config.host, self.config.port);
    self.registerService(function() {
      self.log("Registered service with etcd.");
      done && done();
    });
  });

}

Service.prototype.stop = function(done) {
  var self = this;
  clearTimeout(this.registerInterval);
  this._server.stop(function() {
    self.log("%s stopped at %d", self.name, Date.now());
    done && done();
  });
}
