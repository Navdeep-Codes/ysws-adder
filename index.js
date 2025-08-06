require('dotenv').config();
const { App } = require('@slack/bolt');
const express = require('express');
const bodyParser = require('body-parser');

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const expressApp = express();
expressApp.use(bodyParser.json());

expressApp.post('/dm-user', async (req, res) => {
  const data = req.body;
try {
    if (data.slackId) {
      await slackApp.client.chat.postMessage({
        channel: data.slackId,
        text: `I see that your YSWS is not on ysws.hackclub.com :sad_blahaj: , I would like you to add it there! To make this process easier, fill out this form: https://navdeep.fillout.com/ysws-adder and we will handle the rest :okay-1:`
      });
    }
    res.status(200).send('Message sent');
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Error sending message');
  }
});
(async () => {
  await slackApp.start(3000);
  expressApp.listen(3001, () => console.log('🌐 Webhook server running on port 3001'));
})();

