const {
  randomString
} = require('../util');


module.exports.withSession = require('express-session')({
  secret: process.env.SESSION_SECRET || randomString(),
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 60000,
    sameSite: false
  }
});


/**
 * A cors allowed middleware
 *
 * @param  {Function} fn handler to be wrapped
 *
 * @return {Function} wrapped fn
 */
module.exports.cors = function cors(fn) {

  return function(req, res) {

    // enable cors
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    return fn(req, res);
  };
};