'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');
var QueueEmptyError = require('./errors/QueueEmptyError');

var Queue = (function () {

  /*
  * Class constructor with the required `key` parameter withc represents the
  * name of the list used by this schedule.
  */

  function Queue(redis, key, options) {
    _classCallCheck(this, Queue);

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

  _createClass(Queue, [{
    key: 'start',
    value: function start() {
      if (this.running) return;

      this.running = true;
      this.tick();
    }

    /*
    * Private method which is called on every heartbit of the schedule.
    */

  }, {
    key: 'tick',
    value: function tick() {
      var _this = this;

      if (!this.running) return;

      return this.redis.rpoplpush(this.key, this.key + ':processing').then(function (value) {
        if (!value) throw new QueueEmptyError();

        var data = _this.decodeValue(value);
        return _this.perform(data).then(function (res) {
          return value;
        });
      }).then(function (value) {
        return _this.redis.lrem(_this.key + ':processing', '-0', value);
      }).then(this.tick.bind(this)).catch(this.handleError.bind(this));
    }

    /*
    * Stops the heartbit of the schedule.
    */

  }, {
    key: 'stop',
    value: function stop() {
      clearTimeout(this.timeout);
      this.running = false;
    }

    /*
    * Private method which handles class errors.
    */

  }, {
    key: 'handleError',
    value: function handleError(err) {
      if (!(err.name === 'QueueEmptyError')) console.log(err);

      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.tick.bind(this), 1000);
    }

    /*
    * Returns serialized value which can be stored in redis.
    */

  }, {
    key: 'encodeValue',
    value: function encodeValue(data) {
      var path = data.path;
      var args = data.args;
      return JSON.stringify({ path: path, args: args });
    }

    /*
    * Returns unserialized value.
    */

  }, {
    key: 'decodeValue',
    value: function decodeValue(value) {
      return JSON.parse(value);
    }

    /*
    * Places a new job on the processing list.
    */

  }, {
    key: 'enqueue',
    value: function enqueue(data) {
      var path = data.path;
      var args = data.args;
      var value = this.encodeValue({ path: path, args: args });
      return this.redis.lpush(this.key, value);
    }

    /*
    * Removes a job from the processing list. Not that if a job is enqueued
    * multiple times then multiple values will be deleted.
    */

  }, {
    key: 'dequeue',
    value: function dequeue(data) {
      var path = data.path;
      var args = data.args;
      var value = this.encodeValue({ path: path, args: args });
      return this.redis.lrem(this.key, '-0', value);
    }

    /*
    * Executes a job without touching the queuing system.
    */

  }, {
    key: 'perform',
    value: function perform(data) {
      var locs = this.paths.concat([data.path]);
      var dest = path.resolve.apply(null, locs);
      var ctx = this.ctx;
      var args = (data.args || []).concat(this.args);
      return require.main.require(dest).apply(ctx, args);
    }
  }]);

  return Queue;
})();

module.exports = Queue;