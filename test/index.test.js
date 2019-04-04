const {
  expect
} = require('chai');

const {
  loadRecording
} = require('./recording');


describe('bot', function() {

  it('should maintain store', async function() {

    // given
    const recording = loadRecording('repository-events');

    // when
    await recording.replay();

    // then
    const { app } = recording;

    const { store } = app;

    expect(store.getIssues({ title: 'TEST 1' })).to.have.length(1);
    expect(store.getIssues({ state: 'closed' })).to.have.length(1);
  });


  it('should handle issue life-cycle events', async function() {

    // given
    const recording = loadRecording('issue-events');

    // when
    await recording.replay();

    // then
    const { app } = recording;


    const { store } = app;

    const issue = store.getIssue({ number: 44 });

    expect(issue).to.exist;
  });


  describe('labels', function() {

    it('should add label on <label.created>', async function() {

      // given
      const recording = loadRecording('create-label');

      // when
      await recording.replay();

      // then
      const { app } = recording;

      const { store } = app;

      expect(store.getLabels()).to.have.length(1);
    });

  });


  describe('milestones', function() {

    it('should add milestone on <milestone.created>', async function() {

      // given
      const recording = loadRecording('create-milestone');

      // when
      await recording.replay();

      // then
      const { app } = recording;

      const { store } = app;

      expect(store.getMilestones()).to.have.length(1);
    });

  });

});