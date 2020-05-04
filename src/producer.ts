import { SQS } from 'aws-sdk';
import { entryFromMessage } from './types';
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

  async send(messages: string | string[]): Promise<string[]> {
    const failedMessages = [];
    const startIndex = 0;

    if (!Array.isArray(messages)) {
      // tslint:disable-next-line: no-parameter-reassignment
      messages = [messages];
    }

    return this.sendBatch(failedMessages, messages, startIndex);
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

  private async sendBatch(failedMessages?: string[], messages?: string[], startIndex?: number): Promise<string[]> {
    const endIndex: number = startIndex + this.batchSize;
    const batch: string[] = messages.slice(startIndex, endIndex);
    const params: any = {
      QueueUrl: this.queueUrl
    };

    params.Entries = batch.map(entryFromMessage);

    const result = await this.sqs.sendMessageBatch(params).promise();
    const failedMessagesBatch = failedMessages.concat(result.Failed.map((entry) => entry.Id));

    if (endIndex < messages.length) {
      return this.sendBatch(failedMessagesBatch, messages, endIndex);
    }

    if (failedMessagesBatch.length === 0) {
      return undefined;
    }
    throw new Error(`Failed to send messages: ${failedMessagesBatch.join(', ')}`);
  }

}

Producer.create = (options: ProducerOptions): Producer => {
  return new Producer(options);
};
