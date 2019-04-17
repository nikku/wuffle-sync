const { GitHubAPI } = require('probot/lib/github');


/**
 * This component provides the basic functionality to
 * authenticate users.
 *
 * @param {Application} app
 * @param {Object} config
 * @param {Store} store
 */
module.exports = async (app, config, store) => {

  /**
   * Get authenticated user by token.
   *
   * @param {String} token
   *
   * @return Promise<User>
   */
  async function getAuthenticated(token) {
    const github = await userAuth(token);

    const {
      data: user
    } = await github.users.getAuthenticated({
      access_token: token
    });

    return user;
  }


  /**
   * A GitHub instance, authenticated in the scope of a logged-in user.
   *
   * @param {String} token
   *
   * @return {Promise<GitHubAPI>}
   */
  function userAuth(token) {
    return Promise.resolve(
      GitHubAPI({
        Octokit: app.Octokit,
        auth: `token ${token}`,
        logger: app.log.child('github'),
        debug: true
      })
    );
  }


  // API /////////////////////////////

  app.getAuthenticated = getAuthenticated;

  app.userAuth = userAuth;
};