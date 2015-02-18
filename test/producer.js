var Producer = require('../lib/producer');
var sinon = require('sinon');
var assert = require('assert');

var AWS = require('aws-sdk');
var sqs = new AWS.SQS();

describe('Producer', function () {
  var queueUrl = 'https://dummy-queue';
  var producer;

  beforeEach(function () {
    sinon.stub(sqs, 'sendMessageBatch').yields(null, {Failed: []});

    producer = Producer.create({
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
        { Id: 'message1', MessageBody: 'message1' },
        { Id: 'message2', MessageBody: 'message2' }
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

  it('sends object messages as a batch', function (done) {
    var expectedParams = {
      Entries: [
        { Id: 'id1', MessageBody: 'body1' },
        { Id: 'id2', MessageBody: 'body2' }
      ],
      QueueUrl: queueUrl
    };

    var message1 = { id: 'id1', body: 'body1' };
    var message2 = { id: 'id2', body: 'body2' };

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
        { Id: 'message1', MessageBody: 'message1' },
        { Id: 'id2', MessageBody: 'body2' }
      ],
      QueueUrl: queueUrl
    };

    var message2 = { id: 'id2', body: 'body2' };

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

    var message1 = { id: 'id1', body: 'body1' };
    var message2 = function() {};

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error when object messages are not of shape {id, body}', function (done) {
    var errMessage = 'Object messages must have \'id\' and \'body\' props';

    var message1 = { notId: 'notId1', body: 'body1' };
    var message2 = { id: 'id2', body: 'body2' };

    producer.send(['foo', message1, message2], function (err) {
      assert.equal(err.message, errMessage);
      done();
    });
  });

  it('returns an error identifting the messages that failed', function (done) {
    sqs.sendMessageBatch.restore();

    var failedMessages = [{Id: 'message1'}, {Id: 'message2'}, {Id: 'message3'}];
    sinon.stub(sqs, 'sendMessageBatch').yields(null, {Failed: failedMessages});

    producer.send(['message1', 'message2', 'message3'], function (err) {
      assert.equal(err.message, 'Failed to send messages: message1, message2, message3');
      done();
    });
  });

  it('returns the approximate size of the queue', function(done) {
    var expected = '10';
    sinon.stub(sqs, 'getQueueAttributes').withArgs({
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages']
    }).yields(null, {
      Attributes: {
        ApproximateNumberOfMessages: expected
      }
    });

    producer.queueSize(function(err, size) {
       sqs.getQueueAttributes.restore();
       assert.ifError(err);
       assert.strictEqual(size, parseInt(expected));
       done();
    });
  });
});