/**
 * This component performs a periodic back-ground sync of a project.
 *
 * @param  {Application} app
 * @param  {Object} config
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

  async function doSync(repositories) {

    for (const repositoryName of repositories) {
      const [ owner, repo ] = repositoryName.split('/');

      const github = await app.orgAuth(owner);

      const [
        issues,
        repository
      ] = await Promise.all([
        github.issues.listForRepo({
          owner,
          repo
        }).then(res => res.data),
        github.repos.get({
          owner,
          repo
        }).then(res => res.data)
      ]);

      console.log('synched %s', repositoryName);

      store.updateIssues(issues.map(issue => {

        const type = 'pull_request' in issue
          ? 'pull-request'
          : 'issue';

        return {
          type,
          repository,
          ...issue
        };

      }));

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


  // behavior ///////////////

  if (process.env.NODE_ENV !== 'test') {

    // every hour
    setInterval(backgroundSync, 60 * 60 * 1000);

    // sync initially
    backgroundSync();
  }
};