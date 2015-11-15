'use strict';

var Redis = require('ioredis');
var redis = new Redis();
var qos = require('..');

// where to look for jobs
var paths = [__dirname];
// fake context to which a job has access through `this` keyword
var ctx = new function() { this.foo = 'bar' }
// default arguments
var args = [ctx];

// initializing queue
var queue = new qos.Queue(redis, 'qos:queue', {paths, ctx, args});
// starting queue
queue.start();
// run job now
queue.enqueue({path: 'jobs/MyJob', args: [Date.now()]});

// initializing schedule
var schedule = new qos.Schedule(redis, 'qos:schedule');
// starting schedule queue
schedule.start();
// delay job for 10s
schedule.enqueue({queue, at: Date.now()+10000, path: 'jobs/MyJob', args: [Date.now()]});
