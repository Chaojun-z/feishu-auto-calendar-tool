const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

// 获取飞书访问令牌
async function getAccessToken() {
  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: FEISHU_APP_ID,
    app_secret: FEISHU_APP_SECRET
  });
  return res.data.tenant_access_token;
}

// 创建日历事件
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

// Webhook 入口
app.post('/webhook', async (req, res) => {
  const { type, event } = req.body;
  if (type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }
  if (event && event.message) {
    const text = JSON.parse(event.message.content).text;
    const token = await getAccessToken();
    // 简单解析：格式 "创建日程 标题 开始时间 结束时间"
    const parts = text.split(' ');
    if (parts[0] === '创建日程' && parts.length >= 4) {
      await createCalendarEvent(token, parts[1], parts[2], parts[3]);
      return res.json({ msg: '日程创建成功' });
    }
  }
  res.json({ msg: 'ok' });
});

app.get('/', (req, res) => res.send('飞书日历机器人运行中 🎉'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
