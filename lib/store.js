const {
  groupBy
} = require('min-dash');


class Store {

  constructor(config) {
    this.assigned = [];
    this.issues = [];
    this.labels = [];
    this.milestones = [];
    this.repositories = [];

    this.updates = new Updates();

    this.columns = config.columns;

  }

  addIssue(issue) {

    const getColumn = columnGetter(this.columns);

    issue = {
      ...issue,
      column: getColumn(issue)
    };

    this.issues = [
      ...this.issues,
      issue
    ];

    this.updates.add(issue.id, { type: 'update', issue });
  }

  replaceIssue(issue) {
    this.removeIssue(issue);
    this.addIssue(issue);
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

  addLabel(label) {
    this.labels = [
      ...this.labels,
      label
    ];
  }

  replaceLabel(label) {
    this.removeIssue(label);
    this.addIssue(label);
  }

  removeLabel(label) {
    this.label = this.label.filter(({ id }) => id !== label.id);
  }

  getLabels(filter) {
    return this._get(this.labels, filter);
  }

  addMilestone(milestone) {
    this.milestones = [
      ...this.milestones,
      milestone
    ];
  }

  replaceMilestone(milestone) {
    this.removeIssue(milestone);
    this.addIssue(milestone);
  }

  removeMilestone(milestone) {
    this.milestone = this.milestone.filter(({ id }) => id !== milestone.id);
  }

  getMilestones(filter) {
    return this._get(this.milestones, filter);
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

    console.log('add update', id);

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

  const defaultColumn = columns.find(c => c.label === null && !c.closed);

  return function(issue) {

    const column = columns.find(
      column => (!!column.closed === !!issue.closed_at) && issue.labels.find(l => l.name === column.label)
    );

    return (column || defaultColumn).name;
  };
}