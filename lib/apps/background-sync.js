/**
 * The bot component that performs a periodic back-ground sync
 * of a project.
 *
 * @param  {Application} app
 * @param  {Store} store
 */
module.exports = async (app, config, store) => {

  const {
    repositories
  } = config;

  if (repositories.length === 0) {
    return console.error(
      'must declare <config.repositories> to let wuffle know which repositories should be synched in background'
    );
  }

  async function doSync(repositories, installations) {

    for (const repository of repositories) {
      const [ owner, repo ] = repository.split('/');

      const github = await app.orgAuth(owner);

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

  async function backgroundSync() {

    app.log('synchronizing project');

    try {
      await doSync(repositories);

      app.log('synchronized project');
    } catch (error) {
      app.log('failed to synchronize project', error);
    }
  }


  // api ///////////////////

  app.backgroundSync = backgroundSync;


  if (process.env.NODE_ENV !== 'test') {

    // every hour
    setInterval(backgroundSync, 60 * 60 * 1000);

    // sync initially
    backgroundSync();
  }
};