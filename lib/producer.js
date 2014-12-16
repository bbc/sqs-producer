var AWS = require('aws-sdk');
//var stats = require('ibl-stats');
var BATCH_SIZE = 10;

// TODO: add event emitter 
// TODO: add stats 

function Producer(options) {
  this.url = options.url;
  this.sqs = options.sqs;
}

Producer.prototype._createEntries = function(batch) {
  return batch.map(function (message) {
    return {
      Id: message,
      MessageBody: message
    };
  });
};

Producer.prototype._sendBatch = function(errors, messages, startIndex, cb) {

  var producer = this;

  var endIndex = startIndex + BATCH_SIZE;
  var batch = messages.slice(startIndex, endIndex);
  var params = {
    Entries: this._createEntries(batch),
    QueueUrl: this.url
  };

  //stats.increment('sqs.sentBatches');

  this.sqs.sendMessageBatch(params, function (err, result) {
    if (err) {
      errors.push(err);
      
    } else {
      result.Failed.forEach(function (entry) {
        errors.push(new Error("Failed to send message: " + entry.Id));
      });
    }

    if (endIndex < messages.length) {
      return producer._sendBatch(errors, messages, endIndex, cb);
    }

    cb(errors);
  });
};

Producer.prototype.send = function(messages, cb) {
  var errors = [];
  var startIndex = 0;
  this._sendBatch(errors, messages, startIndex, cb);
};

module.exports.create = function(options) {
  return new Producer(options);
};