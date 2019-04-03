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

    expect(store.getIssues({ title: 'TEST 1' })).toHaveLength(1);
    expect(store.getIssues({ state: 'closed' })).toHaveLength(1);
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

      expect(store.getLabels()).toHaveLength(1);
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

      expect(store.getMilestones()).toHaveLength(1);
    });

  });

});