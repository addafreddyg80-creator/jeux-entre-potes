// Rendu + contrôles du foot (disques, terrain vertical / portrait)
window.Foot = (function () {
  const S = FootSim, { W, H, GOAL_W, GOAL_D, PR, BR } = S;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const el = (id) => document.getElementById(id);
  let st = null; // état courant de la session de jeu

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  }
  addEventListener('resize', resize);
  const M = GOAL_D + 12; // marge pour voir les buts
  function view() {
    const d = cv.width / innerWidth, top = 58 * d; // place pour le HUD
    const sc = Math.min(cv.width / (W + 16), (cv.height - top - 8 * d) / (H + 2 * M));
    return { sc, ox: (cv.width - W * sc) / 2, oy: top + (cv.height - top - H * sc) / 2 };
  }
  const flip = () => st && st.mySide === 1; // chaque joueur se voit en bas
  const toWorld = (cx, cy) => {
    const v = view(), d = cv.width / innerWidth; let x = (cx * d - v.ox) / v.sc, y = (cy * d - v.oy) / v.sc;
    if (flip()) { x = W - x; y = H - y; } return { x, y };
  };
  const COL = ['#2f80ff', '#ff5a36']; // bleu (bas) / rouge-orange (haut)

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function drawPitch() {
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#2f9e44' : '#37b24d'; ctx.fillRect(0, i * H / 12, W, H / 12 + 1); }
    ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 70, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 5, 0, 7); ctx.fill();
    for (const top of [true, false]) {
      const bw = 300, bh = 120, y = top ? 0 : H - bh;
      ctx.strokeRect((W - bw) / 2, y, bw, bh);
      ctx.beginPath(); ctx.arc(W / 2, top ? bh : H - bh, 50, top ? 0 : Math.PI, top ? Math.PI : 2 * Math.PI); ctx.stroke();
    }
  }
  function drawGoal(top) {
    const x0 = (W - GOAL_W) / 2, y0 = top ? -GOAL_D : H;
    ctx.fillStyle = '#0006'; ctx.fillRect(x0, y0, GOAL_W, GOAL_D);
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1;
    for (let x = x0; x <= x0 + GOAL_W; x += 10) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + GOAL_D); ctx.stroke(); }
    for (let y = y0; y <= y0 + GOAL_D; y += 10) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + GOAL_W, y); ctx.stroke(); }
    ctx.strokeStyle = top ? COL[1] : COL[0]; ctx.lineWidth = 7; ctx.lineCap = 'round';
    const yl = top ? 0 : H, yb = top ? -GOAL_D : H + GOAL_D;
    ctx.beginPath(); ctx.moveTo(x0, yl); ctx.lineTo(x0, yb); ctx.lineTo(x0 + GOAL_W, yb); ctx.lineTo(x0 + GOAL_W, yl); ctx.stroke();
  }
  function drawPlayer(x, y, k, c, me) {
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.arc(x + 4, y + 6, PR, 0, 7); ctx.fill();
    ctx.fillStyle = COL[k]; ctx.beginPath(); ctx.arc(x, y, PR, 0, 7); ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = c.c1; ctx.beginPath(); ctx.arc(x, y, PR - 4, 0, 7); ctx.stroke(); // anneau couleur d'équipe
    ctx.lineWidth = 2; ctx.strokeStyle = '#000a'; ctx.beginPath(); ctx.arc(x, y, PR, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffffff40'; ctx.beginPath(); ctx.arc(x - 11, y - 11, 11, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, y); if (flip()) ctx.rotate(Math.PI);
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.flag, 0, 1);
    if (me) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(-10, -PR - 18); ctx.lineTo(10, -PR - 18); ctx.lineTo(0, -PR - 6); ctx.fill(); }
    ctx.restore();
  }
  function drawBall(x, y, a) {
    ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.arc(x + 3, y + 5, BR, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, BR, 0, 7); ctx.fill();
    ctx.fillStyle = '#222';
    for (let k = 0; k < 5; k++) { const an = k * 1.2566; ctx.beginPath(); ctx.arc(Math.cos(an) * 11, Math.sin(an) * 11, 4, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#0008'; ctx.beginPath(); ctx.arc(0, 0, BR, 0, 7); ctx.stroke();
    ctx.restore();
  }

  function render(snap, t) {
    const v = view();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#06120c'; ctx.fillRect(0, 0, cv.width, cv.height);
    const shake = st.shake > 0 ? (Math.random() - 0.5) * st.shake : 0;
    ctx.setTransform(v.sc, 0, 0, v.sc, v.ox + shake * v.sc, v.oy);
    if (flip()) { ctx.translate(W, H); ctx.rotate(Math.PI); }
    drawGoal(true); drawGoal(false); drawPitch(t);
    const s = snap.s;
    for (let k = 0; k < 2; k++) drawPlayer(s[3 + k * 3], s[4 + k * 3], k, st.countries[k], k === st.mySide);
    drawBall(s[0], s[1], s[2]);
    const off = 3 + st.mySide * 3, tx = s[off], ty = s[off + 1];
    if (st.drag && st.drag.cur) { // jauge de puissance discrète (pas de ligne de visée)
      const a = aimFromDrag();
      ctx.fillStyle = '#0008'; rr(tx - 30, ty + PR + 10, 60, 8, 4); ctx.fill();
      ctx.fillStyle = a.power > 0.75 ? '#ff6b6b' : '#ffe066'; rr(tx - 30, ty + PR + 10, 60 * a.power, 8, 4); ctx.fill();
    }
    if (snap.cd && snap.cd[st.mySide] > 0) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tx, ty, PR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - snap.cd[st.mySide] / S.COOLDOWN)); ctx.stroke();
    }
    if (st.shake > 0) st.shake *= 0.9;
  }

  function aimFromDrag() {
    const d = st.drag; const dx = d.cur.x - d.start.x, dy = d.cur.y - d.start.y; // le rond part dans le sens du glissé
    const len = Math.hypot(dx, dy);
    return { dx: dx / (len || 1), dy: dy / (len || 1), power: Math.min(1, len / 110) };
  }
  cv.addEventListener('pointerdown', (e) => { if (!st) return; cv.setPointerCapture(e.pointerId); const p = toWorld(e.clientX, e.clientY); st.drag = { start: p, cur: p }; });
  cv.addEventListener('pointermove', (e) => { if (st && st.drag) st.drag.cur = toWorld(e.clientX, e.clientY); });
  const up = () => {
    if (!st || !st.drag) return; const a = aimFromDrag(); st.drag = null;
    if (a.power < 0.08) return;
    if (st.mode === 'solo') S.launch(st.game, st.mySide, a); else st.socket.emit('input', a);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => st && (st.drag = null));

  function hud(snap) {
    el('score').textContent = snap.sc[0] + ' - ' + snap.sc[1];
    el('timer').textContent = String(Math.floor(snap.t / 60)).padStart(2, '0') + ':' + String(snap.t % 60).padStart(2, '0');
  }
  function banner(html, ms = 1700) {
    const b = el('banner'); b.innerHTML = html; b.classList.remove('hidden', 'anim'); void b.offsetWidth; b.classList.add('anim');
    clearTimeout(st.bt); if (ms) st.bt = setTimeout(() => b.classList.add('hidden'), ms);
  }
  function sound(f, d = 0.15, type = 'square', vol = 0.05) {
    try { const ac = st.ac || (st.ac = new (window.AudioContext || window.webkitAudioContext)()); const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(ac.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.stop(ac.currentTime + d); } catch (e) {}
  }
  function handleEvents(evs) {
    for (const e of evs || []) {
      if (e.t === 'goal') { const c = st.countries[e.side]; banner(`BUT ! <small>${c.flag} ${st.names[e.side]}</small>`); st.shake = 18; sound(523, 0.2); setTimeout(() => sound(784, 0.4), 150); navigator.vibrate && navigator.vibrate(200); }
      if (e.t === 'launch' && e.side === st.mySide) sound(200, 0.08, 'triangle', 0.08);
      if (e.t === 'start') sound(880, 0.25, 'sine', 0.06);
      if (e.t === 'end') endMatch(e.winner);
    }
  }
  function endMatch(winner, forfeit) {
    if (st.ended) return; st.ended = true;
    const txt = winner === -1 ? 'MATCH NUL' : winner === st.mySide ? 'VICTOIRE ! 🏆' : 'DÉFAITE 😵';
    banner(`${txt}<small>${forfeit ? 'Abandon de l’adversaire — ' : ''}Touchez ✕ pour quitter</small>`, 0);
    sound(winner === st.mySide ? 660 : 220, 0.6, 'sawtooth', 0.04);
    st.onEnd && st.onEnd(winner);
  }

  function loop(t) {
    if (!st) return;
    let snap;
    if (st.mode === 'solo') {
      const now = performance.now(); let acc = Math.min(0.1, (now - (st.last || now)) / 1000) + (st.acc || 0); st.last = now;
      while (acc >= 1 / 60) { S.botThink(st.game, 1 - st.mySide, 1 / 60, st.level); S.step(st.game, 1 / 60); handleEvents(st.game.events); acc -= 1 / 60; }
      st.acc = acc; snap = S.snapshot(st.game);
    } else {
      snap = interp();
    }
    if (snap) { hud(snap); render(snap, t); }
    st.raf = requestAnimationFrame(loop);
  }
  // interpolation réseau (~80 ms de retard)
  function interp() {
    const buf = st.buf; if (!buf.length) return null;
    const rt = performance.now() - 80;
    while (buf.length > 2 && buf[1].at <= rt) buf.shift();
    const a = buf[0], b = buf[1];
    if (!b || rt <= a.at) return a;
    const k = Math.min(1, (rt - a.at) / (b.at - a.at));
    const s = a.s.map((v, i) => { const w = b.s[i]; if (i % 3 === 2) { let d = w - v; return v + d * k; } return Math.abs(w - v) > 120 ? w : v + (w - v) * k; });
    return { ...b, s };
  }

  function start(o) {
    resize();
    st = { ...o, drag: null, shake: 0, buf: [], ended: false };
    el('game').classList.remove('hidden'); el('banner').classList.add('hidden');
    el('hl').innerHTML = `${o.countries[0].flag} ${esc(o.names[0])}`; el('hr').innerHTML = `${esc(o.names[1])} ${o.countries[1].flag}`;
    if (o.mode === 'solo') { st.game = S.create({ time: o.time }); banner('C’EST PARTI !<small>Glisse dans la direction où tu veux aller</small>', 2000); }
    else {
      banner('C’EST PARTI !<small>Glisse dans la direction où tu veux aller</small>', 2000);
      st.onState = (m) => { m.at = performance.now(); st.buf.push(m); handleEvents(m.ev); };
      st.onEndMsg = (m) => endMatch(m.winner, m.forfeit);
      o.socket.on('game:state', st.onState); o.socket.on('game:end', st.onEndMsg);
    }
    try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
    st.raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!st) return; cancelAnimationFrame(st.raf);
    if (st.socket) { st.socket.off('game:state', st.onState); st.socket.off('game:end', st.onEndMsg); st.socket.emit('room:leave'); }
    st = null; el('game').classList.add('hidden');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  el('quit').onclick = () => { const cb = st && st.onQuit; stop(); cb && cb(); };
  return { start, stop, get active() { return !!st; }, _st: () => st };
})();
