const { io } = require('socket.io-client');
const B = 'http://localhost:3000';
async function acct(p) {
  let r = await fetch(B + '/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: p, password: 'test1234' }) });
  if (r.status === 409) r = await fetch(B + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: p, password: 'test1234' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0]; const u = await r.json();
  return { u, cookie, s: io(B, { extraHeaders: { cookie }, transports: ['websocket'] }) };
}
(async () => {
  const a = await acct('Freddy'), b = await acct('Kossi');
  console.log('comptes', a.u.id, b.u.id);
  await new Promise((r) => setTimeout(r, 500));
  b.s.on('msg:new', (m) => console.log('B reçoit:', m.body));
  a.s.emit('msg:send', { to: b.u.id, body: 'Salut, on joue ?' });
  await new Promise((r) => setTimeout(r, 400));
  const conv = await (await fetch(B + '/api/conversations', { headers: { cookie: b.cookie } })).json();
  console.log('conv B unread', conv[0].unread, conv[0].last.body);
  const sr = await (await fetch(B + '/api/users?q=kos', { headers: { cookie: a.cookie } })).json(); console.log('recherche', sr.map(u=>u.pseudo+(u.online?'(on)':'')));
  b.s.on('challenge:in', ({ code }) => { console.log('défi reçu', code); b.s.emit('room:join', { code, country: 'fr' }); });
  let states = 0, last;
  a.s.on('game:state', (m) => { states++; last = m; if (m.ev.some(e=>e.t==='goal')) console.log('BUT', m.sc); });
  a.s.on('game:start', (m) => console.log('start', m.players.map((p) => p.user.pseudo + p.country)));
  a.s.emit('challenge:send', { to: b.u.id, country: 'bj' }, (r) => console.log('défi envoyé', r));
  const bot = (s, side) => setInterval(() => { if (!last) return; const ball = last.s, t = 3 + side * 18; s.emit('input', { dx: ball[0] - last.s[t] + (side ? -20 : 20), dy: ball[1] - last.s[t + 1] - 60, power: 0.8 }); }, 800);
  bot(a.s, 0); bot(b.s, 1);
  a.s.on('game:end', async (m) => { console.log('fin', m, 'états reçus', states);
    const me = await (await fetch(B + '/api/me', { headers: { cookie: a.cookie } })).json(); console.log('stats A', me.played, me.won); process.exit(0); });
})();
