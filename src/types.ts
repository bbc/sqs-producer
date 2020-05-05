import { SQS } from 'aws-sdk';
const { isObject, isString, isMessageAttributeValid } = require('./validation');

interface Message {
    id: string;
    body: any;
    groupId: string;
    deduplicationId: string;
    delaySeconds: number;
    messageAttributes: SQS.MessageBodyAttributeMap;
}

function entryFromObject(message: Message): any {
    if (!message.body) {
        throw new Error(`Object messages must have 'body' prop`);
    }

    if (!message.groupId && !message.deduplicationId && !message.id) {
        throw new Error(`Object messages must have 'id' prop`);
    }

    if (message.deduplicationId && !message.groupId) {
        throw new Error(`FIFO Queue messages must have 'groupId' prop`);
    }

    if (message.id) {
        if (!isString(message.id)) {
            throw new Error('Message.id value must be a string');
        }
    }

    const entry: SQS.SendMessageBatchRequestEntry = {
        MessageBody: message.body,
        Id: message.id
    };

    if (message.delaySeconds) {
        if ((typeof message.delaySeconds !== 'number') ||
            (message.delaySeconds < 0 || message.delaySeconds > 900)) {
            throw new Error('Message.delaySeconds value must be a number contained within [0 - 900]');
        }

        entry.DelaySeconds = message.delaySeconds;
    }

    if (message.messageAttributes) {
        if (!isObject(message.messageAttributes)) {
            throw new Error('Message.messageAttributes must be an object');
        }

        Object.values(message.messageAttributes).every(isMessageAttributeValid);

        entry.MessageAttributes = message.messageAttributes;
    }

    if (message.groupId) {
        if (!isString(message.groupId)) {
            throw new Error('Message.groupId value must be a string');
        }

        entry.MessageGroupId = message.groupId;
    }

    if (message.deduplicationId) {
        if (!isString(message.deduplicationId)) {
            throw new Error('Message.deduplicationId value must be a string');
        }

        entry.MessageDeduplicationId = message.deduplicationId;
    }

    return entry;
}

function entryFromString(message: Message): any {
    return {
        Id: message,
        MessageBody: message
    };
}

export function entryFromMessage(message: any): string[] {
    if (isString(message)) {
        return entryFromString(message);
    } else if (isObject(message)) {
        return entryFromObject(message);
    }

    throw new Error('A message can either be an object or a string');
}
