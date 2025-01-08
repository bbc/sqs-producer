import {
  SQSClient,
  type SendMessageBatchResultEntry,
  SendMessageBatchCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";

import type { Message, ProducerOptions } from "./types.js";
import { toEntry } from "./format.js";
import { FailedMessagesError } from "./errors.js";

const requiredOptions = ["queueUrl"];

/**
 * [Usage](https://bbc.github.io/sqs-producer/index.html#usage)
 */
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
        useQueueUrlAsEndpoint: options.useQueueUrlAsEndpoint ?? true,
        region: options.region || process.env.AWS_REGION || "eu-west-1",
      });
  }

  /**
   * Returns the number of messages in the queue.
   * @returns A promise that resolves to the number of messages in the queue.
   */
  async queueSize(): Promise<number> {
    const command = new GetQueueAttributesCommand({
      QueueUrl: this.queueUrl,
      AttributeNames: ["ApproximateNumberOfMessages"],
    });

    const result = await this.sqs.send(command);

    return Number(
      result &&
        result.Attributes &&
        result.Attributes.ApproximateNumberOfMessages,
    );
  }

  /**
   * Send a message to the queue.
   * @param messages - A single message or an array of messages.
   * @returns A promise that resolves to the result of the send operation.
   */
  async send(
    messages: string | Message | (string | Message)[],
  ): Promise<SendMessageBatchResultEntry[]> {
    const failedMessages = [];
    const successfulMessages = [];
    const startIndex = 0;
    const messagesArr = !Array.isArray(messages) ? [messages] : messages;

    return this.sendBatch(
      failedMessages,
      successfulMessages,
      messagesArr,
      startIndex,
    );
  }

  /**
   * Validate the producer options.
   * @param options - The producer options to validate.
   * @throws Error if any required options are missing or invalid.
   */
  private validate(options: ProducerOptions): void {
    for (const option of requiredOptions) {
      if (!options[option]) {
        throw new Error(`Missing SQS producer option [${option}].`);
      }
    }
    if (options.batchSize > 10 || options.batchSize < 1) {
      throw new Error("SQS batchSize option must be between 1 and 10.");
    }
  }

  /**
   * Send a batch of messages to the queue.
   * @param failedMessages - An array of failed message IDs.
   * @param successfulMessages - An array of successful message results.
   * @param messages - An array of messages to send.
   * @param startIndex - The index of the first message in the batch.
   * @returns A promise that resolves to the result of the send operation.
   * @throws FailedMessagesError
   */
  private async sendBatch(
    failedMessages?: string[],
    successfulMessages?: SendMessageBatchResultEntry[],
    messages?: (string | Message)[],
    startIndex?: number,
  ): Promise<SendMessageBatchResultEntry[]> {
    const endIndex = startIndex + this.batchSize;
    const batch = messages.slice(startIndex, endIndex);
    const params = {
      QueueUrl: this.queueUrl,
      Entries: batch.map(toEntry),
    };

    const command = new SendMessageBatchCommand(params);
    const result = await this.sqs.send(command);
    const failedMessagesBatch = failedMessages.concat(
      result?.Failed?.map((entry) => entry.Id) || [],
    );
    const successfulMessagesBatch = successfulMessages.concat(
      result?.Successful || [],
    );

    if (endIndex < messages.length) {
      return this.sendBatch(
        failedMessagesBatch,
        successfulMessagesBatch,
        messages,
        endIndex,
      );
    }

    if (failedMessagesBatch.length === 0) {
      return successfulMessagesBatch;
    }
    throw new FailedMessagesError(failedMessagesBatch);
  }
}

/**
 * Creates a new producer.
 * @param options - The producer options.
 */
Producer.create = (options: ProducerOptions): Producer => {
  return new Producer(options);
};
