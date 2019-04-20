const {
  Cache,
  NoopCache
} = require('./cache');

const {
  findLinks,
  linkTypes
} = require('./links');

const crypto = require('crypto');

module.exports.randomString = function(length=64) {
  return crypto.randomBytes(length).toString('base64');
};

module.exports.Cache = Cache;

module.exports.NoopCache = NoopCache;

module.exports.findLinks = findLinks;

module.exports.linkTypes = linkTypes;