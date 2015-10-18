'use strict';

const Redis = require('ioredis');
const redis = new Redis();

const paths = [__dirname]; // where to look for jobs
const qos = require('..');
const queue = new qos.Queue(redis, 'qos:queue', {paths});
const schedule = new qos.Schedule(redis, 'qos:schedule', {paths});

// starting queue `qos:queue`
queue.start();
// starting schedule queue `qos:schedule`
schedule.start();

// delay job for 10s
schedule.enqueue({queue, at: Date.now()+10000, path: 'jobs/MyJob', args: [Date.now()]});
// run job now
queue.enqueue({path: 'jobs/MyJob', args: [Date.now()]});
