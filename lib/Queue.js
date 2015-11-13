'use strict';

const path = require('path');
const QueueEmptyError = require('./errors/QueueEmptyError');

class Queue {

  /*
  * Class constructor with the required `key` parameter withc represents the
  * name of the list used by this schedule.
  */

  constructor(redis, key, options) {
    this.redis = redis;
    this.key = key;
    this.running = false;
    this.timeout = null;
    this.paths = options && options.paths ? options.paths : [process.cwd()];
    this.ctx = options && options.ctx ? options.ctx : this;
    this.args = options && options.args ? options.args : [];
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
      let locs = this.paths.concat([data.path]);
      let dest = path.resolve.apply(null, locs);
      let ctx = this.ctx;
      let args = (data.args||[]).concat(this.args);
      return require.main.require(dest).apply(ctx, args).then(res => value);
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
    if (!(err instanceof QueueEmptyError)) console.log(err);

    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.tick.bind(this), 1000);
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
  */

  dequeue(data) {
    let path = data.path;
    let args = data.args;
    let value = this.encodeValue({path, args});
    return this.redis.lrem(this.key, '-0', value);
  }
}

module.exports = Queue;
