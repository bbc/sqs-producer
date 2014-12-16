module.exports.require = function (module) {
  return process.env.COVERAGE ? require(module.replace('lib', 'lib-cov')) : require(module);
};