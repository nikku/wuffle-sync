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

  function getRepository(issue) {
    const repository = issue.repository;

    if (!repository) {
      console.warn('failed to retrieve repository from issue', issue);

      throw new Error('failed to retrieve repository from issue');
    }

    return repository;
  }

  /**
   * Show publicly accessible issues only.
   */
  function filterPublic(issue) {
    return !getRepository(issue).private;
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

  function createReadFilter(token) {

    return app.userAuth(token)
      .then(github => {
        return github.paginate(
          github.repos.list.endpoint.merge({
            visibility: 'private'
          }),
          res => res.data
        );
      }).then(repositories => {
        const repositoryNames = repositories.map(repo => repo.full_name);

        return createMemberFilter(repositoryNames);
      });
  }

  function getReadFilter(token) {

    if (!token) {
      return Promise.resolve(filterPublic);
    }

    return cache.get(token, createReadFilter).catch(err => {
      console.warn('Failed to retrieve token-based access filter', err);

      return filterPublic;
    });
  }

  function canWrite(username, repoAndOwner) {

    const {
      repo,
      owner
    } = repoAndOwner;

    return app.orgAuth(owner)
      .then(github => {
        return github.repos.getCollaboratorPermissionLevel({
          repo,
          owner,
          username
        });
      }).then(res => {
        const {
          permission
        } = res.data;

        return (
          permission === 'write' ||
          permission === 'admin'
        );
      }).catch(err => {
        console.warn('failed to determine write status for login %s on %s/%s', username, owner, repo, err);

        return false;
      });
  }


  // api ////////////////////

  app.getReadFilter = getReadFilter;

  app.canWrite = canWrite;


  // behavior ///////////////

  if (process.env.NODE_ENV !== 'test') {

    setInterval(() => {
      cache.evict();
    }, 1000 * 10);
  }

};