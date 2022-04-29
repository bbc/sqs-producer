import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient, SendMessageBatchCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { Producer } from '../src/producer';

const sqsMock = mockClient(SQSClient);

describe('Producer', () => {
  const queueUrl = 'https://dummy-queue';
  let producer;

  beforeEach(() => {
    sqsMock.on(SendMessageBatchCommand).resolves({
      Failed: [],
      Successful: []
    });

    producer = new Producer({
      queueUrl
    });
  });

  afterEach(() => {
    sqsMock.reset();
  });

  it('sends string messages as a batch', async () => {
    const expectedParams = {
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

    await producer.send(['message1', 'message2']);
    expect(sqsMock.commandCalls(SendMessageBatchCommand).length).toBe(1);
    expect(sqsMock.commandCalls(SendMessageBatchCommand)[0].args[0].input).toEqual(expectedParams);
  });

  it('accepts a single message instead of an array', async () => {
    const expectedParams = {
      Entries: [
        {
          Id: 'message1',
          MessageBody: 'message1'
        }
      ],
      QueueUrl: queueUrl
    };

    await producer.send('message1');
    expect(sqsMock.commandCalls(SendMessageBatchCommand).length).toBe(1);
    expect(sqsMock.commandCalls(SendMessageBatchCommand)[0].args[0].input).toEqual(expectedParams);
  });

  it('sends object messages as a batch', async () => {
    const expectedParams = {
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

    const message1 = {
      id: 'id1',
      body: 'body1'
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await producer.send([message1, message2]);
    expect(sqsMock.commandCalls(SendMessageBatchCommand).length).toBe(1);
    expect(sqsMock.commandCalls(SendMessageBatchCommand)[0].args[0].input).toEqual(expectedParams);
  });

  it('sends object messages with attributes as a batch', async () => {
    const expectedParams = {
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

    const message1 = {
      id: 'id1',
      body: 'body1',
      messageAttributes: {
        attr1: {
          DataType: 'String',
          StringValue: 'value1'
        }
      }
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await producer.send([message1, message2]);
    expect(sqsMock.commandCalls(SendMessageBatchCommand).length).toBe(1);
    expect(sqsMock.commandCalls(SendMessageBatchCommand)[0].args[0].input).toEqual(expectedParams);
  });

  it('sends object messages with FIFO params as a batch', async () => {
    const expectedParams = {
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

    const message1 = {
      id: 'id1',
      body: 'body1',
      delaySeconds: 2,
      groupId: 'group1'
    };
    const message2 = {
      id: 'id2',
      body: 'body2',
      delaySeconds: 3,
      groupId: 'group2'
    };

    await producer.send([message1, message2]);
    expect(sqsMock.commandCalls(SendMessageBatchCommand).length).toBe(1);
    expect(sqsMock.commandCalls(SendMessageBatchCommand)[0].args[0].input).toEqual(expectedParams);
  });

  it('sends both string and object messages as a batch', async () => {
    const expectedParams = {
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

    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await producer.send(['message1', message2]);
    expect(sqsMock.commandCalls(SendMessageBatchCommand).length).toBe(1);
    expect(sqsMock.commandCalls(SendMessageBatchCommand)[0].args[0].input).toEqual(expectedParams);
  });

  it('makes multiple batch requests when the number of messages is larger than 10', async () => {
    await producer.send(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
    expect(sqsMock.commandCalls(SendMessageBatchCommand).length).toBe(2);
  });

  it('returns an error when SQS fails', async () => {
    const errMessage = 'sqs failed';

    sqsMock.reset();
    sqsMock.on(SendMessageBatchCommand).rejects(errMessage);

    await expect(producer.send(['foo'])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns a list of successful SQS responses from the AWS SDK', async () => {
    const expectedResult = [{
      Id: 'bf84d3ae-1f99-4aa5-a6d6-1c8a3ec7279b',
      MessageId: 'd6f79694-bb5c-4cd7-bb39-3110ed744293',
      MD5OfMessageBody: '2f6fa42e801b4a6e4fd58a96f4f59840',
      MD5OfMessageAttributes: '8c229d10c5effd188ae1eef62fc3ffec'
    }];

    const response = {
      ResponseMetadata: {
        RequestId: '2e7c4a19-d74c-55ee-9dfb-1fe99f6fc65a'
      },
      Successful: [
        {
          Id: 'bf84d3ae-1f99-4aa5-a6d6-1c8a3ec7279b',
          MessageId: 'd6f79694-bb5c-4cd7-bb39-3110ed744293',
          MD5OfMessageBody: '2f6fa42e801b4a6e4fd58a96f4f59840',
          MD5OfMessageAttributes: '8c229d10c5effd188ae1eef62fc3ffec'
        }
      ],
      Failed: []
    };

    sqsMock.reset();
    sqsMock.on(SendMessageBatchCommand).resolves(response);

    const result = await producer.send(['foo']);

    expect(result).toStrictEqual(expectedResult);
  });

  it('returns an error when messages are neither strings nor objects', async () => {
    const errMessage = 'A message can either be an object or a string';

    const message1 = {
      id: 'id1',
      body: 'body1'
    };

    await expect(producer.send(['foo', message1, () => { }])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages have invalid delaySeconds params 1', async () => {
    const errMessage = 'Message.delaySeconds value must be a number contained within [0 - 900]';

    const message1 = {
      id: 'id1',
      body: 'body1',
      delaySeconds: 'typo'
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await expect(producer.send(['foo', message1, message2])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages have invalid delaySeconds params 2', async () => {
    const errMessage = 'Message.delaySeconds value must be a number contained within [0 - 900]';

    const message1 = {
      id: 'id1',
      body: 'body1',
      delaySeconds: 12345678
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await expect(producer.send(['foo', message1, message2])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages attributes don\'t have a DataType param', async () => {
    const errMessage = 'A MessageAttribute must have a DataType key';

    const message1 = {
      id: 'id1',
      body: 'body1',
      messageAttributes: {
        attr1: {
          StringValue: 'value1'
        }
      }
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await expect(producer.send(['foo', message1, message2])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages attributes have an invalid DataType param', async () => {
    const errMessage = 'The DataType key of a MessageAttribute must be a String';

    const message1 = {
      id: 'id1',
      body: 'body1',
      messageAttributes: {
        attr1: {
          DataType: ['wrong'],
          StringValue: 'value1'
        }
      }
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await expect(producer.send(['foo', message1, message2])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages have invalid id param', async () => {
    const errMessage = 'Message.id value must be a string';

    const message1 = {
      id: 1234,
      body: 'body1'
    };

    await expect(producer.send(message1)).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages have invalid groupId param', async () => {
    const errMessage = 'Message.groupId value must be a string';

    const message1 = {
      id: 'id1',
      body: 'body1',
      groupId: 1234
    };

    await expect(producer.send(message1)).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages have invalid deduplicationId param', async () => {
    const errMessage = 'Message.deduplicationId value must be a string';

    const message1 = {
      id: 'id1',
      body: 'body1',
      groupId: '1234',
      deduplicationId: 1234
    };

    await expect(producer.send(message1)).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when fifo messages have no groupId param', async () => {
    const errMessage = 'FIFO Queue messages must have \'groupId\' prop';

    const message1 = {
      id: 'id1',
      body: 'body1',
      deduplicationId: '1234'
    };

    await expect(producer.send(message1)).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages are not of shape {id, body}', async () => {
    const errMessage = 'Object messages must have \'id\' prop';

    const message1 = {
      noId: 'noId1',
      body: 'body1'
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await expect(producer.send(['foo', message1, message2])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error when object messages are not of shape {id, body} 2', async () => {
    const errMessage = 'Object messages must have \'body\' prop';

    const message1 = {
      id: 'id1',
      noBody: 'noBody1'
    };
    const message2 = {
      id: 'id2',
      body: 'body2'
    };

    await expect(producer.send(['foo', message1, message2])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns an error identifying the messages that failed', async () => {
    const errMessage = 'Failed to send messages: message1, message2, message3';

    const failedMessages = [{
      Id: 'message1',
      SenderFault: true,
      Code: 'code1'
    }, {
      Id: 'message2',
      SenderFault: false,
      Code: 'code2'
    }, {
      Id: 'message3',
      SenderFault: true,
      Code: 'code3'
    }];

    sqsMock.reset();
    sqsMock.on(SendMessageBatchCommand).resolves({
      Failed: failedMessages
    });

    await expect(producer.send(['message1', 'message2', 'message3'])).rejects.toEqual(
      new Error(errMessage)
    );
  });

  it('returns the approximate size of the queue', async () => {
    const expected = '10';
    sqsMock.on(GetQueueAttributesCommand, {
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages']
    }).resolves({
      Attributes: {
        ApproximateNumberOfMessages: expected
      }
    });

    const size = await producer.queueSize();
    expect(size).toStrictEqual(Number(expected));
  });

  describe('.create', () => {
    it('creates a new instance of a Producer', () => {
      const producerInstance = Producer.create({
        queueUrl
      });
      expect(producerInstance).toBeInstanceOf(Producer);
    });
  });
});
