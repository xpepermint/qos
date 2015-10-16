'use strict';

const path = require('path');

const Redis = require('ioredis');
const redis = new Redis();

const qos = require('..');
const queue = new qos.Queue(redis, 'qos:queue');
const schedule = new qos.Schedule(redis, 'qos:schedule');

// starting queue `qos:queue`
queue.start();
// starting schedule queue `qos:schedule`
schedule.start();

let jobPath = path.join(__dirname, 'jobs/Job');
// delay job for 10s
schedule.enqueue({queue, at: Date.now()+10000, path: jobPath, args: [Date.now()]});
// run job now
queue.enqueue({path: jobPath, args: [Date.now()]});
