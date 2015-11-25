# qos

> Safe, fast and super simple queue and schedule based on Redis.

QoS (Queue or Schedule) offers a simple api for scheduling and running tasks in background. QoS is build on top of [Redis](http://redis.io). It's super fast and it uses atomic commands to ensure safe job execution in cluster environments.

<img src="giphy.gif" />

## Setup

```
$ npm install --save qos
```

## Usage

Before we start make sure you have `Redis` server up and running.

### Queue

Let's start by creating a `job` file `./MyJob.js`. A job module must return a function which returns a promise.

```js
module.exports = function(arg) {
  console.log(`Processing job MyJob with argument ${arg}.`);
  return Promise.resolve();
};
```

Create a new file `./index.js` and define a simple queue. We need to pass an instance of a Redis connection to the `Queue` class. This package should work with any Redis library that supports promises. We'll use an awesome [ioredis](https://github.com/luin/ioredis) package.

```js
'use strict';

// initializing Redis connection
const Redis = require('ioredis');
const redis = new Redis();

// initializing queue named `myqueue`
const qos = require('qos');
let queue = new qos.Queue(redis, 'myqueue');

// starting queue
queue.start();
```

Now we are ready to enqueue a job using the `enqueue` command. The job execution will start immediately.

```js
const path = require('path');

queue.enqueue({
  path: path.join(__dirname, 'MyJob'),
  args: ['argument1']
}); // returns a Promise
```

We can also remove a job using the `dequeue` command. Well, the processing is so fast that we will probably miss that chance :).

```js
queue.dequeue({
  path: path.join(__dirname, 'MyJob'),
  args: ['argument1']
}); // returns a Promise
```

Jobs can also be executed without touching the queuing system using the `perform` method.

```js
queue.perform({
  path: path.join(__dirname, 'MyJob'),
  args: ['argument1']
}); // returns a Promise
```

I bet you'll put your jobs in one place. Building a job path over and over again soon gets pretty annoying. Queue will look for jobs inside application's working directory by default (`process.cwd()`). We can override the that by passing the `paths` options.

```js
let paths = [__dirname, `${__dirname}/jobs`]; // list of paths where jobs can exist
let queue = new qos.Queue(redis, 'myqueue', {paths});
```

Jobs run within the `Queue` class context which means that we can access Queue instance methods through `this` keyword. We can change jobs' context by passing the `ctx` options.

```js
const ctx = new FakeContext();
const queue = new qos.Queue(redis, 'myqueue', {ctx});
```

Changing the context is not recommended. It's better to use the `args` options which expects an array of arguments that will be merged with job arguments.

```js
let ctx = new FakeContext();
let queue = new qos.Queue(redis, 'myqueue', {args: [ctx]});
```

### Schedule

To schedule a job at a particular time in the future we need to use the `Schedule` class. `Schedule` is an extended `Queue` class. It has pretty much the same logic. The main difference is that we need to provide some additional information for the `enqueue` and `dequeue` commands.

Let's open our `./index.js` file which we defined earlier and add our scheduler queue.

```js
let schedule = new qos.Schedule(redis, 'myschedule'); // no options

schedule.start();
```

Schedule the `MyJob` with the delay of 10s.

```js
schedule.enqueue({
  path: 'MyJob',
  args: ['argument1', 'argument2'],
  queue, // you can also pass queue name ('myqueue')
  at: Date.now() + 10000
}); // returns a Promise
```

There is one important different between `Queue` and `Schedule` classes. If we call the command above multiple times, an existing job will always be replaced with a new one. This means that two identical jobs can not exist in scheduled queue. This is great and ensures that the same job will never accidentally be scheduled twice.

Scheduled jobs can also be removed.

```js
schedule.dequeue({
  path: 'MyJob',
  args: ['argument1', 'argument2'],
  queue
}); // returns a Promise
```

We can also check if the job is schedule by using the `isEnqueued` command.

```js
schedule.isEnqueued({
  path: 'MyJob',
  args: ['argument1', 'argument2'],
  queue
}); // returns a Promise
```

There is also a `toggle` command which enqueues/dequeues a job based on an optional condition.

```js
let condition = 1 > 0;
schedule.toggle({
  path: 'MyJob',
  args: ['argument1', 'argument2'],
  queue, // you can also pass queue name ('myqueue')
  at: Date.now() + 10000
}, condition); // returns a Promise
```

## Example

You can run the attached example with the `npm run example` command.
