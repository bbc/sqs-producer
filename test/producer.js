var Producer = require('../lib/producer');
var sinon = require('sinon');
var assert = require('assert');

var AWS = require('aws-sdk');
var sqs = new AWS.SQS();

describe('Producer', function () {
  var queueUrl = 'https://dummy-queue';
  var producer;

  beforeEach(function () {
    sinon.stub(sqs, 'sendMessageBatch').yields(null, {
      Failed: []
    });

    producer = new Producer({
      queueUrl: queueUrl,
      sqs: sqs
    });

  });

  afterEach(function () {
    sqs.sendMessageBatch.restore();
  });

  it('sends string messages as a batch', function (done) {
    var expectedParams = {
      Entries: [
        {
          Id: 'message1',
          MessageBody: 'message1'
        },
        {
          Id: 'message2',
          MessageBody: 'message2'
        }
      ],
      QueueUrl: queueUrl
    };

    producer.send(['message1', 'message2'], function (err) {
      assert.ifError(err);
      sinon.assert.calledOnce(sqs.sendMessageBatch);
      sinon.assert.calledWith(sqs.sendMessageBatch, expectedParams);
      done();
    });
  });

  it('accepts a single message instead of an array', function (done) {
    var expectedParams = {
      Entries: [
        {
          Id: 'message1',
          MessageBody: 'message1'
        }
      ],
      QueueUrl: queueUrl
    };

    producer.send('message1', function (err) {
      assert.ifError(err);
      sinon.assert.calledOnce(sqs.sendMessageBatch);
      sinon.assert.calledWith(sqs.sendMessageBatch, expectedParams);
      done();
    });
  });

  it('sends object messages as a batch', function (done) {
    var expectedParams = {
      Entries: [
        {
          Id: 'id1',
          MessageBody: 'body1'
        },
        {
          Id: 'id2',
          MessageBody: 'body2'
        }
      ],
      QueueUrl: queueUrl
    };

    var message1 = {
      id: 'id1',
      body: 'body1'
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send([message1, message2], function (err) {
      assert.ifError(err);
      sinon.assert.calledOnce(sqs.sendMessageBatch);
      sinon.assert.calledWith(sqs.sendMessageBatch, expectedParams);
      done();
    });
  });

  it('sends object messages with attributes as a batch', function (done) {
    var expectedParams = {
      Entries: [
        {
          Id: 'id1',
          MessageBody: 'body1',
          MessageAttributes: {
            attr1: {
              DataType: 'String',
              StringValue: 'value1'
            }
          }
        },
        {
          Id: 'id2',
          MessageBody: 'body2'
        }
      ],
      QueueUrl: queueUrl
    };

    var message1 = {
      id: 'id1',
      body: 'body1',
      messageAttributes: {
        attr1: {
          DataType: 'String',
          StringValue: 'value1'
        }
      }
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send([message1, message2], function (err) {
      assert.ifError(err);
      sinon.assert.calledOnce(sqs.sendMessageBatch);
      sinon.assert.calledWith(sqs.sendMessageBatch, expectedParams);
      done();
    });
  });

  it('sends object messages with FIFO params as a batch', function (done) {
    var expectedParams = {
      Entries: [
        {
          Id: 'id1',
          MessageBody: 'body1',
          DelaySeconds: 2,
          MessageGroupId: 'group1'
        },
        {
          Id: 'id2',
          MessageBody: 'body2',
          DelaySeconds: 3,
          MessageGroupId: 'group2'
        }
      ],
      QueueUrl: queueUrl
    };

    var message1 = {
      id: 'id1',
      body: 'body1',
      delaySeconds: 2,
      groupId: 'group1'
    };
    var message2 = {
      id: 'id2',
      body: 'body2',
      delaySeconds: 3,
      groupId: 'group2'
    };

    producer.send([message1, message2], function (err) {
      assert.ifError(err);
      sinon.assert.calledOnce(sqs.sendMessageBatch);
      sinon.assert.calledWith(sqs.sendMessageBatch, expectedParams);
      done();
    });
  });

  it('sends both string and object messages as a batch', function (done) {
    var expectedParams = {
      Entries: [
        {
          Id: 'message1',
          MessageBody: 'message1'
        },
        {
          Id: 'id2',
          MessageBody: 'body2'
        }
      ],
      QueueUrl: queueUrl
    };

    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send(['message1', message2], function (err) {
      assert.ifError(err);
      sinon.assert.calledOnce(sqs.sendMessageBatch);
      sinon.assert.calledWith(sqs.sendMessageBatch, expectedParams);
      done();
    });
  });

  it('makes multiple batch requests when the number of messages is larger than 10', function (done) {
    producer.send(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], function (err) {
      assert.ifError(err);
      sinon.assert.calledTwice(sqs.sendMessageBatch);
      done();
    });
  });

  it('returns an error when SQS fails', function (done) {
    var sqsError = new Error('sqs failed');

    sqs.sendMessageBatch.restore();
    sinon.stub(sqs, 'sendMessageBatch').yields(sqsError);

    producer.send(['foo'], function (err) {
      assert.equal(err, sqsError);
      done();
    });
  });

  it('returns an error when messages are neither strings nor objects', function (done) {
    var errMessage = 'A message can either be an object or a string';

    var message1 = {
      id: 'id1',
      body: 'body1'
    };
    var message2 = function () {};

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages have invalid delaySeconds params 1', function (done) {
    var errMessage = 'Message.delaySeconds value must be a number contained within [0 - 900]';

    var message1 = {
      id: 'id1',
      body: 'body1',
      delaySeconds: 'typo'
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages have invalid delaySeconds params 2', function (done) {
    var errMessage = 'Message.delaySeconds value must be a number contained within [0 - 900]';

    var message1 = {
      id: 'id1',
      body: 'body1',
      delaySeconds: 12345678
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages attributes don\'t have a DataType param', function (done) {
    var errMessage = 'A MessageAttribute must have a DataType key';

    var message1 = {
      id: 'id1',
      body: 'body1',
      messageAttributes: {
        attr1: {
          StringValue: 'value1'
        }
      }
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages attributes have an invalid DataType param', function (done) {
    var errMessage = 'The DataType key of a MessageAttribute must be a String';

    var message1 = {
      id: 'id1',
      body: 'body1',
      messageAttributes: {
        attr1: {
          DataType: ['wrong'],
          StringValue: 'value1'
        }
      }
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages have invalid groupId param', function (done) {
    var errMessage = 'Message.groupId value must be a string';

    var message1 = {
      id: 'id1',
      body: 'body1',
      groupId: 1234,
      deduplicationId: '1234'
    };

    producer.send(message1, function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages have invalid deduplicationId param', function (done) {
    var errMessage = 'Message.deduplicationId value must be a string';

    var message1 = {
      id: 'id1',
      body: 'body1',
      groupId: '1234',
      deduplicationId: 1234
    };

    producer.send(message1, function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });
  
  it('returns an error when fifo messages have no groupId param', function (done) {
    var errMessage = 'FIFO Queue messages must have \'groupId\' and \'deduplicationId\' props';

    var message1 = {
      id: 'id1',
      body: 'body1',
      deduplicationId: '1234'
    };

    producer.send(message1, function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when fifo messages have no deduplicationId param', function (done) {
    var errMessage = 'FIFO Queue messages must have \'groupId\' and \'deduplicationId\' props';

    var message1 = {
      id: 'id1',
      body: 'body1',
      groupId: '1234',
    };

    producer.send(message1, function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages are not of shape {id, body}', function (done) {
    var errMessage = 'Object messages must have \'id\' prop';

    var message1 = {
      noId: 'noId1',
      body: 'body1'
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages are not of shape {id, body} 2', function (done) {
    var errMessage = 'Object messages must have \'body\' prop';

    var message1 = {
      id: 'id1',
      noBody: 'noBody1'
    };
    var message2 = {
      id: 'id2',
      body: 'body2'
    };

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error identifting the messages that failed', function (done) {
    sqs.sendMessageBatch.restore();

    var failedMessages = [{
      Id: 'message1'
    }, {
      Id: 'message2'
    }, {
      Id: 'message3'
    }];
    sinon.stub(sqs, 'sendMessageBatch').yields(null, {
      Failed: failedMessages
    });

    producer.send(['message1', 'message2', 'message3'], function (err) {
      assert.equal(err.message, 'Failed to send messages: message1, message2, message3');
      done();
    });
  });

  it('returns the approximate size of the queue', function (done) {
    var expected = '10';
    sinon.stub(sqs, 'getQueueAttributes').withArgs({
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages']
    }).yields(null, {
      Attributes: {
        ApproximateNumberOfMessages: expected
      }
    });

    producer.queueSize(function (err, size) {
      sqs.getQueueAttributes.restore();
      assert.ifError(err);
      assert.strictEqual(size, parseInt(expected));
      done();
    });
  });

  describe('.create', function () {
      it('creates a new instance of a Producer', function () {
        var producer = Producer.create({
          queueUrl: queueUrl,
          sqs: sqs
        });
        assert(producer instanceof Producer);
      });
  });
});
