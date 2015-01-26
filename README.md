sqs-producer
====================

[![Build Status](https://travis-ci.org/BBC/sqs-producer.svg)](https://travis-ci.org/BBC/sqs-producer) [![Code Climate](https://codeclimate.com/github/BBC/sqs-producer/badges/gpa.svg)](https://codeclimate.com/github/BBC/sqs-producer) [![Test Coverage](https://codeclimate.com/github/BBC/sqs-producer/badges/coverage.svg)](https://codeclimate.com/github/BBC/sqs-producer)

Enqueues messages onto a given SQS queue

## Installation

```
npm install BBC/sqs-producer --save
```
## Usage

```js
var Producer = require('sqs-producer');

var producer = Producer.create({
  queueUrl: 'https://sqs.eu-west-1.amazonaws.com/account-id/queue-name',
  region: 'eu-west-1'
});

// send messages to the queue
producer.send(['msg1', 'msg2'], function(err) {
  if (err) console.log(err);
});

// get the current size of the queue
producer.queueSize(function (err, size) {
  if (err) console.log(err);

  console.log('There are', size, 'messages on the queue.');
});

```

## Test

```
npm test
```

## Coverage
For coverage report, run the command:

```
npm run coverage
```

## JSLint
To check for problems using JSLint

```
npm run lint
```
