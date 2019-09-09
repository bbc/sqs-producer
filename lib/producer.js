'use strict';

var SQS = require('aws-sdk/clients/sqs');
var _ = require('lodash');
var requiredOptions = [
  'queueUrl'
];

function validate(options) {
  requiredOptions.forEach(function (option) {
    if (!options[option]) {
      throw new Error('Missing SQS producer option [' + option + '].');
    }
  });

  if (options.batchSize > 10 || options.batchSize < 1) {
    throw new Error('SQS batchSize option must be between 1 and 10.');
  }
}

function Producer(options) {
  validate(options);

  this.queueUrl = options.queueUrl;
  this.batchSize = options.batchSize || 10;
  this.sqs = options.sqs || new SQS(Object.assign({}, options, {
    region: options.region || 'eu-west-1'
  }));
}

function entryId(entry) {
  return entry.Id;
}

function isMessageAttributeValid(messageAttribute) {
  if (!messageAttribute.DataType) {
    throw new Error('A MessageAttribute must have a DataType key');
  }
  if (typeof messageAttribute.DataType !== 'string') {
    throw new Error('The DataType key of a MessageAttribute must be a String');
  }
  return true;
}

function entryFromObject(message) {
  if (!message.body) {
    throw new Error('Object messages must have \'body\' prop');
  }

  if (!message.groupId && !message.deduplicationId && !message.id) {
    throw new Error('Object messages must have \'id\' prop');
  }

  if (message.deduplicationId && !message.groupId) {
    throw new Error('FIFO Queue messages must have \'groupId\' prop');
  }

  var entry = {
    MessageBody: message.body
  };

  if (message.id) {
    if (typeof message.id !== 'string') {
      throw new Error('Message.id value must be a string');
    }
    entry.Id = message.id;
  }

  if (message.delaySeconds) {
    if (
      (typeof message.delaySeconds !== 'number') ||
      (message.delaySeconds < 0 || message.delaySeconds > 900)
    ) {
      throw new Error('Message.delaySeconds value must be a number contained within [0 - 900]');
    }

    entry.DelaySeconds = message.delaySeconds;
  }

  if (message.messageAttributes) {
    if (typeof message.messageAttributes !== 'object') {
      throw new Error('Message.messageAttributes must be an object');
    }

    Object.keys(message.messageAttributes).every(function (key) {
      return isMessageAttributeValid(message.messageAttributes[key]);
    });

    entry.MessageAttributes = message.messageAttributes;
  }

  if (message.groupId) {
    if (typeof message.groupId !== 'string') {
      throw new Error('Message.groupId value must be a string');
    }

    entry.MessageGroupId = message.groupId;
  }

  if (message.deduplicationId) {
    if (typeof message.deduplicationId !== 'string') {
      throw new Error('Message.deduplicationId value must be a string');
    }

    entry.MessageDeduplicationId = message.deduplicationId;
  }

  return entry;
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
  } else if (typeof message === 'object') {
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

Producer.prototype._sendBatch = function (failedMessages, successfulMessages, messages, startIndex, cb) {
  var producer = this;
  var endIndex = startIndex + this.batchSize;
  var batch = messages.slice(startIndex, endIndex);
  var params = {
    QueueUrl: this.queueUrl
  };

  try {
    params.Entries = batch.map(entryFromMessage);
  } catch (err) {
    cb(err);
    return;
  }

  this.sqs.sendMessageBatch(params, function (err, result) {
    if (err) return cb(err);
    failedMessages = failedMessages.concat(result.Failed.map(entryId));
    successfulMessages = successfulMessages.concat(result.Successful);
    
    if (endIndex < messages.length) {
      return producer._sendBatch(failedMessages, successfulMessages, messages, endIndex, cb);
    }
    
    cb(createError(failedMessages), successfulMessages);
  });
};

Producer.prototype.send = function (messages, cb) {
  var failedMessages = [];
  var successfulMessages = [];
  var startIndex = 0;

  if (!Array.isArray(messages)) {
    messages = [messages];
  }

  this._sendBatch(failedMessages, successfulMessages, messages, startIndex, cb);
};

Producer.prototype.queueSize = function (cb) {
  this.sqs.getQueueAttributes({
    QueueUrl: this.queueUrl,
    AttributeNames: ['ApproximateNumberOfMessages']
  }, function (err, result) {
    if (err) return cb(err);

    var size = _.get(result, 'Attributes.ApproximateNumberOfMessages');
    cb(null, parseInt(size, 10));
  });
};

Producer.create = function (options) {
  return new Producer(options);
};

module.exports = Producer;
