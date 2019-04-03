const {
  record
} = require('./lib/recorder');

const Store = require('./lib/store');

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.store = new Store(app);

  app.on('issue_comment.created', async context => {

    // `context` extracts information from the event, which can be passed to
    // GitHub API calls. This will return:
    //   { owner: 'yourname', repo: 'yourrepo', number: 123, body: 'Hello World !}

    const { payload } = context;

    const { comment } = payload;

    const {
      body
    } = comment;

    const match = /start in (\d+)\s*(s|seconds)($|\s)/i.exec(body);

    if (!match) {
      return;
    }

    const seconds = parseInt(match[1], 10);

    // Post start comment
    const {
      data: newComment
    } = await context.github.issues.createComment(context.issue({
      body: `Starting talk in __${seconds}__ seconds`
    }));

    const {
      id: comment_id
    } = newComment;

    // Count down in start comment
    for (let i = seconds - 1; i > 0; i--) {
      await wait(1);

      await context.github.issues.updateComment(context.repo({
        body: `Starting talk in __${i}__ seconds`,
        comment_id
      }));
    }

    await wait(2);

    await context.github.issues.updateComment(context.repo({
      body: `![LAUNCHING ROCKET](http://bestanimations.com/Sci-Fi/Rockets/nasa-rocket-space-flight-animated-gif-image-1.gif)`,
      comment_id
    }));

    await wait(60);

    // Post start feedback comment
    await context.github.issues.createComment(context.issue({
      body: `Did we launch yet?\n\n* [ ] yea\n* [ ] nope\n* [ ] maybe (don't know)`
    }));
  });

  app.on('*', async context => {
    const {
      event,
      payload
    } = context;

    const {
      action
    } = payload;

    const eventName = action ? `${event}.${action}` : event;

    record(eventName, {
      type: 'event',
      payload
    });
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}


function wait(seconds) {

  return new Promise((resolve, reject) => {
    setTimeout(resolve, seconds * 1000);
  });

}