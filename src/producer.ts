import {
  SQSClient,
  SendMessageBatchResultEntry,
  SendMessageBatchCommand,
  GetQueueAttributesCommand
} from '@aws-sdk/client-sqs';
import { Message, toEntry } from './types';
const requiredOptions = ['queueUrl'];

interface ProducerOptions {
  queueUrl: string;
  batchSize?: number;
  sqs?: SQSClient;
  region?: string;
}

export class Producer {
  static create: (options: ProducerOptions) => Producer;
  queueUrl: string;
  batchSize: number;
  sqs: SQSClient;
  region?: string;

  constructor(options: ProducerOptions) {
    this.validate(options);
    this.queueUrl = options.queueUrl;
    this.batchSize = options.batchSize || 10;
    this.sqs =
      options.sqs ||
      new SQSClient({
        ...options,
        region: options.region || 'eu-west-1'
      });
  }

  async queueSize(): Promise<number> {
    const command = new GetQueueAttributesCommand({
      QueueUrl: this.queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages']
    });

    const result = await this.sqs.send(command);

    return Number(
      result &&
        result.Attributes &&
        result.Attributes.ApproximateNumberOfMessages
    );
  }

  async send(
    messages: string | Message | (string | Message)[]
  ): Promise<SendMessageBatchResultEntry[]> {
    const failedMessages = [];
    const successfulMessages = [];
    const startIndex = 0;
    const messagesArr = !Array.isArray(messages) ? [messages] : messages;

    return this.sendBatch(
      failedMessages,
      successfulMessages,
      messagesArr,
      startIndex
    );
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

  private async sendBatch(
    failedMessages?: string[],
    successfulMessages?: SendMessageBatchResultEntry[],
    messages?: (string | Message)[],
    startIndex?: number
  ): Promise<SendMessageBatchResultEntry[]> {
    const endIndex = startIndex + this.batchSize;
    const batch = messages.slice(startIndex, endIndex);
    const params = {
      QueueUrl: this.queueUrl,
      Entries: batch.map(toEntry)
    };

    const command = new SendMessageBatchCommand(params);
    const result = await this.sqs.send(command);
    const failedMessagesBatch = failedMessages.concat(
      result?.Failed?.map((entry) => entry.Id) || []
    );
    const successfulMessagesBatch = successfulMessages.concat(
      result?.Successful || []
    );

    if (endIndex < messages.length) {
      return this.sendBatch(
        failedMessagesBatch,
        successfulMessagesBatch,
        messages,
        endIndex
      );
    }

    if (failedMessagesBatch.length === 0) {
      return successfulMessagesBatch;
    }
    throw new Error(
      `Failed to send messages: ${failedMessagesBatch.join(', ')}`
    );
  }
}

Producer.create = (options: ProducerOptions): Producer => {
  return new Producer(options);
};
