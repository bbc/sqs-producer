var utils = require('./utils');
var Producer = utils.require('../lib/producer');
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

  it('sends messages as a batch', function (done) {
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