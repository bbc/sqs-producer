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
      url: queueUrl,
      sqs: sqs
    }); 

  });

  afterEach(function () {
    sqs.sendMessageBatch.restore();
  });

  it('send pids as batch', function (done) {
    var expectedParams = {
      Entries: [
        { Id: 'pid1', MessageBody: 'pid1' },
        { Id: 'pid2', MessageBody: 'pid2' }
      ],
      QueueUrl: queueUrl
    };

    producer.send(['pid1', 'pid2'], function (errors) {
      sinon.assert.calledOnce(sqs.sendMessageBatch);
      sinon.assert.calledWith(sqs.sendMessageBatch, expectedParams);
      assert.equal(errors.length, 0);
      done();
    });
  });

  it('makes multiple batch request when the pids length is larger than 10', function (done) {
    producer.send(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], function (errors) {
      sinon.assert.calledTwice(sqs.sendMessageBatch);
      assert.equal(errors.length, 0);
      done();
    });
  });

  it('returns error when sqs fail', function (done) {
    var sqsError = new Error('sqs failed');
    sqs.sendMessageBatch.restore();
    sinon.stub(sqs, 'sendMessageBatch').yields(sqsError);
    producer.send([], function (errors) {
      assert.equal(errors[0], sqsError);
      done();
    });
  });
});