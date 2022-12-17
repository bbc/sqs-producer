import {
  MessageAttributeValue,
  SQSClient
} from '@aws-sdk/client-sqs';

export interface ProducerOptions {
  queueUrl: string;
  batchSize?: number;
  sqs?: SQSClient;
  region?: string;
}

export interface Message {
  id: string;
  body: string;
  groupId?: string;
  deduplicationId?: string;
  delaySeconds?: number;
  messageAttributes?: { [key: string]: MessageAttributeValue };
}
