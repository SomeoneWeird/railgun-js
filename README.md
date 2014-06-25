railgun-js
==========

Description
----------
Stupidly simple microservice architecture framework.

Why should I use this?
----------------------

Well, of course, you don't have to. Although using this type of system gives you multiple advantages:

- Basically unlimited horizontal scaling - Services register themselves with etcd when they spin up, and then a client can select one of the available services to hit.
- Schema/Object validation - developers are smart, but still make mistakes, defining a schema beforehand allows you to not have to worry about type validation and coercion (damn javascript).
- Supports autoscaling automatically
- Don't have to keep track of what servers are running what service

### Service

A service is one half of railgun. A basic service listens and responds to certain `events` from a `Client`. These requests can be anything from 'what is your uptime?' to 'calculate analytics for me for the last 2 weeks' - you're just passing JSON around. 

### Client

A client is the other half of railgun (fancy that). Clients allow you to speak to services automatically, they query etcd and finds the best suitable host to execute the query on. This type of system allows you to not have to worry about adding things to clients each time you deploy 10 more services, as they are found automatically.

TODO
----

This is as much for me as for everyone else:

- ~~Job weighting / bidding system - allow client to filter out unsuitable hosts using a range of metrics (service version, host cpu free, host ram free etc.)~~
- ~~automatically find available ports for services if not specified (client pulls port from etcd anyway)~~
- Metrics tracking
- Healthchecks

API Documentation
------------

See documentation.md

Examples
--------

See `example` folder.

Requirements
------------

- etcd
