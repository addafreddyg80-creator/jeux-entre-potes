// Rendu + contrôles du foot ragdoll
window.Foot = (function () {
  const S = FootSim, { W, H, GROUND, GOAL_TOP, GOAL_D } = S;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const el = (id) => document.getElementById(id);
  let st = null; // état courant de la session de jeu
  const PART = [[22, 44], [15], [8, 30], [8, 30], [10, 38], [10, 38]];

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  }
  addEventListener('resize', resize);
  function view() {
    const sc = Math.min(cv.width / W, cv.height / (H + 10));
    return { sc, ox: (cv.width - W * sc) / 2, oy: (cv.height - H * sc) / 2 };
  }
  const toWorld = (cx, cy) => { const v = view(), d = cv.width / innerWidth; return { x: (cx * d - v.ox) / v.sc, y: (cy * d - v.oy) / v.sc }; };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function drawPitch(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e1b3d'); g.addColorStop(0.55, '#1c2c5c'); g.addColorStop(1, '#22376b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
    // tribunes
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `hsla(${(i * 47) % 360},70%,60%,.35)`; const x = (i * 97) % W, y = 120 + ((i * 53) % 90); ctx.beginPath(); ctx.arc(x, y + Math.sin(t / 300 + i) * 2, 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#0a1430'; ctx.fillRect(0, 230, W, 12);
    // projecteurs
    ctx.fillStyle = '#fff8'; [120, 880].forEach((x) => { ctx.beginPath(); ctx.arc(x, 40, 10, 0, 7); ctx.fill(); });
    // pelouse
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#2f9e44' : '#37b24d'; ctx.fillRect(i * W / 10, GROUND - 8, W / 10, H - GROUND + 8); }
    ctx.fillStyle = '#2b8a3e'; ctx.fillRect(0, GROUND - 10, W, 4);
    ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2, GROUND - 6); ctx.lineTo(W / 2, H); ctx.stroke();
  }
  function drawGoal(left) {
    const x0 = left ? 0 : W - GOAL_D;
    ctx.save();
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1;
    for (let x = x0; x <= x0 + GOAL_D; x += 9) { ctx.beginPath(); ctx.moveTo(x, GOAL_TOP); ctx.lineTo(x, GROUND); ctx.stroke(); }
    for (let y = GOAL_TOP; y <= GROUND; y += 9) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + GOAL_D, y); ctx.stroke(); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const px = left ? GOAL_D : W - GOAL_D;
    ctx.beginPath(); ctx.moveTo(px, GROUND); ctx.lineTo(px, GOAL_TOP); ctx.lineTo(left ? 0 : W, GOAL_TOP + (left ? -4 : -4)); ctx.stroke();
    ctx.restore();
  }
  function drawDummy(arr, off, c, me) {
    const order = [2, 4, 5, 0, 3, 1];
    for (const i of order) {
      const x = arr[off + i * 3], y = arr[off + i * 3 + 1], a = arr[off + i * 3 + 2];
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      if (i === 1) {
        ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#0006'; ctx.stroke();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-5, -3, 2.2, 0, 7); ctx.arc(5, -3, 2.2, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 4, 5, 0.2, Math.PI - 0.2); ctx.stroke();
      } else {
        const [w, h] = PART[i];
        ctx.fillStyle = i === 0 ? c.c1 : i >= 4 ? c.c2 : '#f1c27d';
        rr(-w / 2, -h / 2, w, h, w / 2); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0007'; ctx.stroke();
        if (i === 0) { ctx.fillStyle = c.c2; ctx.fillRect(-w / 2 + 3, -4, w - 6, 5); }
        if (i >= 4) { ctx.fillStyle = '#111'; rr(-w / 2 - 1, h / 2 - 7, w + 4, 8, 3); ctx.fill(); }
      }
      ctx.restore();
    }
    // drapeau + indicateur au-dessus de la tête
    const hx = arr[off + 3], hy = arr[off + 4];
    ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText(c.flag, hx, hy - 24);
    if (me) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(hx - 7, hy - 50); ctx.lineTo(hx + 7, hy - 50); ctx.lineTo(hx, hy - 41); ctx.fill(); }
  }
  function drawBall(x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill();
    ctx.fillStyle = '#222';
    for (let k = 0; k < 5; k++) { const an = k * 1.2566; ctx.beginPath(); ctx.arc(Math.cos(an) * 11, Math.sin(an) * 11, 4, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#0008'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(x, GROUND - 6, 14 * Math.max(0.3, 1 - (GROUND - y) / 400), 4, 0, 0, 7); ctx.fill();
  }

  function render(snap, t) {
    const v = view();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#06120c'; ctx.fillRect(0, 0, cv.width, cv.height);
    let shake = st.shake > 0 ? (Math.random() - 0.5) * st.shake : 0;
    ctx.setTransform(v.sc, 0, 0, v.sc, v.ox + shake * v.sc, v.oy);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    drawPitch(t); drawGoal(true); drawGoal(false);
    const s = snap.s;
    for (let k = 0; k < 2; k++) drawDummy(s, 3 + k * 18, st.countries[k], k === st.mySide);
    drawBall(s[0], s[1], s[2]);
    // visée
    if (st.drag && st.drag.cur) {
      const off = 3 + st.mySide * 18, tx = s[off], ty = s[off + 1];
      const a = aimFromDrag();
      const ready = (snap.cd ? snap.cd[st.mySide] : 0) <= 0;
      ctx.strokeStyle = ready ? '#ffe066' : '#ffffff55'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      // trajectoire approximative
      ctx.beginPath(); let px = tx, py = ty, vx = a.dx * 21 * a.power, vy = a.dy * 21 * a.power;
      ctx.moveTo(px, py);
      for (let i = 0; i < 24; i++) { px += vx * 1.2; py += vy * 1.2; vy += 1.1 * 0.32; ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#0008'; rr(tx - 30, ty + 30, 60, 8, 4); ctx.fill();
      ctx.fillStyle = a.power > 0.75 ? '#ff6b6b' : '#ffe066'; rr(tx - 30, ty + 30, 60 * a.power, 8, 4); ctx.fill();
    }
    // jauge recharge
    if (snap.cd && snap.cd[st.mySide] > 0) {
      const off = 3 + st.mySide * 18; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s[off], s[off + 1] + 0, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - snap.cd[st.mySide] / S.COOLDOWN)); ctx.stroke();
    }
    ctx.restore();
    if (st.shake > 0) st.shake *= 0.9;
  }

  function aimFromDrag() {
    const d = st.drag; const dx = d.start.x - d.cur.x, dy = d.start.y - d.cur.y; // on tire en arrière (lance-pierre)
    const len = Math.hypot(dx, dy);
    return { dx: dx / (len || 1), dy: dy / (len || 1), power: Math.min(1, len / 120) };
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
    el('timer').textContent = snap.t;
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
    if (o.mode === 'solo') { st.game = S.create(); banner('C’EST PARTI !<small>Glisse en arrière et relâche pour te propulser</small>', 2000); }
    else {
      banner('C’EST PARTI !<small>Glisse en arrière et relâche pour te propulser</small>', 2000);
      st.onState = (m) => { m.at = performance.now(); st.buf.push(m); handleEvents(m.ev); };
      st.onEndMsg = (m) => endMatch(m.winner, m.forfeit);
      o.socket.on('game:state', st.onState); o.socket.on('game:end', st.onEndMsg);
    }
    try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
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
  return { start, stop, get active() { return !!st; } };
})();
