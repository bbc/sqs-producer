sqs-producer
====================

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

producer.send(['msg1', 'msg2'], function(err) {
  if (err) console.log(err); 
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
