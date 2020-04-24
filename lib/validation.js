
function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

function isObject(value) {
    return value && typeof value === 'object' && value instanceof Object;
}

function isMessageAttributeValid(messageAttribute) {
    if (!messageAttribute.DataType) {
        throw new Error('A MessageAttribute must have a DataType key');
    }
    if (!isString(messageAttribute.DataType)) {
        throw new Error('The DataType key of a MessageAttribute must be a String');
    }
    return true;
}

module.exports = { isObject, isString, isMessageAttributeValid };