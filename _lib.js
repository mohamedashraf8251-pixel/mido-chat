const crypto = require('crypto');
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const PASS = process.env.MIDO_PASS || ''; // لو فاضية، غرفة ميدو مقفولة على الكل
const ROOMS = {general:'الغرفة العامة', meet:'تعارف', games:'ألعاب', music:'موسيقى', culture:'ثقافة ونقاش', mido:'ميدو (خاصة)'};
const PRIVATE = new Set(['mido']);

async function redis(cmd) {
  const r = await fetch(URL_, {method: 'POST', headers: {Authorization: 'Bearer ' + TOKEN}, body: JSON.stringify(cmd)});
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
function same(a, b) {
  a = Buffer.from(String(a)); b = Buffer.from(String(b));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function allowed(room, key) {
  return Object.prototype.hasOwnProperty.call(ROOMS, room) &&
    (!PRIVATE.has(room) || (PASS !== '' && same(key || '', PASS)));
}
module.exports = {redis, ROOMS, PRIVATE, allowed};
