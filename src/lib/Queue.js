'use strict';

const QueueEmptyError = require('./errors/QueueEmptyError');

module.exports = class Queue {

  /*
  * Class constructor with the required `key` parameter which represents the
  * name of the list used by this schedule.
  */

  constructor(redis, key, handler) {
    this.redis = redis;
    this.key = key;
    this.running = false;
    this.timeout = null;
    this.handler = handler;
  }

  /*
  * Starts the heartbit of the schedule.
  */

  start() {
    if (this.running) return;

    this.running = true;
    this.tick();
  }

  /*
  * Private method which is called on every heartbit of the schedule.
  */

  tick() {
    if (!this.running) return;

    return this.redis.rpoplpush(this.key, `${this.key}:processing`).then(value => {
      if (!value) throw new QueueEmptyError();

      let data = this.decodeValue(value);
      return this.perform(data).then(res => value);
    }).then(value => {
      return this.redis.lrem(`${this.key}:processing`, '-0', value);
    }).then(this.tick.bind(this)).catch(this.handleError.bind(this));
  }

  /*
  * Stops the heartbit of the schedule.
  */

  stop() {
    clearTimeout(this.timeout);
    this.running = false;
  }

  /*
  * Private method which handles class errors.
  */

  handleError(err) {
    if (!(err.name === 'QueueEmptyError')) console.log(err);

    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.tick.bind(this), 1000);
  }

  /*
  * Returns serialized value which can be stored in redis.
  */

  encodeValue(data) {
    return JSON.stringify(data);
  }

  /*
  * Returns unserialized value.
  */

  decodeValue(value) {
    return JSON.parse(value);
  }

  /*
  * Places a new job on the processing list.
  */

  enqueue(data) {
    let value = this.encodeValue(data);
    return this.redis.lpush(this.key, value);
  }

  /*
  * Removes a job from the processing list. Not that if a job is enqueued
  * multiple times then multiple values will be deleted.
  */

  dequeue(data) {
    let value = this.encodeValue(data);
    return this.redis.lrem(this.key, '-0', value);
  }

  /*
  * Executes a job without touching the queuing system.
  */

  perform(data) {
    return Promise.resolve().then(res => this.handler(data));
  }
}
