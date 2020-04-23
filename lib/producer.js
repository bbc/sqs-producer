const SQS = require('aws-sdk/clients/sqs');
const requiredOptions = [
  'queueUrl'
];

function validate(options) {
  for (const option of requiredOptions) {
    if (!options[option]) {
      throw new Error(`Missing SQS producer option [${option}].`);
    }
  }
  if (options.batchSize > 10 || options.batchSize < 1) {
    throw new Error('SQS batchSize option must be between 1 and 10.');
  }
}

function Producer(options) {
  validate(options);

  this.queueUrl = options.queueUrl;
  this.batchSize = options.batchSize || 10;
  this.sqs = options.sqs || new SQS({
    ...options,
    region: options.region || 'eu-west-1'
  });
}

function entryId(entry) {
  return entry.Id;
}

function isString(s) {
  return typeof s === 'string' || s instanceof String;
}

function isObject(o) {
  return o && typeof o === 'object' && o instanceof Object;
}

function isMessageAttributeValid(messageAttribute) {
  if (!messageAttribute.DataType) {
    throw new Error('A MessageAttribute must have a DataType key');
  }
  if (!isString(messageAttribute.DataType)) {
    throw new Error('The DataType key of a MessageAttribute must be a String');
  }
  return true;
}

function entryFromObject(message) {
  if (!message.body) {
    throw new Error("Object messages must have 'body' prop");
  }

  if (!message.groupId && !message.deduplicationId && !message.id) {
    throw new Error("Object messages must have 'id' prop");
  }

  if (message.deduplicationId && !message.groupId) {
    throw new Error("FIFO Queue messages must have 'groupId' prop");
  }

  const entry = {
    MessageBody: message.body
  };

  if (message.id) {
    if (!isString(message.id)) {
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
    if (!isObject(message.messageAttributes)) {
      throw new Error('Message.messageAttributes must be an object');
    }

    Object.values(message.messageAttributes).every(isMessageAttributeValid);

    entry.MessageAttributes = message.messageAttributes;
  }

  if (message.groupId) {
    if (!isString(message.groupId)) {
      throw new Error('Message.groupId value must be a string');
    }

    entry.MessageGroupId = message.groupId;
  }

  if (message.deduplicationId) {
    if (!isString(message.deduplicationId)) {
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
  if (isString(message)) {
    return entryFromString(message);
  } else if (isObject(message)) {
    return entryFromObject(message);
  }

  throw new Error('A message can either be an object or a string');
}

Producer.prototype._sendBatch = async function (failedMessages, messages, startIndex) {
  const endIndex = startIndex + this.batchSize;
  const batch = messages.slice(startIndex, endIndex);
  const params = {
    QueueUrl: this.queueUrl
  };

  params.Entries = batch.map(entryFromMessage);

  const result = await this.sqs.sendMessageBatch(params).promise();

  failedMessages = failedMessages.concat(result.Failed.map(entryId));

  if (endIndex < messages.length) {
    return this._sendBatch(failedMessages, messages, endIndex);
  }

  if (failedMessages.length === 0) {
    return null;
  }

  throw new Error(`Failed to send messages: ${failedMessages.join(', ')}`);
};

Producer.prototype.send = function (messages) {
  const failedMessages = [];
  const startIndex = 0;

  if (!Array.isArray(messages)) {
    messages = [messages];
  }

  return this._sendBatch(failedMessages, messages, startIndex);
};

Producer.prototype.queueSize = async function () {
  const result = await this.sqs.getQueueAttributes({
    QueueUrl: this.queueUrl,
    AttributeNames: ['ApproximateNumberOfMessages']
  }).promise();

  return Number(result && result.Attributes && result.Attributes.ApproximateNumberOfMessages);
};

Producer.create = function (options) {
  return new Producer(options);
};

module.exports = Producer;
