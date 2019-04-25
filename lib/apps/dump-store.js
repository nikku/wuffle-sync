const fs = require('fs');

/**
 * This component restores a store dump on startup and periodically
 * persists the store to disc.
 *
 * @param  {Application} app
 * @param  {Object} config
 * @param  {Store} store
 */
module.exports = async (app, config, store) => {

  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const storeLocation = 'tmp/storedump.json';


  function dumpStore() {

    try {
      console.log('Saving store dump to %s', storeLocation);

      const {
        issues,
        lastSync,
        issueOrder
      } = store;

      const dump = JSON.stringify({
        issues,
        lastSync,
        issueOrder
      });

      fs.writeFileSync(storeLocation, dump, 'utf-8');
    } catch (error) {
      console.warn('Failed to dump store to %s: %s', storeLocation, error.message);
    }
  }

  function restoreStore() {

    try {
      const contents = fs.readFileSync(storeLocation, 'utf-8');

      const {
        issues,
        lastSync,
        issueOrder
      } = JSON.parse(contents);

      console.log('Restoring store from dump %s', storeLocation);

      store.issues = issues;
      store.lastSync = lastSync;
      store.issueOrder = issueOrder;
    } catch (error) {
      console.warn('Failed to restore store from dump %s: %s', storeLocation, error.message);
    }
  }

  // one minute
  const dumpInterval = 1000 * 60 * 1;

  setInterval(dumpStore, dumpInterval);

  restoreStore();
};