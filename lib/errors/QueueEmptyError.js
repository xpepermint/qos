'use strict';

class QueueEmptyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueueEmptyError';
    this.message = message || 'No jobs found for processing.';
  }
}

module.exports = QueueEmptyError;
