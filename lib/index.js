const {
  record
} = require('./recorder');

const apps = [
  require('./apps/background-sync')
];

const config = require('../wuffle.config.js');

const Store = require('./store');


module.exports = async app => {

  // create store
  const store = new Store(config);

  // issues
  app.on('issues.opened', async ({ payload }) => {
    const { issue } = payload;

    store.addIssue(issue);
  });

  app.on([
    'issues.labeled',
    'issues.unlabeled',
    'issues.edited',
    'issues.closed'
  ], async ({ payload }) => {
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


  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/


  // setup public endpoints ////////

  app.router.get('/wuffle/board', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    res.json(store.getBoard());
  });

  app.router.get('/wuffle/columns', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    res.json(config.columns.map(c => {
      const { name } = c;

      return { name };
    }));
  });

  // load child apps ///////////////

  for (const appFn of apps) {
    await appFn(app, config, store);
  }


  // public API ////////////////////

  app.store = store;
};