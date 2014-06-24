var assert = require('assert');

var Joi = require('joi');

var Service = require('../lib/service');
var Client  = require('../lib/client');

describe('Client', function() {

  var client, _service;

  before(function(done) {

    // setup a service for the client to hit

    _service = new Service('test_service', {
      port: 8001
    }, function() {});

    _service.on('test_1234', {
      test: Joi.number()
    }, function(body, callback) {
      body.test *= 2;
      callback(null, body);
    });

    _service.on('shouldError', {}, function(body, callback) {
      callback("woops");
    });

    _service.ready(done);

  });

  it('should not fail to create', function(done) {

    client = new Client();
    assert.equal(typeof client, 'function');
    done();

  });

  it('should fail to find a non-existant service', function(done) {

    client.findServices('non_existant', function(err, services) {

      assert.ifError(err);

      assert.equal(services.length, 0);
      done();

    });

  });

  it('should be able to find running services', function(done) {

    client.findServices('test_service', function(err, services) {

      assert.ifError(err);

      assert.equal(services.length, 1);
      assert.equal(services[0].host, '127.0.0.1');
      done();

    });

  });

  it('should fail to find service with no memory', function(done) {

    client.findServices('test_service', "mem_total == 0", function(err, services) {

      assert.ifError(err);

      assert.equal(services.length, 0);
      done();

    });

  });

  it('should find service using large filter', function(done) {

    client.findServices('test_service', "(mem_total > 100 and mem_free > 100) and (loadavg_0 < 100 and cpus_num > 0 and cpus_0 > 100)",
      function(err, services) {

        assert.ifError(err);

        assert.equal(services.length, 1);
        done();

      });
    
  });

  it('should be able to query a running service', function(done) {

    client('test_service', 'test_1234', {
      test: 1234
    }, function(err, response) {

      assert.ifError(err);

      assert.equal(response.test, 1234*2);
      done();

    });

  });

  it('should not be able to query a service not matching a filter', function(done) {

    client({
      service: "test_service",
      filter: "mem_total < 1"
    }, "test_1234", {}, function(err, response) {

      assert.equal(err.message, "no services found");
      done();

    });

  });

  it('should catch errors', function(done) {

    client('test_service', 'shouldError', {}, function(err, response) {

      assert.equal(err, 'woops');
      assert.equal(response, undefined);

      done();

    });

  });

});
