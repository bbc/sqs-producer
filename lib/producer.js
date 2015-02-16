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

function entryFromObject(message) {
  if (!message.id || !message.body) {
    throw new Error('Object messages must have \'id\' and \'body\' props');
  }

  return {
    Id: message.id,
    MessageBody: message.body
  };
}

function entryFromString(message) {
  return {
    Id: message,
    MessageBody: message
  };
}

function entryFromMessage(message) {
  if (typeof message === 'string') {
    return entryFromString(message);
  }
  else if (typeof message === 'object') {
    return entryFromObject(message);
  }

  throw new Error('A message can either be an object or a string');
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

    var size = selectn('Attributes.ApproximateNumberOfMessages', result);
    cb(null, parseInt(size));
  });
};

module.exports.create = function(options) {
  return new Producer(options);
};