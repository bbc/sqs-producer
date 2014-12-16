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

  it('sends pids as a batch', function (done) {
    var expectedParams = {
      Entries: [
        { Id: 'pid1', MessageBody: 'pid1' },
        { Id: 'pid2', MessageBody: 'pid2' }
      ],
      QueueUrl: queueUrl
    };

    producer.send(['pid1', 'pid2'], function (err) {
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

  it('returns an error identifting the message that failed', function (done) {
    sqs.sendMessageBatch.restore();
    
    var failedMessages = [{Id: 'pid1'}, {Id: 'pid2'}, {Id: 'pid3'}];
    sinon.stub(sqs, 'sendMessageBatch').yields(null, {Failed: failedMessages});
    
    producer.send(['pid1', 'pid2', 'pid3'], function (err) {
      assert.equal(err.message, 'Failed to send messages: pid1, pid2, pid3');
      done();
    });
  });
});