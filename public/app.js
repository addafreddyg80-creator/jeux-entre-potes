const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AVATARS = ['⚽', '🦁', '🐯', '🦊', '🐼', '🐸', '👽', '🤖', '🔥', '👑', '😎', '🥷', '🐐', '🦅', '🐉', '💎'];
const COLORS = ['#7c5cff', '#22d3a6', '#ff5c7a', '#ffb020', '#2fa8ff', '#e056fd', '#2ecc71', '#ff7f50'];
let me = null, socket = null;
let country = localStorage.getItem('country') || 'bj';
const C = (id) => FootSim.COUNTRIES.find((c) => c.id === id) || FootSim.COUNTRIES[0];

async function api(url, opt = {}) {
  const r = await fetch(url, { method: opt.method || 'GET', headers: { 'Content-Type': 'application/json' }, body: opt.body && JSON.stringify(opt.body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Erreur');
  return j;
}
function toast(html, ms = 3500) { const d = document.createElement('div'); d.innerHTML = html; $('#toast').append(d); if (ms) setTimeout(() => d.remove(), ms); return d; }
const av = (u, big) => `<div class="av ${big ? 'big' : ''} ${u.online ? 'on' : ''}" style="background:${esc(u.color)}33">${esc(u.avatar)}</div>`;
const time = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// ---------- auth ----------
function authPage(mode = 'login') {
  $('#tabs').classList.add('hidden');
  app.innerHTML = `<div style="text-align:center;margin:40px 0 24px"><div class="logo">ARÈNE</div><div class="mut">Joue, discute et défie tes potes 🎮</div></div>
  <div class="card col"><h2 style="margin:0">${mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
  <form id="f" class="col"><input name="pseudo" placeholder="Pseudo" autocomplete="username" required>
  <input name="password" type="password" placeholder="Mot de passe" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required>
  <div class="err" id="err"></div><button>${mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button></form>
  <a href="#" id="sw" class="mut" style="text-align:center">${mode === 'login' ? 'Pas de compte ? Inscris-toi' : 'Déjà un compte ? Connecte-toi'}</a></div>`;
  $('#sw').onclick = (e) => { e.preventDefault(); authPage(mode === 'login' ? 'signup' : 'login'); };
  $('#f').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target));
    try { me = await api('/api/' + mode, { method: 'POST', body: fd }); boot(); } catch (er) { $('#err').textContent = er.message; }
  };
}

// ---------- socket ----------
function connect() {
  socket = io();
  socket.on('msg:new', (m) => {
    const chatWith = location.hash.match(/^#\/chat\/(\d+)/);
    if (chatWith && (+chatWith[1] === m.from_id || +chatWith[1] === m.to_id)) { appendMsg(m); if (m.from_id !== me.id) socket.emit('msg:read', { from: m.from_id }); }
    else if (m.from_id !== me.id) { toast(`💬 <b>${esc(m.from.pseudo)}</b> : ${esc(m.body.slice(0, 60))}`); refreshUnread(); if (location.hash === '#/messages') route(); }
  });
  socket.on('challenge:in', ({ code, from }) => {
    const t = toast(`⚽ <b>${esc(from.pseudo)}</b> te défie au foot !<div class="row" style="margin-top:8px"><button class="alt grow" data-a="ok">Accepter</button><button class="ghost grow" data-a="no">Refuser</button></div>`, 20000);
    t.querySelector('[data-a=ok]').onclick = () => { t.remove(); joinRoom(code); };
    t.querySelector('[data-a=no]').onclick = () => { t.remove(); socket.emit('challenge:decline', { code }); };
  });
  socket.on('challenge:declined', ({ by }) => { toast(`😕 ${esc(by.pseudo)} a refusé le défi`); waiting && waiting.remove(); socket.emit('room:leave'); });
  socket.on('game:start', ({ players }) => {
    waiting && waiting.remove(); waiting = null;
    const mySide = players.findIndex((p) => p.user.id === me.id);
    Foot.start({ mode: 'online', socket, mySide, countries: players.map((p) => C(p.country)), names: players.map((p) => p.user.pseudo),
      onEnd: () => api('/api/me').then((u) => (me = u)), onQuit: () => route() });
  });
}
async function refreshUnread() { try { const { n } = await api('/api/unread'); $('#unread').textContent = n; $('#unread').classList.toggle('hidden', !n); } catch (e) {} }

// ---------- jeux ----------
let waiting = null;
function waitBox(code, label) {
  waiting && waiting.remove();
  waiting = toast(`<div class="mut">${label}</div><div class="code">${code}</div><div class="row"><button class="ghost grow" id="sh">Partager</button><button class="ghost grow" id="cx">Annuler</button></div>`, 0);
  waiting.querySelector('#cx').onclick = () => { socket.emit('room:leave'); waiting.remove(); waiting = null; };
  waiting.querySelector('#sh').onclick = () => { const txt = `Rejoins-moi au foot sur Arène ! Code : ${code} → ${location.origin}/#/foot`; navigator.share ? navigator.share({ text: txt }).catch(() => {}) : navigator.clipboard.writeText(txt).then(() => toast('Lien copié ✅')); };
}
function joinRoom(code) {
  socket.emit('room:join', { code, country }, (r) => { if (r.error) toast('❌ ' + esc(r.error)); else waitBox(r.code, 'Connexion au salon…'); });
}
function challenge(uid) {
  socket.emit('challenge:send', { to: uid, country }, (r) => { if (r.error) toast('❌ ' + esc(r.error)); else waitBox(r.code, 'Défi envoyé ! En attente de réponse…'); });
}
function pageJeux() {
  app.innerHTML = `<h1>Salut ${esc(me.pseudo)} ${esc(me.avatar)}</h1>
  <a class="game-tile" href="#/foot"><span class="tag">Solo</span><span class="tag">1 vs 1 en ligne</span><h3 style="margin-top:12px">Dummies Foot</h3><div>Foot ragdoll complètement chaotique</div><div class="em">⚽</div></a>
  <div class="game-tile soon"><span class="tag">Bientôt</span><h3 style="margin-top:12px">Prochain jeu…</h3><div>D’autres jeux arrivent (jusqu’à 4 joueurs)</div><div class="em">🎲</div></div>`;
}
function pageFoot() {
  const c = C(country);
  app.innerHTML = `<h1>⚽ Dummies Foot</h1>
  <div class="card"><h2 style="margin-top:0">Ton équipe : <span id="cn">${c.flag} ${c.name}</span></h2><div class="flags">${FootSim.COUNTRIES.map((k) => `<div data-c="${k.id}" class="${k.id === country ? 'sel' : ''}"><b>${k.flag}</b>${k.name}</div>`).join('')}</div></div>
  <div class="card col"><h2 style="margin:0">⏱️ Durée du match</h2><div class="row"><button class="ghost grow" data-dur="45">45 s</button><button class="ghost grow" data-dur="60">1 min</button><button class="ghost grow" data-dur="90">1 min 30</button><button class="ghost grow" data-dur="120">2 min</button></div></div>
  <div class="card col"><button id="cup">🏆 Coupe du monde</button></div>
  <div class="card col"><button id="solo">🤖 Jouer en solo contre l’ordi</button>
  <div class="row"><button class="ghost grow" data-l="0">Facile</button><button class="ghost grow" data-l="1">Normal</button><button class="ghost grow" data-l="2.5">Difficile</button></div></div>
  <div class="card col"><h2 style="margin:0">En ligne (1 vs 1)</h2><button class="alt" id="create">Créer un salon</button>
  <div class="row"><input id="code" placeholder="CODE" maxlength="5" style="text-transform:uppercase;letter-spacing:4px;text-align:center"><button id="join">Rejoindre</button></div>
  <div class="mut" style="font-size:14px">Ou défie un joueur depuis son profil 🔎</div></div>
  <div class="card mut" style="font-size:14px">🎯 <b>Comment jouer :</b> pose ton doigt sur ton palet et déplace-le : il <b>suit ton doigt</b>. Pour tirer, fonce dans la balle : plus tu vas vite, plus la frappe est forte.</div>`;
  let level = 1, dur = [45, 60, 90, 120].includes(+localStorage.getItem("dur")) ? +localStorage.getItem("dur") : 60;
  document.querySelectorAll('[data-dur]').forEach((b) => { b.classList.toggle('alt', +b.dataset.dur === dur); b.onclick = () => { dur = +b.dataset.dur; localStorage.setItem('dur', dur); document.querySelectorAll('[data-dur]').forEach((x) => x.classList.toggle('alt', x === b)); }; });
  document.querySelectorAll('.flags div').forEach((d) => (d.onclick = () => { country = d.dataset.c; localStorage.setItem('country', country); pageFoot(); }));
  document.querySelectorAll('[data-l]').forEach((b) => { b.classList.toggle('alt', +b.dataset.l === level); b.onclick = () => { level = +b.dataset.l; document.querySelectorAll('[data-l]').forEach((x) => x.classList.toggle('alt', x === b)); }; });
  $('#cup').onclick = () => Cup.open(app, { country, onCountry: (id) => { country = id; localStorage.setItem('country', id); }, onBack: () => pageFoot(),
    play: (m) => Foot.start({ mode: 'solo', mySide: 0, level: m.level, time: dur, countries: [m.me, m.opp], names: [me.pseudo, m.opp.name], onEnd: () => { const sc = Foot._st().game.score; m.onEnd(sc[0], sc[1]); }, onQuit: m.onQuit }) });
  $('#solo').onclick = () => {
    const cpu = FootSim.COUNTRIES.filter((k) => k.id !== country)[Math.floor(Math.random() * (FootSim.COUNTRIES.length - 1))];
    Foot.start({ mode: 'solo', mySide: 0, level, time: dur, countries: [C(country), cpu], names: [me.pseudo, 'CPU'], onQuit: () => route() });
  };
  $('#create').onclick = () => socket.emit('room:create', { country, time: dur }, (r) => waitBox(r.code, 'Salon créé ! Donne ce code à ton pote :'));
  $('#join').onclick = () => { const v = $('#code').value.trim(); if (v) joinRoom(v); };
}

// ---------- recherche & profils ----------
function pageRecherche() {
  app.innerHTML = `<h1>🔎 Joueurs</h1><input id="q" placeholder="Rechercher un pseudo…" autocomplete="off"><div class="list" id="res" style="margin-top:12px"></div>`;
  let t; const go = async () => {
    const list = await api('/api/users?q=' + encodeURIComponent($('#q').value));
    $('#res').innerHTML = list.length ? list.map((u) => `<a href="#/u/${u.id}">${av(u)}<div class="grow"><b>${esc(u.pseudo)}</b><div class="mut" style="font-size:13px">${esc(u.bio || '—')}</div></div><span class="mut">🏆 ${u.won}</span></a>`).join('') : '<div class="mut">Aucun joueur trouvé</div>';
  };
  $('#q').oninput = () => { clearTimeout(t); t = setTimeout(go, 250); }; go();
}
function profileCard(u, own) {
  const rate = u.played ? Math.round((u.won / u.played) * 100) : 0;
  return `<div class="card" style="text-align:center">${av(u, true).replace('class="av', 'style="margin:0 auto;background:' + esc(u.color) + '33" class="av')}
  <h1 style="margin:10px 0 2px">${esc(u.pseudo)}</h1><div class="mut">${u.online ? '🟢 En ligne' : '⚪ Hors ligne'}</div>
  <p>${esc(u.bio) || '<span class="mut">Pas encore de bio</span>'}</p>
  <div class="stats"><div><b>${u.played}</b>Matchs</div><div><b>${u.won}</b>Victoires</div><div><b>${rate}%</b>Ratio</div></div></div>`;
}
async function pageUser(id) {
  const u = await api('/api/users/' + id);
  app.innerHTML = `<a href="#/recherche" class="mut">← Retour</a>${profileCard(u)}
  <div class="row"><a class="btn grow" href="#/chat/${u.id}">💬 Message</a><button class="alt grow" id="ch">⚽ Défier</button></div>`;
  $('#ch').onclick = () => challenge(u.id);
}
function pageProfil() {
  app.innerHTML = `${profileCard({ ...me, online: true }, true)}
  <div class="card col"><h2 style="margin:0">Avatar</h2><div class="picker" id="pa">${AVATARS.map((a) => `<span class="${a === me.avatar ? 'sel' : ''}">${a}</span>`).join('')}</div>
  <h2 style="margin:6px 0 0">Couleur</h2><div class="picker" id="pc">${COLORS.map((c) => `<span data-c="${c}" class="${c === me.color ? 'sel' : ''}" style="background:${c}"></span>`).join('')}</div>
  <h2 style="margin:6px 0 0">Bio</h2><textarea id="bio" maxlength="160" rows="2" placeholder="Parle un peu de toi…">${esc(me.bio)}</textarea>
  <button id="save">Enregistrer</button></div><button class="ghost" id="out" style="width:100%">Se déconnecter</button>`;
  let a = me.avatar, c = me.color;
  document.querySelectorAll('#pa span').forEach((s) => (s.onclick = () => { a = s.textContent; document.querySelectorAll('#pa span').forEach((x) => x.classList.toggle('sel', x === s)); }));
  document.querySelectorAll('#pc span').forEach((s) => (s.onclick = () => { c = s.dataset.c; document.querySelectorAll('#pc span').forEach((x) => x.classList.toggle('sel', x === s)); }));
  $('#save').onclick = async () => { me = await api('/api/me', { method: 'PUT', body: { avatar: a, color: c, bio: $('#bio').value } }); toast('Profil enregistré ✅'); pageProfil(); };
  $('#out').onclick = async () => { await api('/api/logout', { method: 'POST' }); socket && socket.disconnect(); me = null; location.hash = ''; authPage(); };
}

// ---------- messages ----------
async function pageMessages() {
  const convs = await api('/api/conversations');
  app.innerHTML = `<h1>💬 Messages</h1><div class="list">${convs.length ? convs.map((c) => `<a href="#/chat/${c.user.id}">${av(c.user)}<div class="grow" style="min-width:0"><b>${esc(c.user.pseudo)}</b><div class="mut" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.last.from_id === me.id ? 'Toi : ' : ''}${esc(c.last.body)}</div></div><div style="text-align:right"><div class="mut" style="font-size:11px">${time(c.last.created)}</div>${c.unread ? `<span class="badge">${c.unread}</span>` : ''}</div></a>`).join('') : '<div class="card mut">Pas encore de conversation. Trouve un joueur dans 🔎 Joueurs et envoie-lui un message !</div>'}</div>`;
  refreshUnread();
}
function appendMsg(m) {
  const box = $('#msgs'); if (!box) return;
  if (box.querySelector(`[data-id="${m.id}"]`)) return;
  box.insertAdjacentHTML('beforeend', `<div class="m ${m.from_id === me.id ? 'me' : ''}" data-id="${m.id}">${esc(m.body)}<small>${time(m.created)}</small></div>`);
  box.scrollTop = box.scrollHeight;
}
async function pageChat(id) {
  const [u, msgs] = await Promise.all([api('/api/users/' + id), api('/api/messages/' + id)]);
  app.innerHTML = `<div class="chat"><header><a href="#/messages" style="color:#fff;text-decoration:none;font-size:22px">←</a><a href="#/u/${u.id}" class="row grow" style="color:inherit;text-decoration:none">${av(u)}<b>${esc(u.pseudo)}</b></a><button class="alt" id="ch" style="padding:9px 12px">⚽ Défier</button></header>
  <div class="msgs" id="msgs"></div><form id="mf"><input id="mi" placeholder="Ton message…" autocomplete="off"><button>➤</button></form></div>`;
  msgs.forEach(appendMsg); refreshUnread();
  $('#ch').onclick = () => challenge(u.id);
  $('#mf').onsubmit = (e) => { e.preventDefault(); const body = $('#mi').value.trim(); if (!body) return; $('#mi').value = ''; socket.emit('msg:send', { to: u.id, body }, (m) => m && m.id && appendMsg(m)); };
}

// ---------- routeur ----------
async function route() {
  if (!me) return authPage();
  if (Foot.active) return;
  const h = location.hash || '#/jeux';
  const tab = h.startsWith('#/chat') ? 'messages' : h.startsWith('#/u/') ? 'recherche' : h.startsWith('#/foot') ? 'jeux' : h.slice(2);
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.t === tab));
  $('#tabs').classList.remove('hidden');
  try {
    let m;
    if ((m = h.match(/^#\/u\/(\d+)/))) await pageUser(m[1]);
    else if ((m = h.match(/^#\/chat\/(\d+)/))) await pageChat(m[1]);
    else ({ '#/recherche': pageRecherche, '#/messages': pageMessages, '#/profil': pageProfil, '#/foot': pageFoot }[h] || pageJeux)();
  } catch (e) { app.innerHTML = `<div class="card err">${esc(e.message)}</div>`; }
}
addEventListener('hashchange', route);
function boot() { if (!socket || socket.disconnected) connect(); refreshUnread(); route(); }
api('/api/me').then((u) => { me = u; boot(); }).catch(() => authPage());
