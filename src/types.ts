import type { MessageAttributeValue, SQSClient } from '@aws-sdk/client-sqs';

export interface ProducerOptions {
  /**
   * The URL of the queue to send messages to.
   */
  queueUrl: string;
  /**
   * The number of messages to send in a single batch.
   */
  batchSize?: number;
  /**
   * The SQS client to use. If not provided, a new client will be created.
   */
  sqs?: SQSClient;
  /**
   * The AWS region to use. If not provided, the region will be determined
   * from the `AWS_REGION` environment variable or will default to `eu-west-1.
   */
  region?: string;
  /**
   * In cases where a QueueUrl is given as input, that
   * will be preferred as the request endpoint.
   *
   * Set this value to false to ignore the QueueUrl and use the
   * client's resolved endpoint, which may be a custom endpoint.
   */
  useQueueUrlAsEndpoint?: boolean;
}

export interface Message {
  /**
   * An identifier for the message. This must be unique within
   * the batch of messages.
   */
  id: string;
  /**
   * The messages contents.
   */
  body: string;
  /**
   * This parameter applies only to FIFO (first-in-first-out) queues.
   * When set messages that belong to the same message group are processed
   * in a FIFO manner
   */
  groupId?: string;
  /**
   * This parameter applies only to FIFO (first-in-first-out) queues.
   * The token used for deduplication of messages within a 5-minute minimum
   * deduplication interval. If a message with a particular id is sent successfully,
   * subsequent messages with the same id are accepted
   * successfully but aren't delivered.
   */
  deduplicationId?: string;
  /**
   * The length of time, in seconds, for which to delay a specific message.
   * Valid values: 0 to 900. Maximum: 15 minutes.
   */
  delaySeconds?: number;
  /**
   * Each message attribute consists of a Name, Type, and Value. For more
   * information, see [Amazon SQS message attributes](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-attributes.html).
   */
  messageAttributes?: { [key: string]: MessageAttributeValue };
}
