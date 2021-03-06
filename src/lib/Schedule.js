'use strict';

const Queue = require('./Queue');
const QueueEmptyError = require('./errors/QueueEmptyError');

module.exports = class Schedule extends Queue {

  /*
  * Class constructor with the required `key` parameter which represents the
  * name of the schedule.
  */

  constructor(redis, key, options) {
    super(redis, key);
    this.options = options || {};
  }


  /*
  * Private method which is called on every heartbit of the schedule.
  */

  tick() {
    if (!this.running) return;

    this.redis.watch(this.key).then(status => {
      return this.redis.zrangebyscore(this.key, 0, Date.now(), 'LIMIT', 0, 1).then(values => values ? values[0] : null);
    }).then(value => {
      if (!value) {
        this.redis.unwatch();
        throw new QueueEmptyError();
      }

      let target = this.decodeValue(value);
      return this.redis.multi().lpush(target.key, target.value).zrem(this.key, value).exec();
    }).then(this.tick.bind(this)).catch(this.handleError.bind(this));
  }

  /*
  * Schedules a new job to be executed in the future. Note that two identical
  * jobs can not exist thus a jobs can be scheduled only once.
  */

  enqueue(data) {
    if (!data.queue) {
      data.queue = this.options.queue;
    }

    let at = data.at || Date.now();
    let key = typeof data.queue === 'string' ? data.queue : data.queue.key;
    let value = this.encodeValue({key, value: this.encodeValue(data.data)});
    return this.redis.zadd(this.key, at, value);
  }

  /*
  * Removes already scheduled job.
  */

  dequeue(data) {
    if (!data.queue) {
      data.queue = this.options.queue;
    }

    let key = typeof data.queue === 'string' ? data.queue : data.queue.key;
    let value = this.encodeValue({key, value: this.encodeValue(data.data)});
    return this.redis.zrem(this.key, value);
  }

  /*
  * Tells if the job is scheduled.
  */

  isEnqueued(data) {
    if (!data.queue) {
      data.queue = this.options.queue;
    }

    let at = data.at || Date.now();
    let key = typeof data.queue === 'string' ? data.queue : data.queue.key;
    let value = JSON.stringify({key, value: this.encodeValue(data.data)});
    return this.redis.zscore(this.key, value).then(res => !!res);
  }

  /*
  * Schedules or removes a job.
  */

  toggle(data, shouldEnqueue) {
    let perform = (shouldEnqueue) => {
      if (shouldEnqueue) {
        return this.enqueue(data);
      } else {
        return this.dequeue(data);
      }
    };
    if (typeof shouldEnqueue !== 'boolean') {
      return this.isEnqueued(data).then(enqueued => perform(!enqueued));
    } else {
      return perform(shouldEnqueue);
    }
  }
}
