
class Cache {

  constructor(ttl) {
    this.ttl = ttl;

    this.entries = {};
  }

  evict() {

    const {
      entries,
      ttl
    } = this;

    if (ttl === -1) {
      return;
    }

    const now = Date.now();

    Object.keys(entries).forEach(key => {

      const entry = entries[key];

      if (now - entry.created > ttl) {
        delete entries[key];
      }
    });

  }

  get(key, defaultValue) {

    const entry = this.entries[key];

    if (entry) {
      return entry.value;
    }

    const value =
      typeof defaultValue === 'function'
        ? defaultValue(key)
        : defaultValue;

    this.set(key, value);

    return value;
  }

  set(key, value) {
    this.entries[key] = {
      created: Date.now(),
      value
    };
  }

}

module.exports.Cache = Cache;


class NoopCache {

  evict() { }

  get(key, defaultValue) {

    const value =
      typeof defaultValue === 'function'
        ? defaultValue()
        : defaultValue;

    return value;
  }
}

module.exports.NoopCache = NoopCache;