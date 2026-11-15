const {redis, allowed} = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  let d = req.body || {};
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = {}; } }
  if (!allowed(d.room, d.key || '')) return res.status(403).end();
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const nick = String(d.nick || '').trim().slice(0, 16);
  const text = String(d.text || '').trim().slice(0, 300);
  if (nick.length < 2 || !text) return res.status(400).end();
  try {
    const ok = await redis(['SET', 'rl:' + ip, '1', 'PX', '700', 'NX']);
    if (!ok) return res.status(429).end();
    const k = 'msgs:' + d.room;
    await redis(['LPUSH', k, JSON.stringify({nick, text, ts: Date.now()})]);
    await redis(['LTRIM', k, '0', '199']);
    res.status(204).end();
  } catch (e) { res.status(500).end(); }
};
