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

    store.addIssue({
      type: 'issue',
      ...issue
    });
  });

  // TODO: must differentiate issue/pr when listening for
  // [ issue.milestoned, issue.demilestoned ]
  // The events are being fired for both, issues and pull requests.
  app.on([
    'issues.labeled',
    'issues.unlabeled',
    'issues.edited',
    'issues.closed'
  ], async ({ payload }) => {
    const { issue } = payload;

    store.replaceIssue({
      type: 'issue',
      ...issue
    });
  });

  app.on([
    'issues.deleted'
  ], async ({ payload }) => {
    const { issue } = payload;

    store.removeIssue({
      type: 'issue',
      ...issue
    });
  });

  // pull requests
  app.on([
    'pull_request.opened'
  ], async ({ payload }) => {
    const { pull_request } = payload;

    store.addIssue({
      type: 'pull-request',
      ...pull_request
    });
  });

  app.on([
    'pull_request.labeled',
    'pull_request.unlabeled',
    'pull_request.edited',
    'pull_request.ready_for_review',
    'pull_request.assigned',
    'pull_request.unassigned',
    'pull_request.closed'
  ], async ({ payload }) => {
    const { pull_request } = payload;

    store.replaceIssue({
      type: 'pull-request',
      ...pull_request
    });
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

  app.router.get('/wuffle/board', cors(async (req, res) => {
    res.json({
      items: store.getBoard(),
      cursor: store.getUpdateHead().id
    });
  }));

  app.router.get('/wuffle/columns', cors(async (req, res) => {
    res.json(config.columns.map(c => {
      const { name } = c;

      return { name };
    }));
  }));

  app.router.get('/wuffle/updates', cors(async (req, res) => {
    const cursor = req.query.cursor;

    const updates = cursor ? store.getUpdates(cursor) : [];

    res.json(updates);
  }));

  app.router.post('/wuffle/issues/move', cors(async (req, res) => {

    const {
      before,
      after,
      column
    } = req.query;

    console.log('move issue to position', { before, after, column });
  }));


  // load child apps ///////////////

  for (const appFn of apps) {
    await appFn(app, config, store);
  }


  // public API ////////////////////

  app.store = store;
};



// helpers ///////////////////////////

function cors(fn) {

  return function(req, res) {

    // enable cors
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    return fn(req, res);
  };
}