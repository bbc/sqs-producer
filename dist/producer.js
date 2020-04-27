"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
const types_1 = require("./types");
const requiredOptions = [
    'queueUrl'
];
class Producer {
    constructor(options) {
        this.validate(options);
        this.queueUrl = options.queueUrl;
        this.batchSize = options.batchSize || 10;
        this.sqs = options.sqs || new aws_sdk_1.SQS(Object.assign(Object.assign({}, options), { region: options.region || 'eu-west-1' }));
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
        const endIndex = `${startIndex}${this.batchSize}`;
        const batch = messages.slice(startIndex, endIndex);
        const params = {
            QueueUrl: this.queueUrl
        };
        params.Entries = batch.map(types_1.entryFromMessage);
        const result = await this.sqs.sendMessageBatch(params).promise();
        // tslint:disable-next-line: no-parameter-reassignment
        failedMessages = failedMessages.concat(result.Failed.map((entry) => entry.Id));
        if (endIndex < messages.length) {
            return this._sendBatch(failedMessages, messages, endIndex);
        }
        if (failedMessages.length === 0) {
            return undefined;
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
    async send(messages) {
        const failedMessages = [];
        const startIndex = 0;
        if (!Array.isArray(messages)) {
            // tslint:disable-next-line: no-parameter-reassignment
            messages = [messages];
        }
        return this._sendBatch(failedMessages, messages, startIndex);
    }
}
Producer.create = (options) => {
    return new Producer(options);
};
module.exports = Producer;
