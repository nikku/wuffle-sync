const { URLSearchParams } = require('url');

const fetch = require('node-fetch');

const {
  withSession,
  cors
} = require('../middleware');

const {
  randomString
} = require('../util');


/**
 * This component implements automatic movement of issues
 * across the board, as long as the user adheres to a specified
 * dev flow.
 *
 * @param {Application} app
 * @param {Object} config
 * @param {Store} store
 */
module.exports = async (app, config, store) => {

  /**
   * Trigger login via GitHub OAuth flow.
   */
  app.router.get('/wuffle/login', withSession, cors(async (req, res) => {

    console.log('/wuffle/login', req.session.id);

    const state = randomString();

    const redirectTo = safeGetReferer(req, getClientBaseUrl(), '/board');

    req.session.login = {
      redirectTo,
      state
    };

    const params = new URLSearchParams();
    params.append('client_id', process.env.GITHUB_CLIENT_ID);
    params.append('state', state);
    params.append('scope', 'public_repo,repo');
    params.append('redirect_uri', appUrl('/wuffle/login/callback'));

    return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  }));


  /**
   * Trigger login via GitHub OAuth flow.
   */
  app.router.get('/wuffle/logout', withSession, cors(async (req, res) => {

    const redirectTo = clientUrl('/board');

    console.log('/wuffle/logout', req.session.id);

    return req.session.destroy(function(err) {
      return res.redirect(redirectTo);
    });

  }));


  /**
   * Handle login callback received from GitHub OAuth flow.
   */
  app.router.get('/wuffle/login/callback', withSession, cors(async (req, res) => {

    const {
      state,
      code
    } = req.query;

    const login = req.session.login;

    if (state !== login.state) {
      console.warn('state missmatch, aborting');

      return res.redirect(login.redirectTo);
    }

    const params = new URLSearchParams();
    params.append('code', code);
    params.append('state', state);
    params.append('client_id', process.env.GITHUB_CLIENT_ID);
    params.append('client_secret', process.env.GITHUB_CLIENT_SECRET);
    params.append('redirect_uri', appUrl('/wuffle/login/callback'));

    const githubAuth = await fetch('https://github.com/login/oauth/access_token', {
      headers: {
        'Accept': 'application/json'
      },
      method: 'POST',
      body: params
    }).then(res => {

      if (res.status >= 400) {
        throw new Error('FAILED');
      }

      return res.text();
    }).then(text => JSON.parse(text));

    // remove login token
    delete req.session.login;

    req.session.githubAuth = githubAuth;

    res.redirect(login.redirectTo);
  }));


  /**
   * Retrieve logged in user information.
   */
  app.router.get('/wuffle/login_check', withSession, cors(async (req, res) => {

    const {
      session
    } = req;

    const {
      githubAuth,
      githubProfile
    } = session;

    if (githubProfile) {
      return res.json(githubProfile);
    }

    const token = githubAuth && githubAuth.access_token;

    if (!token) {
      return res.json(null);
    }

    try {
      const user = await app.getAuthenticated(token);

      session.githubProfile = {
        login: user.login,
        avatar_url: user.avatar_url
      };

      return res.json(session.githubProfile);
    } catch (error) {
      return res.json(null);
    }
  }));

};


// helpers ///////////////////////

function getBaseUrl() {
  return process.env.BASE_URL || 'http://localhost:3000';
}

function getClientBaseUrl() {
  return process.env.CLIENT_BASE_URL || process.env.BASE_URL || 'http://localhost:3001';
}

function relativeUrl(baseUrl, location) {
  return `${baseUrl}${location}`;
}

function clientUrl(location) {
  return relativeUrl(getClientBaseUrl(), location);
}

function appUrl(location) {
  return relativeUrl(getBaseUrl(), location);
}

function isChildUrl(url, base) {
  return url.startsWith(base);
}

function safeGetReferer(req, base, fallbackUrl) {
  const referer = req.get('referer');

  if (referer && isChildUrl(referer, base)) {
    return referer;
  }

  return relativeUrl(base, fallbackUrl);
}