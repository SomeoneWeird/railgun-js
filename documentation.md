# Railgun JS

## Service

A service is a basic server that allows you to respond to 'events' from `Client`s.

### new Service(name[, config, log])

The service constructor takes a name, an optional config object, and an optional logging object.
The name is used when a client wants to speak to this service. The default config file is as following:

```js
var config = {
  // Host IP that the service will listen on. (NB. this needs to be an interface the outside world can talk to.)
  host: '127.0.0.1',
  // Host IP of the etcd instance this service is going to talk to.
  etcd_host: '127.0.0.1',
  // Host port that the service will listen on.
  // This is optional, if falsy, railgun will attempt to find
  // the next open port, and listen on that instead.
  port: 8000,
  // Host port of the etcd instance this service is going to talk to.
  etcd_port: 4001,
  // TTL (in ms) for entries in etcd, defaults to 5 seconds.
  timeout: 5000
}
```
`log` defaults to `console.log` if not specified.

#### Example
The following example will start a service called `example_service`, listening on port 4321 on all interfaces, with a noop'd logging function.
```js
var Service = require('railgun-js').service;
var service = new Service('example_service', {
  host: '0.0.0.0',
  port: 4321
}, function() {});
```

### .on(name[, schema], fn)
This function is basically an event handler for the `name` event. When this server sees an event called `name`, fn will be called (see below for `fn` documentation). If a schema is provided, and the data provided by the client does not pass, the service will return a 400.

#### schema

`schema` must be an object that contains [Joi](https://github.com/spumko/joi) compatible schema functions.

#### fn(data, callback)
`data` is an object that is from the client.
`callback` is a function which takes an optional value as your result.

#### Example
The following adds an event handler for `example_event` 
```
service.on('example_event', {}, function(data, callback) {
    callback(null, "hello world");
});
```

### .ready([cb])
Calling this function will start the service, and register it with etcd.
### .stop([cb])
Calling this function will stop the service (but not unregister it with etcd, the key has a TTL of `config.timeout`)

## Client

### new Client([config])
The client constructor takes an optional configuration object, which looks like the following:
```js
var config = {
  // Host IP of the etcd instance this client talks to.
  host: "127.0.0.1", 
  // Port of the etcd instance.
  port: 4001        
}
```
#### Example
```js
var Client = require('railgun-js').client;
var client = new Client({
  host: "10.1.1.20",
  port: 4001
});
```
### client(service, eventName, data, callback)
The constructor function returns this function. This function polls `etcd` for hosts running `service`, then randomly selects one from that list, and calls `eventName` with `data`. Finally, `callback` is called with `(err, response)`. Because it polls etcd for the hosts available, you don't need to manually keep track of hosts that are running particular services, this allows for massive horizontal scaling.

`service` can also be an object containing `service` and `filter`. Filters have access to the following variables:

* mem_total
* mem_free
* cpus_num
* cpus_n - (where n is one cpu, value is clock speed in MHz)
* loadavg_0
* loadavg_1
* loadavg_2

Filters will only allow use of a service if the filter express returns `true`. This is useful if you know that you need at least 300mb free ram etc. Uses [https://github.com/joewalnes/filtrex](filtrex) syntax.

#### Example
```js
client('example_service', 'example_event', {}, function(err, response) {
    // if you  have the example service running above
    console.log(response); // -> "hello world"
});
```

#### Example w/ filter
```js
client({ service: 'example_service', filter: 'mem_free > 300' }, 'example_event', {}, function(err, response) {
    // if you  have the example service running above (and your PC has more than 300mb ram :))
    console.log(response); // -> "hello world"
});
```

### .findServices(serviceName[, filter], callback)
`findServices` is also used internally when making an event call, but it could be useful to figure out how many other hosts are running particular services. `callback` will be called with an array, which will contain an object (```{ host:, port: }```) for each host running that particular service.

#### Example
```js
client.findServices('example_service', function(err, hosts) {
    // if you have the service example running in the background
    console.log(hosts); // -> [ { host: '127.0.0.1', port: 8000 } ]
});
```

# Examples

### Service

```js
var Service = require('railgun-js').service;
  
var service = new Service('example_service');

service.on('example_event', {}, function(body, callback) {
  callback(null, "hello world");2
});

service.ready();

```

You now have a service listening on port `8000`, which will respond to the event `example_event` with `hello world`. Read on to find out how to query it.

### Client

```js
var Client = require('railgun-js').client;
    
var client = Client(); // defaults to localhost for etcd.
   
// if you have the service in the example above running
// this should work. notice no host info?
   
client('example_service', 'example_event', {}, function(err, response) {
        
  console.log(response); // --> "hello world"
  
});
   
```