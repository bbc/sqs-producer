# sqs-producer

[![NPM downloads](https://img.shields.io/npm/dm/sqs-producer.svg?style=flat)](https://npmjs.org/package/sqs-producer)
[![Build Status](https://github.com/bbc/sqs-producer/actions/workflows/test.yml/badge.svg)](https://github.com/bbc/sqs-producer/actions/workflows/test.yml)
[![Code Climate](https://codeclimate.com/github/BBC/sqs-producer/badges/gpa.svg)](https://codeclimate.com/github/BBC/sqs-producer)
[![Test Coverage](https://codeclimate.com/github/BBC/sqs-producer/badges/coverage.svg)](https://codeclimate.com/github/BBC/sqs-producer)

Enqueues messages onto a given SQS queue

## Installation

```
npm install sqs-producer
```

> **Note**
> This library assumes you are using [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html). If you are using v2, please install v2.2.0:
>
> ```bash
> npm install sqs-producer@5.8.0 --save-dev
> ```

## Usage

```js
import { Producer } from 'sqs-producer';
import { SQSClient } from '@aws-sdk/client-sqs';

// create simple producer
const producer = Producer.create({
  queueUrl: 'https://sqs.eu-west-1.amazonaws.com/account-id/queue-name',
  region: 'eu-west-1'
});

// send messages to the queue
await producer.send(['msg1', 'msg2']);

// get the current size of the queue
const size = await producer.queueSize();
console.log(`There are ${size} messages on the queue.`);

// send a message to the queue with a specific ID (by default the body is used as the ID)
await producer.send([
  {
    id: 'id1',
    body: 'Hello world'
  }
]);

// send a message to the queue with
// - delaySeconds (must be an number contained within 0 and 900)
// - messageAttributes
await producer.send([
  {
    id: 'id1',
    body: 'Hello world with two string attributes: attr1 and attr2',
    messageAttributes: {
      attr1: { DataType: 'String', StringValue: 'stringValue' },
      attr2: { DataType: 'Binary', BinaryValue: new Buffer('binaryValue') }
    }
  },
  {
    id: 'id2',
    body: 'Hello world delayed by 5 seconds',
    delaySeconds: 5
  }
]);

// send a message to a FIFO queue
//
// note that AWS FIFO queues require two additional params:
// - groupId (string)
// - deduplicationId (string)
//
// deduplicationId can be excluded if content-based deduplication is enabled
//
// http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queue-recommendations.html
await producer.send({
  id: 'testId',
  body: 'Hello world from our FIFO queue!',
  groupId: 'group1234',
  deduplicationId: 'abcdef123456' // typically a hash of the message body
});
```

### Credentials

By default the consumer will look for AWS credentials in the places [specified by the AWS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_AWS_Credentials). The simplest option is to export your credentials as environment variables:

```bash
export AWS_SECRET_ACCESS_KEY=...
export AWS_ACCESS_KEY_ID=...
```

If you need to specify your credentials manually, you can use a pre-configured instance of the [SQS Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/classes/sqsclient.html) client.

```js
import { Producer } from 'sqs-producer';
import { SQSClient } from '@aws-sdk/client-sqs';

// create simple producer
const producer = Producer.create({
  queueUrl: 'https://sqs.eu-west-1.amazonaws.com/account-id/queue-name',
  region: 'eu-west-1',
  sqs: new SQSClient({
    region: 'my-region',
    credentials: {
      accessKeyId: 'yourAccessKey',
      secretAccessKey: 'yourSecret'
    }
  })
});

// send messages to the queue
await producer.send(['msg1', 'msg2']);
```

## Development

### Test

```
npm test
```

### Coverage

For coverage report, run the command:

```
npm run coverage
```

### Lint

To check for problems using ESLint

```
npm run lint
```

## Contributing

See [contributing guildlines](./.github/CONTRIBUTING.md)
