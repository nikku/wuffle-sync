class Store {

  constructor(app) {
    this.assigned = [];
    this.issues = [];
    this.labels = [];
    this.milestones = [];
    this.repositories = [];
  }

  addIssue(issue) {
    this.issues = [
      ...this.issues,
      issue
    ];
  }

  replaceIssue(issue) {
    this.removeIssue(issue);
    this.addIssue(issue);
  }

  removeIssue(issue) {
    this.issues = this.issues.filter(({ id }) => id !== issue.id);
  }

  getIssues(filter) {
    return this._get(this.issues, filter);
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