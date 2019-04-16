const crypto = require('crypto');

module.exports.randomString = function(length=64) {
  return crypto.randomBytes(length).toString('base64');
};