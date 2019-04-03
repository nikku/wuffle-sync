const {
  record
} = require('./lib/recorder');

const Store = require('./lib/store');

module.exports = app => {

  // create store
  const store = app.store = new Store();

  // issues
  app.on('issues.opened', async ({ payload }) => {
    const { issue } = payload;

    store.addIssue(issue);
  });

  app.on('issues.closed', async ({ payload }) => {
    const { issue } = payload;

    store.replaceIssue(issue);
  });

  // labels
  app.on('label.created', async ({ payload }) => {
    const { label } = payload;

    store.addLabel(label);
  });

  // milestones
  app.on('milestone.created', async ({ payload }) => {
    const { milestone } = payload;

    store.addMilestone(milestone);
  });

  app.on('*', async context => {
    const {
      event,
      payload
    } = context;

    const {
      action
    } = payload;

    const eventName = action ? `${event}.${action}` : event;

    record(eventName, {
      type: 'event',
      payload
    });
  });


  app.events.on('wuffle.syncProject', async context => {

    const {
      payload
    } = context;

    const {
      repositories,
      installations
    } = payload;

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

      store.updateIssues(issues);

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
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/


  if (!process.env.REPOSITORIES) {
    console.error(
      'must define REPOSITORIES environment variable to let wuffle know which repositories should be synched / belong to this board'
    );
  } else {

    const repositories = process.env.REPOSITORIES.split(/,/);

    async function getInstallations() {
      const github = await app.auth();

      const {
        data: installations
      } = await github.apps.listInstallations({ per_page: 100 });

      return installations;
    }


    async function syncProject() {

      app.log('synchronizing project');

      try {
        const installations = await getInstallations();

        await app.events.emit('wuffle.syncProject', {
          payload: {
            repositories,
            installations
          }
        });

        app.log('synchronized project');
      } catch (error) {
        app.log('failed to synchronize project', error);
      }
    }

    // every hour
    setInterval(syncProject, 60 * 60 * 1000);

    // sync initially
    syncProject();
  }

  // Setup /probot/stats endpoint to return cached stats
  app.router.get('/wuffle/board', async (req, res) => {
    res.json(store.getBoard());
  });

}


function wait(seconds) {

  return new Promise((resolve, reject) => {
    setTimeout(resolve, seconds * 1000);
  });

}