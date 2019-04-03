const {
  record
} = require('./lib/recorder');

const Store = require('./lib/store');

module.exports = app => {

  // create store
  const store = app.store = new Store(app);

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
}