
function isString(s) {
    return typeof s === 'string' || s instanceof String;
}

function isObject(o) {
    return o && typeof o === 'object' && o instanceof Object;
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