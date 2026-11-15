// شات mido: سيرفر بدون مكتبات خارجية. التشغيل: MIDO_PASS=كلمة_السر node server.js
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const PASS = process.env.MIDO_PASS || ''; // لو فاضية، غرفة ميدو مقفولة على الكل
const ROOMS = {general:'الغرفة العامة', meet:'تعارف', games:'ألعاب', music:'موسيقى', culture:'ثقافة ونقاش', mido:'ميدو (خاصة)'};
const PRIVATE = new Set(['mido']);
const DB = path.join(__dirname, 'data.json');

let msgs = {};
try { msgs = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) {}
const clients = {};
for (const r in ROOMS) { msgs[r] = msgs[r] || []; clients[r] = new Set(); }

let saveT;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(DB, JSON.stringify(msgs), () => {}), 1000); };
const allowed = (room, key) => room in ROOMS && (!PRIVATE.has(room) || (PASS !== '' && key === PASS));
const push = (room, ev, data) => { for (const res of clients[room]) res.write('event: ' + ev + '\ndata: ' + JSON.stringify(data) + '\n\n'); };
const last = new Map();

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), q = u.searchParams;
  const room = q.get('room'), key = q.get('key') || '';

  if (u.pathname === '/') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
  if (u.pathname === '/api/rooms') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify(Object.keys(ROOMS).map(id => ({id, name: ROOMS[id], private: PRIVATE.has(id)}))));
  }
  if (u.pathname === '/api/history') {
    if (!allowed(room, key)) { res.writeHead(403); return res.end(); }
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify(msgs[room].slice(-80)));
  }
  if (u.pathname === '/api/stream') {
    if (!allowed(room, key)) { res.writeHead(403); return res.end(); }
    res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'});
    res.write('retry: 3000\n\n');
    clients[room].add(res);
    push(room, 'count', clients[room].size);
    const hb = setInterval(() => res.write(': hb\n\n'), 25000);
    req.on('close', () => { clearInterval(hb); clients[room].delete(res); push(room, 'count', clients[room].size); });
    return;
  }
  if (u.pathname === '/api/send' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (!allowed(d.room, d.key || '')) { res.writeHead(403); return res.end(); }
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const now = Date.now();
        if (now - (last.get(ip) || 0) < 700) { res.writeHead(429); return res.end(); }
        last.set(ip, now);
        const nick = String(d.nick || '').trim().slice(0, 16), text = String(d.text || '').trim().slice(0, 300);
        if (nick.length < 2 || !text) { res.writeHead(400); return res.end(); }
        const m = {nick, text, ts: now};
        msgs[d.room].push(m);
        if (msgs[d.room].length > 200) msgs[d.room].shift();
        push(d.room, 'msg', m);
        save();
        res.writeHead(204); res.end();
      } catch (e) { res.writeHead(400); res.end(); }
    });
    return;
  }
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log('شات mido شغال على http://localhost:' + PORT));
