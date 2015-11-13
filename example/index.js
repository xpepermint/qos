'use strict';

const Redis = require('ioredis');
const redis = new Redis();
const qos = require('..');

// where to look for jobs
let paths = [__dirname];
// fake context to which a job has access through `this` keyword
let ctx = new function() { this.foo = 'bar' }
// default arguments
let args = [ctx];

// initializing queue
let queue = new qos.Queue(redis, 'qos:queue', {paths, ctx, args});
// starting queue
queue.start();
// run job now
queue.enqueue({path: 'jobs/MyJob', args: [Date.now()]});

// initializing schedule
let schedule = new qos.Schedule(redis, 'qos:schedule');
// starting schedule queue
schedule.start();
// delay job for 10s
schedule.enqueue({queue, at: Date.now()+10000, path: 'jobs/MyJob', args: [Date.now()]});
