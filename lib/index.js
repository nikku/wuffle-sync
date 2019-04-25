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
  require('./apps/events-sync'),
  require('./apps/user-access'),
  require('./apps/background-sync'),
  require('./apps/automatic-dev-flow')
];

const loadConfig = require('./load-config');

const Store = require('./store');


module.exports = async app => {

  // intialize ///////////////////

  const config = loadConfig();

  const store = new Store(config);


  // endpoints ///////////////////

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

  app.router.get('/wuffle/cards', withSession, safeAsync(cors((req, res) => {

    const items = store.getBoard();
    const cursor = store.getUpdateHead().id;

    return filterBoardItems(req, items).then(filteredItems => {

      res.json({
        items: filteredItems,
        cursor
      });
    });
  })));

  app.router.get('/wuffle/board', withSession, safeAsync(cors((req, res) => {

    const {
      columns,
      repositories
    } = config;

    return res.json({
      columns: columns.map(c => {
        const { name } = c;

        return { name };
      }),
      name: repositories[0] || 'empty'
    });

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

    store.updateOrder(issue.id, before, after, column);

    const token = app.getGitHubToken(req);

    const github = await app.userAuth(token);

    const context = {
      github,
      repo(opts) {
        return {
          ...repo,
          ...opts
        };
      }
    };

    // we move the issue via GitHub and rely on the automatic-dev-flow
    // to pick up the update (and react to it)

    await Promise.all([
      app.moveIssue(context, issue, column),
      app.moveReferencedIssues(context, issue, column)
    ]);

    res.json({});
  })));


  // public API ////////////////////

  app.store = store;


  // load child apps ///////////////

  for (const appFn of apps) {
    await appFn(app, config, store);
  }


  // behavior //////////////////////

  if (process.env.NODE_ENV === 'development') {

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