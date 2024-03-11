# sqs-producer

[![NPM downloads](https://img.shields.io/npm/dm/sqs-producer.svg?style=flat)](https://npmjs.org/package/sqs-producer)
[![Build Status](https://github.com/bbc/sqs-producer/actions/workflows/test.yml/badge.svg)](https://github.com/bbc/sqs-producer/actions/workflows/test.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/5220635a4598c9f1a546/maintainability)](https://codeclimate.com/github/bbc/sqs-producer/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/5220635a4598c9f1a546/test_coverage)](https://codeclimate.com/github/bbc/sqs-producer/test_coverage)

Enqueues messages onto a given SQS queue.

## Installation

To install this package, enter the following command into your terminal (or the variant of whatever package manager you are using):

```
npm install sqs-producer
```

> **Note**
> This library assumes you are using [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html). If you are using v2, please install v2.2.0:
>
> ```bash
> npm install sqs-producer@2.2.0 --save-dev
> ```

### Node Version

We will only support Node versions that are actively or security supported by the Node team. If you are still using an Node 14, please use a version of this library before the v3.2.1 release, if you are using Node 16, please use a version before the v3.3.0 release.

## Documentation

Visit [https://bbc.github.io/sqs-producer/](https://bbc.github.io/sqs-producer/) for the full API documentation.

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
// https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queue-recommendations.html
await producer.send({
  id: 'testId',
  body: 'Hello world from our FIFO queue!',
  groupId: 'group1234',
  deduplicationId: 'abcdef123456' // typically a hash of the message body
});
```

### Credentials

By default the consumer will look for AWS credentials in the places [specified by the AWS SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_AWS_Credentials). The simplest option is to export your credentials as environment variables:

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

```bash
npm test
```

### Coverage

For coverage report, run the command:

```bash
npm run coverage
```

### Lint

To check for problems using ESLint

```bash
npm run lint
```

## Contributing

We welcome and appreciate contributions for anyone who would like to take the time to fix a bug or implement a new feature.

But before you get started, [please read the contributing guidelines](https://github.com/bbc/sqs-producer/blob/main/.github/CONTRIBUTING.md) and [code of conduct](https://github.com/bbc/sqs-producer/blob/main/.github/CODE_OF_CONDUCT.md).

## License

SQS Producer is distributed under the Apache License, Version 2.0, see [LICENSE](./LICENSE) for more information.
