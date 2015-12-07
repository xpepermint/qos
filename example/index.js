'use strict';

var Redis = require('ioredis');
var redis = new Redis();
var qos = require('..');

// initializing queue
var queue = new qos.Queue(redis, 'qos:queue', data => {
  console.log('Handling job:', data);
});
// starting queue
queue.start();
// run job now
queue.enqueue({name: 'MyJob'});

// initializing schedule
var schedule = new qos.Schedule(redis, 'qos:schedule', {queue});
// starting schedule queue
schedule.start();
// delay job for 5s
schedule.toggle({at: Date.now()+5000, data: {name: 'MyJob'}});
