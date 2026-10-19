const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');
const { Server } = require('socket.io');
const Sim = require('./public/game/sim.js');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
const DB_FILE = path.join(DATA_DIR, 'data.db');

(async () => {
  const SQL = await initSqlJs();
  const db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, pseudo TEXT UNIQUE COLLATE NOCASE, hash TEXT,
    avatar TEXT DEFAULT '⚽', color TEXT DEFAULT '#7c5cff', bio TEXT DEFAULT '', played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, created INTEGER);
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, from_id INTEGER, to_id INTEGER, body TEXT, created INTEGER, read INTEGER DEFAULT 0);
    CREATE INDEX IF NOT EXISTS im ON messages(from_id, to_id);`);
  let saveT = null;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFileSync(DB_FILE, Buffer.from(db.export())), 300); };
  const all = (sql, p = []) => { const st = db.prepare(sql); st.bind(p); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; };
  const get = (sql, p) => all(sql, p)[0];
  const run = (sql, p = []) => { db.run(sql, p); const id = get('SELECT last_insert_rowid() id').id; save(); return id; };
  const pub = (u) => u && { id: u.id, pseudo: u.pseudo, avatar: u.avatar, color: u.color, bio: u.bio, played: u.played, won: u.won, online: online.has(u.id) };

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const sess = session({ secret: process.env.SECRET || (() => { const f = path.join(__dirname, '.secret'); if (!fs.existsSync(f)) fs.writeFileSync(f, require('crypto').randomBytes(32).toString('hex')); return fs.readFileSync(f, 'utf8'); })(), resave: false, saveUninitialized: false,
    cookie: { maxAge: 30 * 864e5, sameSite: 'lax' } });
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(sess);
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/vendor/matter.js', (q, s) => s.sendFile(path.join(__dirname, 'node_modules/matter-js/build/matter.min.js')));

  const auth = (q, s, n) => (q.session.uid ? n() : s.status(401).json({ error: 'Non connecté' }));
  const online = new Map(); // uid -> nb sockets

  app.post('/api/signup', async (q, s) => {
    const pseudo = String(q.body.pseudo || '').trim(), pw = String(q.body.password || '');
    if (!/^[\w.\-À-ÿ]{3,20}$/.test(pseudo)) return s.status(400).json({ error: 'Pseudo : 3 à 20 caractères (lettres, chiffres, _ . -)' });
    if (pw.length < 4) return s.status(400).json({ error: 'Mot de passe : 4 caractères minimum' });
    if (get('SELECT id FROM users WHERE pseudo=?', [pseudo])) return s.status(409).json({ error: 'Ce pseudo est déjà pris' });
    const av = ['⚽', '🦁', '🐯', '🦊', '🐼', '🐸', '👽', '🤖', '🔥', '👑'][Math.floor(Math.random() * 10)];
    const id = run('INSERT INTO users(pseudo,hash,avatar,created) VALUES(?,?,?,?)', [pseudo, await bcrypt.hash(pw, 10), av, Date.now()]);
    q.session.uid = id; s.json(pub(get('SELECT * FROM users WHERE id=?', [id])));
  });
  app.post('/api/login', async (q, s) => {
    const u = get('SELECT * FROM users WHERE pseudo=?', [String(q.body.pseudo || '').trim()]);
    if (!u || !(await bcrypt.compare(String(q.body.password || ''), u.hash))) return s.status(401).json({ error: 'Pseudo ou mot de passe incorrect' });
    q.session.uid = u.id; s.json(pub(u));
  });
  app.post('/api/logout', (q, s) => q.session.destroy(() => s.json({ ok: 1 })));
  app.get('/api/me', auth, (q, s) => s.json(pub(get('SELECT * FROM users WHERE id=?', [q.session.uid]))));
  app.put('/api/me', auth, (q, s) => {
    const { avatar, color, bio } = q.body;
    if (avatar) run('UPDATE users SET avatar=? WHERE id=?', [String(avatar).slice(0, 8), q.session.uid]);
    if (color && /^#[0-9a-f]{6}$/i.test(color)) run('UPDATE users SET color=? WHERE id=?', [color, q.session.uid]);
    if (bio !== undefined) run('UPDATE users SET bio=? WHERE id=?', [String(bio).slice(0, 160), q.session.uid]);
    s.json(pub(get('SELECT * FROM users WHERE id=?', [q.session.uid])));
  });
  app.get('/api/users', auth, (q, s) => {
    const term = '%' + String(q.query.q || '').replace(/[%_]/g, '') + '%';
    s.json(all('SELECT * FROM users WHERE pseudo LIKE ? AND id!=? ORDER BY won DESC, pseudo LIMIT 30', [term, q.session.uid]).map(pub));
  });
  app.get('/api/users/:id', auth, (q, s) => { const u = get('SELECT * FROM users WHERE id=?', [+q.params.id]); u ? s.json(pub(u)) : s.status(404).json({ error: 'Introuvable' }); });
  app.get('/api/conversations', auth, (q, s) => {
    const me = q.session.uid;
    const rows = all(`SELECT CASE WHEN from_id=? THEN to_id ELSE from_id END other, MAX(id) lastId,
      SUM(CASE WHEN to_id=? AND read=0 THEN 1 ELSE 0 END) unread FROM messages WHERE from_id=? OR to_id=? GROUP BY other ORDER BY lastId DESC`, [me, me, me, me]);
    s.json(rows.map((r) => { const m = get('SELECT * FROM messages WHERE id=?', [r.lastId]); return { user: pub(get('SELECT * FROM users WHERE id=?', [r.other])), last: m, unread: r.unread }; }));
  });
  app.get('/api/messages/:id', auth, (q, s) => {
    const me = q.session.uid, o = +q.params.id;
    const msgs = all('SELECT * FROM messages WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) ORDER BY id DESC LIMIT 200', [me, o, o, me]).reverse();
    run('UPDATE messages SET read=1 WHERE from_id=? AND to_id=? AND read=0', [o, me]);
    s.json(msgs);
  });
  app.get('/api/unread', auth, (q, s) => s.json(get('SELECT COUNT(*) n FROM messages WHERE to_id=? AND read=0', [q.session.uid])));

  // ---------- Socket.IO ----------
  io.engine.use(sess);
  const rooms = new Map(); // code -> room
  const newCode = () => { let c; do c = Math.random().toString(36).slice(2, 7).toUpperCase(); while (rooms.has(c)); return c; };
  const user = (id) => pub(get('SELECT * FROM users WHERE id=?', [id]));

  function startRoom(room) {
    room.game = Sim.create({ time: room.time }); room.inputs = [null, null];
    if (room.players[1].country === room.players[0].country) room.players[1].country = Sim.COUNTRIES.find((c) => c.id !== room.players[0].country).id;
    io.to('r:' + room.code).emit('game:start', { code: room.code, players: room.players.map((p) => ({ user: user(p.uid), country: p.country })) });
    let tick = 0; const dt = 1 / 60;
    room.loop = setInterval(() => {
      const g = room.game;
      for (let i = 0; i < 2; i++) if (room.inputs[i]) { Sim.launch(g, i, room.inputs[i]); room.inputs[i] = null; }
      Sim.step(g, dt);
      const evs = g.events.slice();
      if (++tick % 2 === 0 || evs.length) io.to('r:' + room.code).emit('game:state', { ...Sim.snapshot(g), ev: evs });
      if (g.over) endRoom(room, g.winner);
    }, 1000 / 60);
  }
  function endRoom(room, winner, forfeit) {
    clearInterval(room.loop); room.loop = null;
    if (room.recorded) return; room.recorded = true;
    room.players.forEach((p, i) => { run('UPDATE users SET played=played+1, won=won+? WHERE id=?', [winner === i ? 1 : 0, p.uid]); });
    io.to('r:' + room.code).emit('game:end', { winner, score: room.game ? room.game.score : [0, 0], forfeit: !!forfeit });
    setTimeout(() => rooms.delete(room.code), 5000);
  }
  function leaveRoom(sock) {
    const code = sock.data.room; if (!code) return; sock.data.room = null; sock.leave('r:' + code);
    const room = rooms.get(code); if (!room) return;
    const idx = room.players.findIndex((p) => p.sid === sock.id);
    if (room.loop && idx >= 0) endRoom(room, 1 - idx, true);
    else if (!room.game) { room.players.splice(idx, 1); if (!room.players.length) rooms.delete(code); }
  }
  function joinRoom(sock, room, country) {
    leaveRoom(sock);
    room.players.push({ uid: sock.data.uid, sid: sock.id, country });
    sock.join('r:' + room.code); sock.data.room = room.code;
    if (room.players.length === 2) startRoom(room);
  }

  io.on('connection', (sock) => {
    const uid = sock.request.session && sock.request.session.uid;
    if (!uid) return sock.disconnect(true);
    sock.data.uid = uid; sock.join('u:' + uid);
    online.set(uid, (online.get(uid) || 0) + 1);

    sock.on('msg:send', ({ to, body }, cb) => {
      body = String(body || '').trim().slice(0, 1000); to = +to;
      if (!body || !get('SELECT id FROM users WHERE id=?', [to])) return cb && cb({ error: 'invalide' });
      const id = run('INSERT INTO messages(from_id,to_id,body,created) VALUES(?,?,?,?)', [uid, to, body, Date.now()]);
      const m = get('SELECT * FROM messages WHERE id=?', [id]);
      io.to('u:' + to).to('u:' + uid).emit('msg:new', { ...m, from: user(uid) });
      cb && cb(m);
    });
    sock.on('msg:read', ({ from }) => run('UPDATE messages SET read=1 WHERE from_id=? AND to_id=?', [+from, uid]));

    sock.on('room:create', ({ country, time }, cb) => {
      const room = { code: newCode(), players: [], time: [180, 300, 600].includes(+time) ? +time : 180 }; rooms.set(room.code, room);
      joinRoom(sock, room, country); cb && cb({ code: room.code });
    });
    sock.on('room:join', ({ code, country }, cb) => {
      const room = rooms.get(String(code || '').toUpperCase().trim());
      if (!room || room.players.length >= 2 || room.game) return cb && cb({ error: 'Salon introuvable ou complet' });
      if (room.players.some((p) => p.uid === uid)) return cb && cb({ error: 'Tu es déjà dans ce salon' });
      joinRoom(sock, room, country); cb && cb({ code: room.code });
    });
    sock.on('challenge:send', ({ to, country }, cb) => {
      to = +to; if (!online.has(to)) return cb && cb({ error: "Ce joueur n'est pas en ligne" });
      const room = { code: newCode(), players: [] }; rooms.set(room.code, room);
      joinRoom(sock, room, country);
      io.to('u:' + to).emit('challenge:in', { code: room.code, from: user(uid) });
      cb && cb({ code: room.code });
    });
    sock.on('challenge:decline', ({ code }) => {
      const room = rooms.get(code); if (room && !room.game) io.to('r:' + code).emit('challenge:declined', { by: user(uid) });
    });
    sock.on('input', (inp) => {
      const room = rooms.get(sock.data.room); if (!room || !room.loop) return;
      const i = room.players.findIndex((p) => p.sid === sock.id);
      if (i >= 0 && inp && isFinite(inp.dx) && isFinite(inp.dy)) room.inputs[i] = { dx: +inp.dx, dy: +inp.dy, power: +inp.power };
    });
    sock.on('room:leave', () => leaveRoom(sock));
    sock.on('disconnect', () => {
      leaveRoom(sock);
      const n = (online.get(uid) || 1) - 1; n ? online.set(uid, n) : online.delete(uid);
    });
  });

  server.listen(PORT, () => console.log('Serveur jeux sur http://localhost:' + PORT));
})();
