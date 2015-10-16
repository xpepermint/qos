# qos

> Safe, fast and super simple queue and schedule based on Redis.

QoS (Queue or Schedule) offers a simple api for scheduling and running tasks in background. QoS is build on top of [Redis](http://redis.io). It's super fast and it uses atomic commands to ensure safe job execution in cluster environments.

<img src="giphy.gif" width="150"/>

## Setup

```
$ npm install --save qos
```

## Usage

Before we start playing, please note that this package requires `node v4.2.0` or higher. We also need to make sure that we have Redis server up and running.

### Queue

Let's start by creating a `job` file `./MyJob.js`. A job module must return a function which returns a promise.

```js
module.exports = function(arg) {
  console.log(`Processing job MyJob with argument ${arg}.`);
  return Promise.resolve();
};
```

Create a new file `./index.js` and write a simple queue. We need to pass an instance of a redis connection to the `Queue` class. This package should work with any Redis library which supports promises. We'll use an awesome [ioredis](https://github.com/luin/ioredis) package.

```js
'use strict';

// initializing Redis connection
const Redis = require('ioredis');
const redis = new Redis();

// initializing queue named `myqueue`
const qos = require('qos');
const queue = new qos.Queue(redis, 'myqueue');

// starting queue
queue.start();
```

Now we are ready to enqueue a job using the `enqueue` command. The job execution will start immediately.

```js
const path = require('path');

queue.enqueue({
  path: path.join(__dirname, 'MyJob'),
  args: ['argument1']
});
```

We can also remove a job using the `dequeue` command. Well, the processing is so fast that we will probably miss that chance :).

```js
queue.dequeue({
  path: path.join(__dirname, 'MyJob'),
  args: ['argument1']
});
```

### Schedule

To schedule a job at particular time in the future we need to use the `Schedule` class. `Schedule` is an extended `Queue` class with pretty much the same logic. The only difference is that we need to provide some additional information for the `enqueue` command.

Let's open our `./index.js` file which we defined earlier and define our scheduler queue.

```js
const schedule = new qos.Schedule(redis, 'myschedule');

schedule.start();
```

Schedule our `MyJob` with the delay of 10s.

```js
schedule.enqueue({
  queue, // you can also pass queue name ('myqueue')
  at: Date.now() + 10000,
  path: path.join(__dirname, 'MyJob'),
  args: ['argument1', 'argument2']
});
```

## Example

You can run the attached example with the `npm run example` command.
