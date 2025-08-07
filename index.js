require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");
const express = require("express");
const bodyParser = require("body-parser");

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
        text: `I see that your YSWS is not on ysws.hackclub.com :sad_blahaj:\nFill this out: https://navdeep.fillout.com/ysws-adder and we’ll handle the rest :okay-1:`
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

slackApp.command("/post-request", async ({ ack, body, client }) => {
  await ack();

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "submit_post_request",
      title: { type: "plain_text", text: "What to post?" },
      submit: { type: "plain_text", text: "Submit" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "post_block",
          element: {
            type: "plain_text_input",
            multiline: true,
            action_id: "post_text"
          },
          label: { type: "plain_text", text: "Enter everything exactly as you want it to appear in the post." } 
        }
      ]
    }
  });
});

slackApp.view("submit_post_request", async ({ ack, body, view, client }) => {
  await ack();

  const user = body.user.id;
  const text = view.state.values.post_block.post_text.value;

  await client.chat.postMessage({
    channel: process.env.PRIVATE_CHANNEL_ID,
    text: `New post request from <@${user}>`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*New post request from <@${user}>:*\n>${text}` }
      },
      {
        type: "actions",
        block_id: "approval_actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve" },
            style: "primary",
            value: JSON.stringify({ user, text }),
            action_id: "approve_post"
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Deny" },
            style: "danger",
            value: user,
            action_id: "deny_post"
          }
        ]
      }
    ]
  });
});

slackApp.action("approve_post", async ({ ack, action, client }) => {
  await ack();
  const { user, text } = JSON.parse(action.value);

  const userInfo = await client.users.info({ user });
  const name = userInfo.user.real_name || userInfo.user.name;
  const image = userInfo.user.profile.image_72;

  await client.chat.postMessage({
    channel: process.env.PUBLIC_CHANNEL_ID,
    text,
    username: name,           
    icon_url: image,          
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text }
      }
    ]
  });
});

slackApp.action("deny_post", async ({ ack, action, client }) => {
  await ack();
  const user = action.value;

  await client.chat.postMessage({
    channel: user,
    text: `Your request to post in #ysws-annoucement got denied. Try again later.`
  });
});

(async () => {
  await slackApp.start(3100);
  expressApp.listen(3101, () => console.log("🌐 Webhook server running on port 3101"));
})();
