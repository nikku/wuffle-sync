const {
  Github
} = require('../recorder');

const IN_PROGRESS = 'In Progress';
const NEEDS_REVIEW = 'Needs Review';
const DONE = 'Done';


/**
 * This component implements automatic movement of issues
 * across the board, as long as the user adheres to a specified
 * dev flow.
 *
 * @param {Application} app
 * @param {Object} config
 * @param {Store} store
 */
module.exports = async (app, config, store) => {

  const columns = config.columns;

  function getCurrentColumns(issue) {
    return columns.filter(c => issue.labels.some(l => l.name === c.label));
  }

  function getLabelUpdate(issue, newState) {

    const targetColumn = columns.find(c => c.name === newState);

    const currentColumns = getCurrentColumns(issue);

    const remove = currentColumns.filter(c => c !== targetColumn).map(c => c.label);

    const add = currentColumns.includes(targetColumn) ? null : targetColumn.label;

    return {
      add,
      remove
    };
  }

  function findIssue(context, number) {

    return Github(context.github).issues.get(context.repo({ number }))
      .then(response => response.data)
      .catch(error => {
        // gracefully handle not found
        console.error('issue not found', error);

        return null;
      });
  }

  function findAndMoveIssue(context, number, newState) {
    return findIssue(context, number)
      .then((issue) => issue && moveIssue(context, issue, newState));
  }

  async function moveReferencedIssues(context, issue, newState) {

    // TODO(nikku): do that lazily, i.e. react to PR label changes?
    // would slower the movement but support manual moving-issue with PR

    const {
      body,
      title
    } = issue;

    const text = [ title, body ].join('\n -- \n');

    const pattern = /(?:closes|fixes)\s+#(\d+)/ig;

    // TODO(nikku): PR from external contributor
    // TODO(nikku): closes across repositories?

    let match;

    const tasks = [];

    // close all linked, same-repository issues, too
    while ((match = pattern.exec(text))) {

      const number = parseInt(match[1], 10);

      tasks.push(findAndMoveIssue(context, number, newState));
    }

    return Promise.all(tasks);
  }

  function moveIssue(context, issue, newState) {

    console.log('move #%s to %s', issue.number, newState);

    const {
      add,
      remove
    } = getLabelUpdate(issue, newState);

    return Promise.all([
      add && addLabel(context, issue, add),
      remove.length && removeLabels(context, issue, remove)
    ]);

    // TODO: automatically close issue once moved to DONE column
  }

  app.onActive([
    'issues.closed',
    'pull_request.closed'
  ], async (context) => {

    const {
      pull_request,
      issue
    } = context.payload;

    await moveIssue(context, issue || pull_request, DONE);
  });

  app.onActive('pull_request.ready_for_review', async (context) => {

    const {
      pull_request
    } = context.payload;

    await Promise.all([
      moveIssue(context, pull_request, NEEDS_REVIEW),
      moveReferencedIssues(context, pull_request, NEEDS_REVIEW)
    ]);
  });

  app.onActive([
    'pull_request.opened',
    'pull_request.reopened'
  ], async (context) => {

    const {
      pull_request
    } = context.payload;

    const {
      draft
    } = pull_request;

    const newState = draft ? IN_PROGRESS : NEEDS_REVIEW;

    console.log('pr #%s new state: %s', pull_request.number, newState);

    await Promise.all([
      moveIssue(context, pull_request, newState),
      moveReferencedIssues(context, pull_request, newState)
    ]);
  });

  app.onActive('pull_request.edited', async (context) => {

    const {
      pull_request
    } = context.payload;

    const columns = getCurrentColumns(pull_request);

    // move issue to reflect PR lazy reference

    if (columns.length) {
      await moveReferencedIssues(context, pull_request, columns[0].name);
    }
  });

  app.onActive('create', async (context) => {

    const {
      ref,
      ref_type
    } = context.payload;

    if (!ref_type === 'branch') {
      return;
    }

    const match = /(\d+)[-_]+/.exec(ref);

    if (!match) {
      return;
    }

    const number = match[1];

    await findAndMoveIssue(context, number, IN_PROGRESS);
  });


  // internal /////////////////////////////

  function addLabel(context, issue, label) {

    const {
      number
    } = issue;

    console.log('adding label %s to #%s', label, number);

    return Github(context.github).issues.addLabels(context.repo({
      number,
      labels: [ label ]
    }));
  }

  function removeLabels(context, issue, labels) {

    const {
      number
    } = issue;

    console.log('removing labels %O from #%s', labels, number);

    const tasks = [];

    for (const name of labels) {

      tasks.push(
        Github(context.github).issues.removeLabel(context.repo({
          number,
          name
        })).catch((error) => {
          // may return 404 if label does not exist; we ignore that fact
          console.error('failed to remove label', error);
        })
      );
    }

    return Promise.all(tasks);
  }

};