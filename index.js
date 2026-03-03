const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

async function getAccessToken() {
  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: FEISHU_APP_ID,
    app_secret: FEISHU_APP_SECRET
  });
  return res.data.tenant_access_token;
}

async function createCalendarEvent(token, summary, startTime, endTime) {
  const res = await axios.post('https://open.feishu.cn/open-apis/calendar/v4/calendars/primary/events', {
    summary,
    start_time: { timestamp: String(Math.floor(new Date(startTime).getTime() / 1000)) },
    end_time: { timestamp: String(Math.floor(new Date(endTime).getTime() / 1000)) }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    // 飞书URL验证
    if (body.type === 'url_verification') {
      return res.json({ challenge: body.challenge });
    }
    // 处理消息事件
    if (body.header && body.header.event_type === 'im.message.receive_v1') {
      const msgContent = JSON.parse(body.event.message.content);
      const text = msgContent.text.trim();
      const parts = text.split(' ');
      if (parts[0] === '创建日程' && parts.length >= 4) {
        const token = await getAccessToken();
        await createCalendarEvent(token, parts[1], parts[2], parts[3]);
      }
    }
    return res.json({ code: 0 });
  } catch (err) {
    console.error(err);
    return res.json({ code: 0 });
  }
});

app.get('/', (req, res) => res.send('飞书日历机器人运行中 🎉'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
