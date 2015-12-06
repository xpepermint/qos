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

Let's create a new file `./index.js` and define a simple queue.

```js
import Redis from 'ioredis';
import qos from 'qos';

// initializing redis instance
const redis = new Redis();

// initializing handler for processing jobs
const handler = data => {
  console.log(`Handling job named ${data.name}`);
};

// initializing queue named `myqueue`
const queue = new qos.Queue(redis, 'myqueue', handler);

// starting queue
queue.start();
```

First we need to pass an instance of a Redis connection to the `Queue` class. QoS should work with any Redis library that supports promises. The second argument is the name of the queue. The last argument is a function for processing jobs.

We are now ready to enqueue a job using the `enqueue` command.

```js
queue.enqueue({name: 'JobName'}); // returns a Promise
```

The `enqueue` command is actually a call to the handler. It accepts an argument which is passed directly to the `handler`.

We can also remove a job using the `dequeue` command.

```js
queue.dequeue({name: 'JobName'}); // returns a Promise
```

Jobs can also be executed without touching the queuing system using the `perform` method.

```js
queue.perform({name: 'JobName'}); // returns a Promise
```

### Schedule

To schedule a job at a particular time in the future we need to use the `Schedule` class. `Schedule` is an extended `Queue` class. It has pretty much the same logic. The main difference is that we need to provide some additional information for the `enqueue` and `dequeue` commands.

Let's open our `./index.js` file which we defined earlier and add a scheduler.

```js
let schedule = new qos.Schedule(redis, 'myschedule');

schedule.start();
```

Schedule a job with the delay of 10s.

```js
schedule.enqueue({
  queue, // you can also pass queue name (e.g. 'myqueue')
  at: Date.now() + 10000,
  data: {name: 'JobName'} // Queue job data
}); // returns a Promise
```

There is one important different between `Queue` and `Schedule` classes. If we call the command above multiple times, an existing job will be replaced with a new one. This means that two identical jobs can not exist in scheduled queue. This is great and ensures that the same job will never accidentally be scheduled twice.

Scheduled jobs can also be removed.

```js
schedule.dequeue({
  queue,
  data: {name: 'JobName'}
}); // returns a Promise
```

We can also check if the job is schedule by using the `isEnqueued` command.

```js
schedule.isEnqueued({
  queue,
  data: {name: 'JobName'}
}); // returns a Promise
```

There is also a `toggle` command which enqueues/dequeues a job based on an optional condition.

```js
let condition = 1 > 0;
schedule.toggle({
  queue,
  at: Date.now() + 10000,
  data: {name: 'JobName'}
}, condition); // returns a Promise
```

## Example

You can run the attached example with the `npm run example` command.
