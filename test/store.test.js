const Store = require('../lib/Store');

describe('Store', function() {

  let store;

  beforeEach(function() {
    store = new Store();
  })


  it('should add issue', function() {
    
    // when
    const issue = {
      id: 'foo',
      title: 'Foo'
    };

    store.addIssue(issue);

    // then
    const issues = store.getIssues();

    expect(issues).toHaveLength(1);
    expect(issues[0]).toBe(issue);
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
    expect(store.getIssues()).toHaveLength(0);
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

    expect(store.getIssues()).toHaveLength(1);
    expect(issues[0].title).toBe('Bar');
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
    expect(store.getIssues()).toHaveLength(2);
    
    // when
    const issues = store.getIssues({ id: 'foo' });

    // then
    expect(issues).toHaveLength(1);
    expect(issues[0]).toBe(issue1);
  });

});