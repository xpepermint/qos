'use strict';

const Queue = require('./Queue');

class Schedule extends Queue {

  /*
  * Private method which is called on every heartbit of the schedule.
  */

  tick() {
    if (!this.running) return;

    this.redis.watch(this.key).then(status => {
      return this.redis.zrangebyscore(this.key, 0, Date.now(), 'LIMIT', 0, 1);
    }).then(values => {
      if (!values || !values[0]) return this.redis.unwatch();

      let value = values[0];
      let target = this.decodeValue(value);
      return this.redis.multi().lpush(target.key, target.value).zrem(this.key, value).exec();
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
  * Schedules a new job to be executed in the future. Note that the same job
  * can be schedules once per timestamp.
  *
  * ```
  * let queue = new Queue('main');
  * let schedule = new Schedule('main');
  * schedule.enqueue({queue, path: './jobs/MyJob', args: [100]});
  * schedule.enqueue({queue, at: Date.now(), path: './jobs/MyJob', args: [100]});
  * ```
  */

  enqueue(data) {
    let at = data.at || Date.now();
    let key = typeof data.queue === 'string' ? data.queue : data.queue.key;
    let value = JSON.stringify({key, value: this.encodeValue(data)});
    return this.redis.zadd(this.key, at, value);
  }

  /*
  * Removes already scheduled job.
  *
  * ```
  * let queue = new Queue('main');
  * let schedule = new Schedule('main');
  * schedule.remove({queue, path: './jobs/MyJob', args: [100]});
  * ```
  */

  dequeue(data) {
    let key = data.queue.key;
    let value = JSON.stringify({key, value: this.encodeValue(data)});
    return this.redis.zrem(this.key, value);
  }
}

module.exports = Schedule;
