const entryId = (entry) => {
    return entry.Id;
}

const isString = (value) => {
    return typeof value === 'string' || value instanceof String;
}

const isObject = (value) => {
    return value && typeof value === 'object' && value instanceof Object;
}

const isMessageAttributeValid = (messageAttribute) => {
    if (!messageAttribute.DataType) {
        throw new Error('A MessageAttribute must have a DataType key');
    }
    if (!isString(messageAttribute.DataType)) {
        throw new Error('The DataType key of a MessageAttribute must be a String');
    }
    return true;
}

const entryFromObject = (message) => {
    if (!message.body) {
        throw new Error("Object messages must have 'body' prop");
    }

    if (!message.groupId && !message.deduplicationId && !message.id) {
        throw new Error("Object messages must have 'id' prop");
    }

    if (message.deduplicationId && !message.groupId) {
        throw new Error("FIFO Queue messages must have 'groupId' prop");
    }

    const entry = {
        MessageBody: message.body
    };

    if (message.id) {
        if (!isString(message.id)) {
            throw new Error('Message.id value must be a string');
        }
        entry.Id = message.id;
    }

    if (message.delaySeconds) {
        if (
            (typeof message.delaySeconds !== 'number') ||
            (message.delaySeconds < 0 || message.delaySeconds > 900)
        ) {
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

const entryFromString = (message) => {
    return {
        Id: message,
        MessageBody: message
    };
}

const entryFromMessage = (message) => {
    if (isString(message)) {
        return entryFromString(message);
    } else if (isObject(message)) {
        return entryFromObject(message);
    }

    throw new Error('A message can either be an object or a string');
}


module.exports = { entryId, entryFromMessage }