const {
  expect
} = require('chai');

const Store = require('../lib/store');


describe('Store', function() {

  let store;

  beforeEach(function() {
    store = new Store();
  });


  it('should add issue', function() {

    // when
    const issue = {
      id: 'foo',
      title: 'Foo'
    };

    store.addIssue(issue);

    // then
    const issues = store.getIssues();

    expect(issues).to.have.length(1);
    expect(issues[0]).to.eql(issue);
  });


  it('should remove issue', function() {

    // given
    const issue = {
      id: 'foo',
      title: 'Foo'
    };

    store.addIssue(issue);

    // when
    store.removeIssue(issue);

    // then
    expect(store.getIssues()).to.have.length(0);
  });


  it('should replace issue', function() {

    // given
    const issue = {
      id: 'foo',
      title: 'Foo'
    };

    const updatedIssue = {
      id: 'foo',
      title: 'Bar'
    };

    store.addIssue(issue);

    // when
    store.replaceIssue(updatedIssue);

    // then
    const issues = store.getIssues({ id: 'foo' });

    expect(store.getIssues()).to.have.length(1);
    expect(issues[0].title).to.eql('Bar');
  });


  it('should get issues (filter)', function() {

    // given
    const issue1 = {
      id: 'foo',
      title: 'Foo'
    };

    const issue2 = {
      id: 'bar',
      title: 'Bar'
    };

    store.addIssue(issue1);
    store.addIssue(issue2);

    // assume
    expect(store.getIssues()).to.have.length(2);

    // when
    const issues = store.getIssues({ id: 'foo' });

    // then
    expect(issues).to.have.length(1);
    expect(issues[0]).to.eql(issue1);
  });


  it('should get single issue (filter)', function() {

    // given
    const issue1 = {
      id: 'foo',
      title: 'Foo'
    };

    const issue2 = {
      id: 'bar',
      title: 'Bar'
    };

    store.addIssue(issue1);
    store.addIssue(issue2);

    // assume
    expect(store.getIssues()).to.have.length(2);

    // when
    const issue = store.getIssue({ id: 'foo' });

    // then
    expect(issue).to.exist;
    expect(issue.id).to.eql('foo');
  });

});