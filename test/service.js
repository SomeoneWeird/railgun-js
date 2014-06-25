var assert  = require('assert');
var os      = require('os');
var request = require('supertest');
var Etcd    = require('node-etcd');
var Joi     = require('joi');

var Service = require('../lib/service');

var noop, etcd;

before(function(done) {

  noop = function() {}
  etcd = new Etcd();
  done();

});

describe("Service", function() {

  var service;
  var serviceKey;
  var _request;

  it("should create a service", function(done) {

    service = new Service('railgun_test', {
      // set a timeout of 1 second for etcd
      // make tests much quick. wow.
      timeout: 1000,
      port:    8000
    }, noop);

    // reassign _request object
    // to current service spec
    _request = request('http://0.0.0.0:8000');

    // set etcd key for tests
    serviceKey = '/services/railgun_test/' + service.id;

    assert(!!service, "service is undefined.");

    done();

  });

  it("should create a new service and automatically find a port", function(done) {

    var _service = new Service('port_test', {
      timeout: 50
    }, noop);

    _service.ready(function(err) {

      assert.ifError(err);

      assert.equal(typeof _service.config.port, 'number');
      assert(_service.config.port > 1024);

      setTimeout(function() {
        // wait for entry to expire from etcd
        done();
      }, 100)

    });

  });

  it("should register an 'event'", function(done) {

    service.on('sayHello', {
      hello: Joi.string()
    }, function(data, callback) {

      var _d = data.hello.toUpperCase();

      callback(null, {
        result: _d
      });

    });

    done();

  });

  it("should start listening", function(done) {
    service.ready(done);
  });

  it("should respond to an 'event'", function(done) {

    _request.post('/railgun_test/api/sayHello')
           .send({ hello: "world!" })
           .set('Accept', 'application/json')
           .end(function(err, response) {

              assert.ifError(err);

              assert.equal(response.body.result, "WORLD!");
              done();

           });
  
  });

  var getEtcdEntry = function(key, cb) {
    etcd.get(key, {}, function(err, body) {
      assert.ifError(err);
      return cb(JSON.parse(body.node.value));
    });
  }

  it("should have registered w/ etcd", function(done) {

    getEtcdEntry(serviceKey, function(data) {

      assert.equal(data.host, '127.0.0.1');
      assert.equal(data.port, 8000);
      done();

    });

  });

  it("should have registered host stats", function(done) {

    getEtcdEntry(serviceKey, function(data) {

      var info = data.host_info;

      assert.equal(typeof info.mem_free, 'number');
      assert.equal(info.mem_total, os.totalmem());
      assert.equal(info.cpus_0, os.cpus()[0].speed);
      assert.equal(info.cpus_num, os.cpus().length);
      assert(info.loadavg_1 > 0);
      assert(os.uptime() > info.uptime);

      done();

    });

  });

  it("should dynamically add routes", function(done) {

    _request.post('/railgun_test/api/nothingtoseehere').end(function(err, data) {

      assert.ifError(err);
      assert.equal(data.body.statusCode, 404);
      
      service.on('nothingtoseehere', {
        hello: Joi.number().integer()
      }, function(body, callback) {
        return callback(null, body);
      });

      _request.post('/railgun_test/api/nothingtoseehere')
              .set('Accept', 'application/json')
              .send({ hello: 1234 })
              .end(function(err, response) {

                assert.ifError(err);
                assert.equal(response.body.hello, 1234);
                done();

              });

    });

  });

  it("should validate message arguments", function(done) {

    _request.post('/railgun_test/api/nothingtoseehere')
            .set('Accept', 'application/json')
            .send({ hello: 'invalid_value '})
            .expect(400)
            .end(done);

  });

  it("should expire from etcd when stopped", function(done) {

    service.stop(function() {

      setTimeout(function() {

        etcd.get('/services/railgun_test/' + service.id, {}, function(err, body) {

          assert(err);
          assert(err.error.errorCode, 100);
          done();

        });

      }, 1500);

    });

  });

});
