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

    console.log('Dumping store to %s', storeLocation);

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

    console.log('Store dumped to %s', storeLocation);

    fs.writeFile(storeLocation, dump, 'utf8', function(err) {
      if (err) {
        return console.warn('Failed to dump store to %s: %s', storeLocation, err.message);
      }
    });
  }

  function restoreStore() {

    console.log('Restoring store from %s', storeLocation);

    fs.readFile(storeLocation, 'utf8', function(err, contents) {

      if (err) {
        return console.warn('Failed to restore store from %s: %s', storeLocation, err.message);
      }

      try {
        const {
          issues,
          lastSync,
          issueOrder
        } = JSON.parse(contents);

        store.issues = issues || [];
        store.lastSync = lastSync;
        store.issueOrder = issueOrder || {};

        console.log('Store restored from %s', storeLocation);
      } catch (err) {
        console.warn('Failed to parse store: %s', err.message);
      }
    });
  }

  // one minute
  const dumpInterval = 1000 * 60 * 1;

  setInterval(dumpStore, dumpInterval);

  restoreStore();
};