module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.send('飞书日历机器人运行中 🎉');
  }
  const body = req.body;
  if (body && body.type === 'url_verification') {
    return res.json({ challenge: body.challenge });
  }
  return res.json({ code: 0 });
};
