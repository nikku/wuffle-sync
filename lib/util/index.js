const {
  Cache,
  NoopCache
} = require('./cache');

const {
  findLinks,
  linkTypes
} = require('./links');

const {
  repoAndOwner
} = require('./meta');

const crypto = require('crypto');

module.exports.randomString = function randomString(length=64) {
  return crypto.randomBytes(length).toString('base64');
};

module.exports.Cache = Cache;

module.exports.NoopCache = NoopCache;

module.exports.findLinks = findLinks;

module.exports.linkTypes = linkTypes;

module.exports.repoAndOwner = repoAndOwner;