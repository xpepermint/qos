'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Queue = require('./Queue');
var QueueEmptyError = require('./errors/QueueEmptyError');

var Schedule = (function (_Queue) {
  _inherits(Schedule, _Queue);

  function Schedule() {
    _classCallCheck(this, Schedule);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Schedule).apply(this, arguments));
  }

  _createClass(Schedule, [{
    key: 'tick',

    /*
    * Private method which is called on every heartbit of the schedule.
    */

    value: function tick() {
      var _this2 = this;

      if (!this.running) return;

      this.redis.watch(this.key).then(function (status) {
        return _this2.redis.zrangebyscore(_this2.key, 0, Date.now(), 'LIMIT', 0, 1).then(function (values) {
          return values ? values[0] : null;
        });
      }).then(function (value) {
        if (!value) {
          _this2.redis.unwatch();
          throw new QueueEmptyError();
        }

        var target = _this2.decodeValue(value);
        return _this2.redis.multi().lpush(target.key, target.value).zrem(_this2.key, value).exec();
      }).then(this.tick.bind(this)).catch(this.handleError.bind(this));
    }

    /*
    * Schedules a new job to be executed in the future. Note that two identical
    * jobs can not exist thus a jobs can be scheduled only once.
    */

  }, {
    key: 'enqueue',
    value: function enqueue(data) {
      var at = data.at || Date.now();
      var key = typeof data.queue === 'string' ? data.queue : data.queue.key;
      var value = JSON.stringify({ key: key, value: this.encodeValue(data) });
      return this.redis.zadd(this.key, at, value);
    }

    /*
    * Removes already scheduled job.
    */

  }, {
    key: 'dequeue',
    value: function dequeue(data) {
      var key = typeof data.queue === 'string' ? data.queue : data.queue.key;
      var value = JSON.stringify({ key: key, value: this.encodeValue(data) });
      return this.redis.zrem(this.key, value);
    }

    /*
    * Tells if the job is scheduled.
    */

  }, {
    key: 'isEnqueued',
    value: function isEnqueued(data) {
      var at = data.at || Date.now();
      var key = typeof data.queue === 'string' ? data.queue : data.queue.key;
      var value = JSON.stringify({ key: key, value: this.encodeValue(data) });
      return this.redis.zscore(this.key, value).then(function (res) {
        return !!res;
      });
    }
  }]);

  return Schedule;
})(Queue);

module.exports = Schedule;