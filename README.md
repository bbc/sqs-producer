sqs-producer
====================

[![NPM downloads](https://img.shields.io/npm/dm/sqs-producer.svg?style=flat)](https://npmjs.org/package/sqs-producer)
[![Build Status](https://travis-ci.org/bbc/sqs-producer.svg?branch=master)](https://travis-ci.org/bbc/sqs-producer?branch=master) 
[![Code Climate](https://codeclimate.com/github/BBC/sqs-producer/badges/gpa.svg)](https://codeclimate.com/github/BBC/sqs-producer) 
[![Test Coverage](https://codeclimate.com/github/BBC/sqs-producer/badges/coverage.svg)](https://codeclimate.com/github/BBC/sqs-producer)

Enqueues messages onto a given SQS queue

## Installation

```
npm install sqs-producer
```
## Usage

```js
const { Producer } = require('sqs-producer');

// create simple producer
const producer = Producer.create({
  queueUrl: 'https://sqs.eu-west-1.amazonaws.com/account-id/queue-name',
  region: 'eu-west-1'
});

// create custom producer (supporting all opts as per the API docs: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html#constructor-property)
const producer = Producer.create({
  queueUrl: 'https://sqs.eu-west-1.amazonaws.com/account-id/queue-name',
  region: 'eu-west-1',
  accessKeyId: 'yourAccessKey',
  secretAccessKey: 'yourSecret'
});

// send messages to the queue
await producer.send(['msg1', 'msg2']);

// get the current size of the queue
const size = await producer.queueSize();
console.log(`There are ${size} messages on the queue.`);

// send a message to the queue with a specific ID (by default the body is used as the ID)
await producer.send([{
  id: 'id1',
  body: 'Hello world'
}]);

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
  id: "testId",
  body: 'Hello world from our FIFO queue!',
  groupId: 'group1234',
  deduplicationId: 'abcdef123456' // typically a hash of the message body
});
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
