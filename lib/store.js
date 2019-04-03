class Store {

  constructor(app) {

    app.on('wuffle.syncProject', (context) => {

    });
  }

  getBoard(projectId) {

    const columns = [];
    const projects = [];
    const issues = [];

    return {
      columns,
      projects,
      issues
    };

  }

  getBoardConfig(projectId) {

  }

  syncProject(projectId) {

    // pull all labels, milestones and issues
    // remove old labels, milestones and issues
  }

}


module.exports = Store;