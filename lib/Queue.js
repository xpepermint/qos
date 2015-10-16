'use strict';

class Queue {

  /*
  * Class constructor with the required `key` parameter withc represents the
  * name of the list used by this schedule.
  */

  constructor(redis, key) {
    this.redis = redis;
    this.key = key;
    this.running = false;
    this.timeout = null;
  }

  /*
  * Starts the heartbit of the schedule.
  *
  * ```
  * let schedule = new Schedule('main');
  * schedule.start();
  * ```
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

    this.redis.rpoplpush(this.key, `${this.key}:processing`).then(value => {
      if (!value) return;

      let data = this.decodeValue(value);
      return require.main.require(data.path).apply(this, data.args);
    }).then(res => {
      if (!this.running) return;

      if (Array.isArray(res)) { // transaction response
        this.tick();
      } else { // other response
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.tick.bind(this), 1000);
      }
    }).catch(this.handleError.bind(this));
  }

  /*
  * Stops the heartbit of the schedule.
  *
  * ```
  * let schedule = new Schedule('main');
  * schedule.stop();
  * ```
  */

  stop() {
    clearTimeout(this.timeout);
    this.running = false;
  }

  /*
  * Private method which handles class errors.
  */

  handleError(err) {
    console.log(err);
  }

  /*
  * Returns serialized value which can be stored in redis.
  */

  encodeValue(data) {
    let path = data.path;
    let args = data.args;
    return JSON.stringify({path, args});
  }

  /*
  * Returns unserialized value.
  */

  decodeValue(value) {
    return JSON.parse(value);
  }

  /*
  * Places a new job on the processing list.
  *
  * ```
  * let queue = new Queue('main');
  * queue.enqueue({path: './jobs/MyJob', args: [100]});
  * ```
  */

  enqueue(data) {
    let path = data.path;
    let args = data.args;
    let value = this.encodeValue({path, args});
    return this.redis.lpush(this.key, value);
  }

  /*
  * Removes a job from the processing list. Not that if a job is enqueued
  * multiple times then multiple values will be deleted.
  *
  * ```
  * let queue = new Queue('main');
  * queue.enqueue({path: './jobs/MyJob', args: [100]});
  * ```
  */

  dequeue(data) {
    let path = data.path;
    let args = data.args;
    let value = this.encodeValue({path, args});
    return this.redis.lrem(this.key, '-0', value);
  }
}

module.exports = Queue;
