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
  const idata = req.body;
try {
    if (idata.slackId) {
      await slackApp.client.chat.postMessage({
        channel: idata.slackId,
        text: `I see that your YSWS is not on ysws.hackclub.com :sad_blahaj: , I would like you to add it there! To make this process easier, fill out this form: https://navdeep.fillout.com/ysws-adder and we will handle the rest :okay-1:`
      });
    }
    res.status(200).send('Message sent');
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Error sending message');
  }
});

expressApp.post('/newyswsrequest', async (req, res) => {
  const data = req.body;
    console.log('Received new YSWS request:', data);

try {
    await slackApp.client.chat.postMessage({
      channel: process.env.PRIVATE_CHANNEL_ID,
      text: `New YSWS Adder Submission: ${data.name}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `name: ${data.name}\n
description: ${data.description}\n
website: ${data.website}\n
slack: ${data.slack}\n
slackChannel: ${data.slackChannel}\n
status: ${data.status}\n
deadline: ${data.deadline}\n
detailedDescription: ${data.detailedDescription}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Approve' },
              style: 'primary',
              value: JSON.stringify(data),
              action_id: 'approve_request'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ Reject' },
              style: 'danger',
              value: JSON.stringify(data),
              action_id: 'reject_request'
            }
          ]
        }
      ]
    });

    res.status(200).send('✅ Webhook processed successfully');
} catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('❌ Error processing webhook');
  }
});

slackApp.action('approve_request', async ({ ack, body, client }) => {
  await ack();
  const data = JSON.parse(body.actions[0].value);

  const yamlMessage = `
\`\`\`yaml
name: ${data.name}
description: ${data.description}
website: ${data.website}
slack: ${data.slack}
slackChannel: ${data.slackChannel}
status: active
deadline: ${data.deadline}
detailedDescription: ${data.detailedDescription}
\`\`\``;

  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message.ts,
    text: yamlMessage
  });
});

slackApp.action('reject_request', async ({ ack, body, client }) => {
  await ack();
  const data = JSON.parse(body.actions[0].value);

  await client.chat.postMessage({
    channel: data.slackId,
    text: `❌ Your YSWS Adder submission "${data.name}" was rejected. Please contact <@U083T3ZP6AV> for details.`
  });
});

(async () => {
  await slackApp.start(3000);
  expressApp.listen(3101, () => console.log('🌐 Webhook server running on port 3101'));
})();

