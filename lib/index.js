const bodyParser = require('body-parser').text();

const {
  cors,
  withSession,
  safeAsync
} = require('./middleware');

const {
  record
} = require('./recorder');

const apps = [
  require('./apps/org-auth'),
  require('./apps/user-auth'),
  require('./apps/auth-flow'),
  require('./apps/user-access'),
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
    const {
      issue,
      repository
    } = payload;

    store.addIssue({
      type: 'issue',
      ...issue,
      repository
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
    const {
      issue,
      repository
    } = payload;

    store.replaceIssue({
      type: 'issue',
      ...issue,
      repository
    });
  });

  app.on([
    'issues.deleted'
  ], async ({ payload }) => {
    const {
      issue,
      repository
    } = payload;

    store.removeIssue({
      type: 'issue',
      ...issue,
      repository
    });
  });

  // pull requests

  app.on([
    'pull_request.opened',
    'pull_request.reopened'
  ], async ({ payload }) => {
    const {
      pull_request,
      repository
    } = payload;

    store.addIssue({
      type: 'pull-request',
      ...pull_request,
      repository
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
    const {
      pull_request,
      repository
    } = payload;

    store.replaceIssue({
      type: 'pull-request',
      ...pull_request,
      repository
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

  function getIssueReadFilter(req) {
    const token = app.getGitHubToken(req);

    return app.getReadFilter(token);
  }

  function filterBoardItems(req, items) {

    return getIssueReadFilter(req).then(issueFilter => {

      return Object.entries(items).reduce((filteredItems, [ columnKey, columnIssues ]) => {

        filteredItems[columnKey] = columnIssues.filter(issueFilter);

        return filteredItems;
      }, {});

    });

  }


  function filterUpdates(req, updates) {

    return getIssueReadFilter(req).then(issueFilter => {

      return updates.filter(update => {
        return issueFilter(update.issue);
      });
    });

  }

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/


  // setup public endpoints ////////

  app.router.get('/wuffle/board', withSession, safeAsync(cors((req, res) => {

    const items = store.getBoard();
    const cursor = store.getUpdateHead().id;

    return filterBoardItems(req, items).then(filteredItems => {

      res.json({
        items: filteredItems,
        cursor
      });
    });

  })));

  app.router.get('/wuffle/columns', safeAsync(cors(async (req, res) => {
    res.json(config.columns.map(c => {
      const { name } = c;

      return { name };
    }));
  })));

  app.router.get('/wuffle/updates', withSession, safeAsync(cors((req, res) => {
    const cursor = req.query.cursor;

    const updates = cursor ? store.getUpdates(cursor) : [];

    return filterUpdates(req, updates).then(filteredUpdates => res.json(filteredUpdates));
  })));

  app.router.post('/wuffle/issues/move', withSession, bodyParser, safeAsync(cors(async (req, res) => {

    const login = app.getGitHubLogin(req);

    if (!login) {
      return res.status(401).json({});
    }

    const body = JSON.parse(req.body);

    const {
      before,
      after,
      column,
      id,
    } = body;

    const issue = store.getIssue({ id });

    const canWrite = await app.canWrite(login, issue);

    if (!canWrite) {
      return res.status(403).json({});
    }

    console.log(`move issue ${id} to position`, { before, column, after });

    store.updateIssues([{
      ...issue,
      before,
      after
    }]);

    res.json({});
  })));


  // load child apps ///////////////

  for (const appFn of apps) {
    await appFn(app, config, store);
  }


  // public API ////////////////////

  app.store = store;
};