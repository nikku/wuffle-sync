const {
  Cache
} = require('../util');

// 5 minutes
const TTL = 1000 * 60 * 10;


/**
 * This component provides the functionality to filter
 * issues based on user views.
 *
 * @param {Application} app
 * @param {Object} config
 * @param {Store} store
 */
module.exports = async (app, config, store) => {

  const cache = new Cache(TTL);

  function getRepository(issueOrPr) {
    const repository = issueOrPr.repository || issueOrPr.base.repo;

    if (!repository) {
      console.warn('failed to retrieve repository from issue', issueOrPr);

      throw new Error('failed to retrieve repository from issue');
    }

    return repository;
  }

  /**
   * Show publicly accessible issues only.
   */
  function filterPublic(issue) {
    const repo = getRepository(issue);

    return !repo.private;
  }

  /**
   * Filter issues and PRs that are member of the given
   * repositories.
   */
  async function createMemberFilter(repositories) {

    const repositoryMap = repositories.reduce((map, repo) => {

      map[repo] = true;

      return map;
    }, {});

    return function filterPrivate(issue) {

      if (filterPublic(issue)) {
        return true;
      }

      const repository = getRepository(issue);

      return repository.full_name in repositoryMap;
    };
  }

  function createAccessFilter(token) {

    return app.userAuth(token)
      .then(github => {
        return github.paginate(
          github.repos.list({
            access_token: token,
            visibility: 'private'
          }),
          res => res.data
        );
      }).then(repositories => {
        const repositoryNames = repositories.map(repo => repo.full_name);

        return createMemberFilter(repositoryNames);
      });
  }

  function getAccessFilter(token) {

    if (!token) {
      return Promise.resolve(filterPublic);
    }

    return cache.get(token, createAccessFilter).catch(err => {
      console.warn('Failed to retrieve token-based access filter', err);

      return filterPublic;
    });
  }


  // api ////////////////////

  app.getAccessFilter = getAccessFilter;


  // behavior ///////////////

  if (process.env.NODE_ENV !== 'test') {

    setInterval(() => {
      cache.evict();
    }, 1000 * 10);
  }

};