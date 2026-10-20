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
  function drawPlayer(x, y, k, c, me) { // disque plat aux couleurs du drapeau
    ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.arc(x + 2, y + 3, PR + 1, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, y); if (flip()) ctx.rotate(Math.PI);
    const R = PR - 6, f = c.f || [c.c1, c.c2];
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.clip();
    if (c.d === 'c') { ctx.fillStyle = f[0]; ctx.fillRect(-R, -R, 2 * R, 2 * R); ctx.fillStyle = f[1]; ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, 7); ctx.fill(); ctx.fillStyle = f[2]; ctx.beginPath(); ctx.arc(0, 0, R * 0.4, 0, 7); ctx.fill(); }
    else if (c.d === 'bj') { ctx.fillStyle = f[1]; ctx.fillRect(-R, -R, 2 * R, R); ctx.fillStyle = f[2]; ctx.fillRect(-R, 0, 2 * R, R); ctx.fillStyle = f[0]; ctx.fillRect(-R, -R, R * 0.8, 2 * R); }
    else if (c.d === '+') { ctx.fillStyle = f[0]; ctx.fillRect(-R, -R, 2 * R, 2 * R); ctx.fillStyle = f[1]; ctx.fillRect(-R, -5, 2 * R, 10); ctx.fillRect(-8, -R, 10, 2 * R); }
    else { const n = f.length, w = 2 * R / n; f.forEach((col, i) => { ctx.fillStyle = col; if (c.d === 'h') ctx.fillRect(-R, -R + i * w, 2 * R, w + 0.5); else ctx.fillRect(-R + i * w, -R, w + 0.5, 2 * R); }); }
    ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = COL[k]; ctx.beginPath(); ctx.arc(0, 0, PR - 3.5, 0, 7); ctx.stroke(); // bord = couleur du camp
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#000a'; ctx.beginPath(); ctx.arc(0, 0, PR, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
    // nom de la star au-dessus du disque
    const nm = c.star || c.name; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(nm).width + 12; ctx.fillStyle = '#000a'; rr(-tw / 2, -PR - 22, tw, 18, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(nm, 0, -PR - 13);
    if (me) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(-8, -PR - 36); ctx.lineTo(8, -PR - 36); ctx.lineTo(0, -PR - 26); ctx.fill(); }
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
    if (st.shake > 0) st.shake *= 0.9;
  }

  // le disque suit le doigt (pas de tir par glissé : on frappe la balle en la percutant)
  function setTarget(p) {
    st.target = p;
    if (st.mode === 'solo') S.move(st.game, st.mySide, p);
    else { const n = performance.now(); if (!p || n - (st.sent || 0) > 15) { st.sent = n; st.socket.emit('input', p ? { x: Math.round(p.x), y: Math.round(p.y) } : null); } }
  }
  cv.addEventListener('pointerdown', (e) => { if (!st) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); st.pid = e.pointerId; setTarget(toWorld(e.clientX, e.clientY)); });
  cv.addEventListener('pointermove', (e) => { if (st && st.target && e.pointerId === st.pid) setTarget(toWorld(e.clientX, e.clientY)); });
  const up = (e) => { if (st && e.pointerId === st.pid) { st.pid = null; setTarget(null); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

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
    st = { ...o, target: null, shake: 0, buf: [], ended: false };
    el('game').classList.remove('hidden'); el('banner').classList.add('hidden');
    el('hl').innerHTML = `${o.countries[0].flag} ${esc(o.names[0])}`; el('hr').innerHTML = `${esc(o.names[1])} ${o.countries[1].flag}`;
    if (o.mode === 'solo') { st.game = S.create({ time: o.time }); }
    else {
      st.onState = (m) => { m.at = performance.now(); st.buf.push(m); handleEvents(m.ev); };
      st.onEndMsg = (m) => endMatch(m.winner, m.forfeit);
      o.socket.on('game:state', st.onState); o.socket.on('game:end', st.onEndMsg);
    }
    loop(performance.now()); // premier rendu immédiat, sans attendre
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
