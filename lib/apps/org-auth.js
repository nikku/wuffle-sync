
/**
 * This app offers the App#orgAuth(login) method to get an
 * authenticated GitHub client for the given login or organization.
 *
 * @param {Application} app
 * @param {Object} config
 * @param {Store} store
 */
module.exports = async (app, config, store) => {

  // cached data ///////////////////

  let authByLogin = {};

  let installations;


  // functionality /////////////////

  function getInstallations() {

    installations = installations || app.auth().then(github => {
      return github.apps.listInstallations({ per_page: 100 });
    }).then(response => response.data);

    return installations;
  }

  function orgAuth(login) {

    let auth = authByLogin[login];

    if (auth) {
      return auth;
    }

    return (
      authByLogin[login] = getInstallations().then(installations => {
        return app.auth(installations.find(i => i.account.login === login).id);
      })
    );
  }

  // TODO: nikku periodically expire installations / authByLogin

  // https://developer.github.com/v3/activity/events/types/#installationevent
  app.on('installation', () => {
    // expire cached entries
    installations = [];
    authByLogin = {};
  });


  // public API ///////////////////////

  app.orgAuth = orgAuth;
};