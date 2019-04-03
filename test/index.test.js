const {
  loadRecording
} = require('./recording');


describe('bot', function() {


  it('should support basic flow', async function() {

    // given
    const recording = loadRecording('repository-events');

    // when
    await recording.replay();

    // then
    const { app } = recording;

    const { store } = app;


    const {
      issues,
      columns,
      members,
      labels,
      milestones,
      updates
    } = store;

    // updates = [
    //   { type: 'issue', issue: ... }
    // ]

    // issues: latest mirror of GitHub issues
    // contains labels, milestones, assignee, ...

    // columns (name, label)

    // column config
    const columns [
      { name: 'Inbox', label: null  },
      { name: 'Backlog', label: 'backlog' },
      { name: 'Ready', label: 'ready' },
      { name: 'In Progress', label: 'in progress' },
      { name: 'Needs Review', label: 'needs review' },
      { name: 'Done', label: null, closed: true },
    ];


  });

});