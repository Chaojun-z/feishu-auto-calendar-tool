const axios = require('axios');

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

async function getAccessToken() {
  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: FEISHU_APP_ID,
    app_secret: FEISHU_APP_SECRET
  });
  return res.data.tenant_access_token;
}

async function parseTextToEvent(text) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 简单时间解析
  let startTime = new Date(tomorrow);
  startTime.setHours(9, 0, 0, 0);
  let endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 1);

  const hourMatch = text.match(/(\d{1,2})[点:时]/);
  if (hourMatch) {
    startTime.setHours(parseInt(hourMatch[1]), 0, 0, 0);
    endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);
  }

  if (text.includes('今天') || text.includes('今日')) {
    startTime = new Date(now);
    endTime = new Date(now);
    if (hourMatch) {
      startTime.setHours(parseInt(hourMatch[1]), 0, 0, 0);
      endTime.setHours(parseInt(hourMatch[1]) + 1, 0, 0, 0);
    }
  }

  return {
    summary: text,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  };
}

async function sendReply(token, messageId, text) {
  await axios.post(`https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/reply`, {
    msg_type: 'text',
    content: JSON.stringify({ text })
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
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

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.send('飞书日历机器人运行中 🎉');
  }

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
      const messageId = body.event.message.message_id;

      const token = await getAccessToken();
      const event = await parseTextToEvent(text);
      await createCalendarEvent(token, event.summary, event.startTime, event.endTime);
      await sendReply(token, messageId, `✅ 已创建日程：${text}`);
    }

    return res.json({ code: 0 });
  } catch (err) {
    console.error(err);
    return res.json({ code: 0 });
  }
};
