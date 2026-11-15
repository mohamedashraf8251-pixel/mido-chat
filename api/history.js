const {redis, allowed} = require('./_lib');
module.exports = async (req, res) => {
  const {room, key} = req.query;
  res.setHeader('Cache-Control', 'no-store');
  if (!allowed(room, key || '')) return res.status(403).end();
  try {
    const rows = await redis(['LRANGE', 'msgs:' + room, '0', '79']);
    res.status(200).json(rows.map(r => JSON.parse(r)).reverse());
  } catch (e) { res.status(500).json({error: 'storage'}); }
};
