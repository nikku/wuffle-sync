const bodyParser = require('body-parser').text();

const {
  cors,
  withSession
} = require('./middleware');

const {
  record
} = require('./recorder');

const apps = [
  require('./apps/org-auth'),
  require('./apps/auth-flow'),
  require('./apps/background-sync'),
  require('./apps/automatic-dev-flow')
];

const loadConfig = require('./load-config');

const Store = require('./store');


module.exports = async app => {

  const config = loadConfig();

  // create store
  const store = new Store(config);

  // issues
  app.on([
    'issues.opened',
    'issues.reopened'
  ], async ({ payload }) => {
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
    'pull_request.opened',
    'pull_request.reopened'
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

  app.router.get('/wuffle/updates', withSession, cors(async (req, res) => {
    const cursor = req.query.cursor;

    const updates = cursor ? store.getUpdates(cursor) : [];

    res.json(updates);
  }));

  app.router.post('/wuffle/issues/move', bodyParser, cors(async (req, res) => {
    const body = JSON.parse(req.body);

    const {
      before,
      after,
      column,
      id,
    } = body;

    console.log(`move issue ${id} to position`, { before, column, after });

    const issue = store.getIssue({ id });

    store.updateIssues([{
      ...issue,
      before,
      after
    }]);

    res.json({});
  }));


  // load child apps ///////////////

  for (const appFn of apps) {
    await appFn(app, config, store);
  }


  // public API ////////////////////

  app.store = store;
};