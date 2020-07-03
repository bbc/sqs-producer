import { SQS } from 'aws-sdk';
import { SendMessageBatchResultEntryList } from 'aws-sdk/clients/sqs';
import { Message, toEntry } from './types';
const requiredOptions = [
  'queueUrl'
];

interface ProducerOptions {
  queueUrl?: string;
  batchSize?: number;
  sqs?: SQS;
  region?: string;
}

export class Producer {
  static create: (options: ProducerOptions) => Producer;
  queueUrl: string;
  batchSize: number;
  sqs: SQS;
  region?: string;

  constructor(options: ProducerOptions) {
    this.validate(options);
    this.queueUrl = options.queueUrl;
    this.batchSize = options.batchSize || 10;
    this.sqs = options.sqs || new SQS({
      ...options,
      region: options.region || 'eu-west-1'
    });
  }

  async queueSize(): Promise<number> {
    const result = await this.sqs.getQueueAttributes({
      QueueUrl: this.queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages']
    }).promise();

    return Number(result && result.Attributes && result.Attributes.ApproximateNumberOfMessages);
  }

  async send(messages: string | Message | (string | Message)[]): Promise<SendMessageBatchResultEntryList> {
    const failedMessages = [];
    const successfulMessages = [];
    const startIndex = 0;
    const messagesArr = !Array.isArray(messages) ? [messages] : messages;

    return this.sendBatch(failedMessages, successfulMessages, messagesArr, startIndex);
  }

  private validate(options: ProducerOptions): void {
    for (const option of requiredOptions) {
      if (!options[option]) {
        throw new Error(`Missing SQS producer option [${option}].`);
      }
    }
    if (options.batchSize > 10 || options.batchSize < 1) {
      throw new Error('SQS batchSize option must be between 1 and 10.');
    }
  }

  private async sendBatch(failedMessages?: string[], successfulMessages?: SendMessageBatchResultEntryList, messages?: (string | Message)[], startIndex?: number): Promise<SendMessageBatchResultEntryList> {
    const endIndex = startIndex + this.batchSize;
    const batch = messages.slice(startIndex, endIndex);
    const params = {
      QueueUrl: this.queueUrl,
      Entries: batch.map(toEntry)
    };

    const result = await this.sqs.sendMessageBatch(params).promise();
    const failedMessagesBatch = failedMessages.concat(result.Failed.map((entry) => entry.Id));
    const successfulMessagesBatch = successfulMessages.concat(result.Successful);

    if (endIndex < messages.length) {
      return this.sendBatch(failedMessagesBatch, successfulMessagesBatch, messages, endIndex);
    }

    if (failedMessagesBatch.length === 0) {
      return successfulMessagesBatch;
    }
    throw new Error(`Failed to send messages: ${failedMessagesBatch.join(', ')}`);
  }

}

Producer.create = (options: ProducerOptions): Producer => {
  return new Producer(options);
};
