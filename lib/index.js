const bodyParser = require('body-parser').text();

const {
  cors,
  withSession,
  safeAsync
} = require('./middleware');

const {
  repoAndOwner
} = require('./util');

const {
  record
} = require('./recorder');

const apps = [
  require('./apps/dump-store'),
  require('./apps/on-active'),
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

  // intialize /////////////////////

  const config = loadConfig();

  const store = new Store(config);


  // load child apps ///////////////

  for (const appFn of apps) {
    await appFn(app, config, store);
  }


  // wire basic events //////////////

  // issues
  app.onActive([
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
  app.onActive([
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

  app.onActive([
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
  app.onActive([
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

  app.onActive([
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


  // endpoints ////////////////////////

  function textFilter(filter) {

    return function filterForText(issue) {
      const regexp = /(?:^|\s)([^:\s]+)(?:$|\s)/g;

      let match = regexp.exec(filter);

      if (!match) {
        return true;
      }

      const issueText = `#${issue.number} ${issue.title}\n\n${issue.body}`.toLowerCase();

      do {
        const searchText = match[1].toLowerCase();

        if (!issueText.includes(searchText)) {
          return false;
        }
      } while ((match = regexp.exec(filter)));

      return true;
    };

  }

  function getIssueSearchFilter(req) {
    const search = req.query.s;

    if (!search) {
      return null;
    }

    const filters = [
      textFilter(search)
    ];

    return function(issue) {
      return filters.every(f => !f || f(issue));
    };
  }

  function getIssueReadFilter(req) {
    const token = app.getGitHubToken(req);

    return app.getReadFilter(token);
  }

  function filterBoardItems(req, items) {

    const searchFilter = getIssueSearchFilter(req);

    return getIssueReadFilter(req).then(canAccess => {

      return Object.entries(items).reduce((filteredItems, [ columnKey, columnIssues ]) => {

        const accessFiltered = columnIssues.filter(canAccess);

        const searchFiltered = searchFilter ? accessFiltered.filter(searchFilter) : accessFiltered;

        filteredItems[columnKey] = searchFiltered;

        return filteredItems;
      }, {});

    });

  }

  function filterUpdates(req, updates) {

    const searchFilter = getIssueSearchFilter(req);

    return getIssueReadFilter(req).then(canAccess => {

      const accessFiltered = updates.filter(update => canAccess(update.issue));

      const searchFiltered = searchFilter ? accessFiltered.map(update => {

        if (!searchFilter(update.issue)) {
          return {
            ...update,
            type: 'remove'
          };
        }
      }) : accessFiltered;

      return searchFiltered;
    });

  }

  // public endpoints ////////

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

    const repo = repoAndOwner(issue);

    const canWrite = await app.canWrite(login, repo);

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


  // public API ////////////////////

  app.store = store;


  // behavior ///////////////////////

  if (process.env.NODE_ENV !== 'test') {

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

  }

};