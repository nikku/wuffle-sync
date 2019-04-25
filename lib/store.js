const {
  groupBy
} = require('min-dash');


class Store {

  constructor(config) {
    this.issues = [];

    this.updates = new Updates();

    this.issueOrder = {};

    this.columns = config.columns;
  }

  addIssue(issue, column) {

    const { id } = issue;

    let order = this.getOrder(id);

    if (!order) {
      const lastIssue = this.issues[this.issues.length - 1];

      order = this.computeOrder(id, null, lastIssue && lastIssue.id);

      this.setOrder(id, order);
    }

    column = column || columnGetter(this.columns)(issue);

    issue = {
      ...issue,
      order,
      column
    };

    console.log('adding issue #%s to column %s', issue.number, issue.column);

    this.insertIssue(issue);

    this.updates.add(issue.id, { type: 'update', issue });
  }

  updateOrder(issue, before, after, column) {
    const order = this.computeOrder(issue, before, after);

    this.setOrder(issue, order);

    this.replaceIssue(this.getIssue({ id: issue }), column);
  }

  insertIssue(issue) {

    const { order } = issue;

    const insertIdx = this.issues.findIndex(issue => issue.order > order);

    if (insertIdx !== -1) {
      this.issues.splice(insertIdx, 0, issue);
    } else {
      this.issues.push(issue);
    }
  }

  replaceIssue(issue, newColumn) {
    this.removeIssue(issue);
    this.addIssue(issue, newColumn);
  }

  removeIssue(issue) {
    this.issues = this.issues.filter(({ id }) => id !== issue.id);

    this.updates.add(issue.id, { type: 'remove', issue });
  }

  getIssues(filter) {
    return this._get(this.issues, filter);
  }

  getIssue(filter) {
    const issues = this._get(this.issues, filter);

    if (issues.length > 1) {
      throw new Error('more than one issue found');
    }

    return issues[0];
  }

  computeOrder(issue, before, after) {

    const beforeOrder = before && this.issueOrder[before];
    const afterOrder = after && this.issueOrder[after];

    console.log('computeOrder', beforeOrder, afterOrder);

    if (beforeOrder && afterOrder) {
      return (beforeOrder + afterOrder) / 2;
    }

    if (beforeOrder) {
      return beforeOrder - 9999999.89912;
    }

    if (afterOrder) {
      return afterOrder + 9999999.89912;
    }

    // a good start :)
    return -9999999999.89912;
  }

  setOrder(issue, order) {

    console.log('#setOrder', issue, order);

    this.issueOrder[String(issue)] = order;
  }

  getOrder(issue) {
    return this.issueOrder[String(issue)];
  }

  _get(array, filter) {
    if (!filter) {
      return array;
    }

    return array.filter(item => match(item, filter));
  }

  getBoard() {
    return groupBy(this.issues, i => i.column);
  }

  updateIssues(openIssues) {

    openIssues.map(issue => {
      this.replaceIssue(issue);
    });
  }

  getUpdateHead() {
    return this.updates.getHead();
  }

  getUpdates(cursor) {
    return this.updates.getSince(cursor);
  }
}


class Updates {

  constructor() {

    this.counter = 7841316;
    this.head = null;
    this.updateMap = {};
    this.trackedMap = {};
    this.list = [];

    // dummy update
    this.add({});
  }

  nextID() {
    return String(this.counter++);
  }

  getHead() {
    return this.head;
  }

  add(trackBy, update) {

    if (typeof update === 'undefined') {
      update = trackBy;
      trackBy = null;
    }

    const head = this.getHead();
    const id = this.nextID();

    const next = {
      id,
      next: null,
      ...update
    };

    if (trackBy) {
      const existing = this.trackedMap[trackBy];

      if (existing) {
        existing.tombstone = true;
      }

      this.trackedMap[trackBy] = next;
    }

    if (head) {
      head.next = next;
    }

    this.list.push(next);

    this.updateMap[id] = next;

    this.head = next;
  }

  getSince(id) {

    let update = (this.updateMap[id] || this.list[0]).next;

    const updates = [];

    while (update) {

      const {
        next,
        tombstone,
        ...actualUpdate
      } = update;

      if (!tombstone) {
        updates.push(actualUpdate);
      }

      update = update.next;
    }

    return updates;
  }

}

module.exports = Store;

// helpers //////////

function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function match(properties, filter) {

  return Object.entries(filter).reduce((accumulator, entry) => {
    const [ key, value ] = entry;

    if (isObject(value)) {
      if (!isObject(properties[ key ])) {
        return false;
      }

      return match(properties[ key ], value);
    }

    console.log('comparing ' + properties[ key ] + ' to ' + value);

    return accumulator && (properties[ key ] === value);

  }, true);

}

function columnGetter(columns) {

  const defaultColumn = columns.find(c => c.isDefault) || columns[0];

  return function(issue) {

    const column = columns.find(column => {

      // we'll fall back to the default column anyway
      if (column === defaultColumn) {
        return false;
      }

      const {
        closed: columnClosed,
        label: columnLabel
      } = column;

      const issueClosed = !!issue.closed_at;

      if (issueClosed !== !!columnClosed) {
        return false;
      }

      if (!columnLabel) {
        return true;
      }

      return issue.labels.find(l => l.name === columnLabel);
    });

    console.log('assiging column %s to #%s', (column || defaultColumn).name, issue.number);

    return (column || defaultColumn).name;
  };
}