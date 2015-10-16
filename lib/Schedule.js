'use strict';

const Queue = require('./Queue');
const QueueEmptyError = require('./errors/QueueEmptyError');

class Schedule extends Queue {

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
