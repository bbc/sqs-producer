const SQS = require('aws-sdk/clients/sqs');
const { entryId, entryFromMessage } = require('./helpers');
const requiredOptions = [
  'queueUrl'
];

class Producer {
  constructor(options) {
    this.validate(options)
    this.queueUrl = options.queueUrl;
    this.batchSize = options.batchSize || 10;
    this.sqs = options.sqs || new SQS({
      ...options,
      region: options.region || 'eu-west-1'
    });
  }

  validate(options) {
    for (const option of requiredOptions) {
      if (!options[option]) {
        throw new Error(`Missing SQS producer option [${option}].`);
      }
    }
    if (options.batchSize > 10 || options.batchSize < 1) {
      throw new Error('SQS batchSize option must be between 1 and 10.');
    }
  }

  async _sendBatch(failedMessages, messages, startIndex) {
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
  }

  async queueSize() {
    const result = await this.sqs.getQueueAttributes({
      QueueUrl: this.queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages']
    }).promise();

    return Number(result && result.Attributes && result.Attributes.ApproximateNumberOfMessages);
  }

  send(messages) {
    const failedMessages = [];
    const startIndex = 0;

    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    return this._sendBatch(failedMessages, messages, startIndex);
  }
}

Producer.create = function (options) {
  return new Producer(options);
};

module.exports = Producer;
