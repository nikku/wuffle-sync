/**
 * The bot component that performs a periodic back-ground sync
 * of a project.
 *
 * @param  {Application} app
 * @param  {Store} store
 */
const sync = async (app, config, store) => {

  const {
    repositories
  } = config;

  if (repositories.length === 0) {
    return console.error(
      'must declare <config.repositories> to let wuffle know which repositories should be synched in background'
    );
  }


  async function getInstallations() {
    const github = await app.auth();

    const {
      data: installations
    } = await github.apps.listInstallations({ per_page: 100 });

    return installations;
  }


  async function doSync(repositories, installations) {

    function createAuth(installations) {
      const cache = {};

      return async function(login) {
        if (!cache[login]) {
          cache[login] = app.auth(installations.find(i => i.account.login === login).id);
        }

        return await cache[login];
      };
    }

    const auth = createAuth(installations);

    for (const repository of repositories) {
      const [ owner, repo ] = repository.split('/');

      const github = await auth(owner);

      const {
        data: issues
      } = await github.issues.listForRepo({
        owner,
        repo
      });

      const {
        data: pull_requests
      } = await github.pullRequests.list({
        owner,
        repo
      });

      store.updateIssues([
        ...issues.map(i => ({ ...i, type: 'issue' })),
        ...pull_requests.map(p => ({ ...p, type: 'pull-request' }))
      ]);

      /*
      const {
        data: milestones
      } = await github.issues.listForRepo({
        owner,
        repo
      });

      store.updateLabels(issues);
      store.updateMilestones(issues);
      store.updateMembers(issues);
      */
    }

    // fetch milestones

    // fetch labels

    // fetch members
  }

  async function triggerSync() {

    app.log('synchronizing project');

    try {
      const installations = await getInstallations();

      await doSync(repositories, installations);

      app.log('synchronized project');
    } catch (error) {
      app.log('failed to synchronize project', error);
    }
  }


  // api ///////////////////

  app.triggerSync = triggerSync;


  if (process.env.NODE_ENV !== 'test') {

    // every hour
    setInterval(triggerSync, 60 * 60 * 1000);

    // sync initially
    triggerSync();
  }
};


module.exports = sync;