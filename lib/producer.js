var AWS = require('aws-sdk');
var selectn = require('selectn');

var BATCH_SIZE = 10;

function Producer(options) {
  this.queueUrl = options.queueUrl;
  this.sqs = options.sqs || new AWS.SQS({region: options.region});
}

function entryId(entry) {
  return entry.Id;
}

function entryFromMessage(message) {
  return {
    Id: message,
    MessageBody: message
  };
}

function createError(failedMessages) {
  if (failedMessages.length === 0) {
    return null;
  }

  return new Error('Failed to send messages: ' + failedMessages.join(', '));
}

Producer.prototype._sendBatch = function(failedMessages, messages, startIndex, cb) {

  var producer = this;
  var endIndex = startIndex + BATCH_SIZE;
  var batch = messages.slice(startIndex, endIndex);
  var params = {
    Entries: batch.map(entryFromMessage),
    QueueUrl: this.queueUrl
  };

  this.sqs.sendMessageBatch(params, function (err, result) {
    if (err) return cb(err);

    failedMessages = failedMessages.concat(result.Failed.map(entryId));

    if (endIndex < messages.length) {
      return producer._sendBatch(failedMessages, messages, endIndex, cb);
    }

    cb(createError(failedMessages));
  });
};

Producer.prototype.send = function(messages, cb) {
  var failedMessages = [];
  var startIndex = 0;

  this._sendBatch(failedMessages, messages, startIndex, cb);
};

Producer.prototype.queueSize = function (cb) {
  this.sqs.getQueueAttributes({
    QueueUrl: this.queueUrl,
    AttributeNames: ['ApproximateNumberOfMessages']
  }, function (err, result) {
    if (err) return cb(err);

    cb(null, selectn('Attributes.ApproximateNumberOfMessages', result));
  });
};

module.exports.create = function(options) {
  return new Producer(options);
};