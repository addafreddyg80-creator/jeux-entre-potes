// Simulation partagée (navigateur solo + serveur en ligne)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('matter-js'));
  else root.FootSim = factory(root.Matter);
})(typeof self !== 'undefined' ? self : this, function (Matter) {
  const { Engine, Bodies, Body, Composite } = Matter;
  const W = 500, H = 860, GOAL_W = 128, GOAL_D = 40, PR = 38, BR = 17;
  const MATCH_TIME = 60, COOLDOWN = 0, MAX_SPEED = 26;

  // f: couleurs du drapeau, d: 'v' bandes verticales, 'h' horizontales, 'c' concentrique, '+' croix
  const COUNTRIES = [
    { id: 'fr', name: 'France', flag: '🇫🇷', c1: '#1f4fd1', c2: '#ffffff', star: 'Mbappé', d: 'v', f: ['#0055a4', '#ffffff', '#ef4135'] },
    { id: 'bj', name: 'Bénin', flag: '🇧🇯', c1: '#0a8f3c', c2: '#fcd116', star: 'Steve Mounié', d: 'bj', f: ['#008751', '#fcd116', '#e8112d'] },
    { id: 'ci', name: "Côte d'Ivoire", flag: '🇨🇮', c1: '#f77f00', c2: '#ffffff', star: 'Sébastien Haller', d: 'v', f: ['#f77f00', '#ffffff', '#009e60'] },
    { id: 'sn', name: 'Sénégal', flag: '🇸🇳', c1: '#00853f', c2: '#fdef42', star: 'Sadio Mané', d: 'v', f: ['#00853f', '#fdef42', '#e31b23'] },
    { id: 'cm', name: 'Cameroun', flag: '🇨🇲', c1: '#007a5e', c2: '#ce1126', star: 'André Onana', d: 'v', f: ['#007a5e', '#ce1126', '#fcd116'] },
    { id: 'ma', name: 'Maroc', flag: '🇲🇦', c1: '#c1272d', c2: '#006233', star: 'Achraf Hakimi', d: 'c', f: ['#c1272d', '#c1272d', '#006233'] },
    { id: 'ng', name: 'Nigeria', flag: '🇳🇬', c1: '#008751', c2: '#ffffff', star: 'Victor Osimhen', d: 'v', f: ['#008751', '#ffffff', '#008751'] },
    { id: 'gh', name: 'Ghana', flag: '🇬🇭', c1: '#ffffff', c2: '#ce1126', star: 'Mohammed Kudus', d: 'h', f: ['#ce1126', '#fcd116', '#006b3f'] },
    { id: 'eg', name: 'Égypte', flag: '🇪🇬', c1: '#ce1126', c2: '#ffffff', star: 'Mohamed Salah', d: 'h', f: ['#ce1126', '#ffffff', '#000000'] },
    { id: 'dz', name: 'Algérie', flag: '🇩🇿', c1: '#006233', c2: '#ffffff', star: 'Riyad Mahrez', d: 'v', f: ['#006233', '#ffffff'] },
    { id: 'ml', name: 'Mali', flag: '🇲🇱', c1: '#14b53a', c2: '#fcd116', star: 'Yves Bissouma', d: 'v', f: ['#14b53a', '#fcd116', '#ce1126'] },
    { id: 'tn', name: 'Tunisie', flag: '🇹🇳', c1: '#e70013', c2: '#ffffff', star: 'Ellyes Skhiri', d: 'c', f: ['#e70013', '#ffffff', '#e70013'] },
    { id: 'br', name: 'Brésil', flag: '🇧🇷', c1: '#ffdf00', c2: '#009c3b', star: 'Vinícius Jr', d: 'c', f: ['#009c3b', '#ffdf00', '#002776'] },
    { id: 'ar', name: 'Argentine', flag: '🇦🇷', c1: '#74acdf', c2: '#ffffff', star: 'Messi', d: 'h', f: ['#74acdf', '#ffffff', '#74acdf'] },
    { id: 'es', name: 'Espagne', flag: '🇪🇸', c1: '#c60b1e', c2: '#ffc400', star: 'Lamine Yamal', d: 'h', f: ['#c60b1e', '#ffc400', '#ffc400', '#c60b1e'] },
    { id: 'de', name: 'Allemagne', flag: '🇩🇪', c1: '#ffffff', c2: '#000000', star: 'Jamal Musiala', d: 'h', f: ['#000000', '#dd0000', '#ffce00'] },
    { id: 'pt', name: 'Portugal', flag: '🇵🇹', c1: '#c8102e', c2: '#046a38', star: 'Cristiano Ronaldo', d: 'v', f: ['#046a38', '#da291c', '#da291c'] },
    { id: 'gb', name: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', c1: '#ffffff', c2: '#cf081f', star: 'Harry Kane', d: '+', f: ['#ffffff', '#cf081f'] },
    { id: 'be', name: 'Belgique', flag: '🇧🇪', c1: '#000000', c2: '#fdda24', star: 'Kevin De Bruyne', d: 'v', f: ['#000000', '#fdda24', '#ef3340'] },
    { id: 'nl', name: 'Pays-Bas', flag: '🇳🇱', c1: '#f36c21', c2: '#ffffff', star: 'Virgil van Dijk', d: 'h', f: ['#ae1c28', '#ffffff', '#21468b'] },
    { id: 'it', name: 'Italie', flag: '🇮🇹', c1: '#0066cc', c2: '#ffffff', star: 'Gianluigi Donnarumma', d: 'v', f: ['#009246', '#ffffff', '#ce2b37'] },
    { id: 'hr', name: 'Croatie', flag: '🇭🇷', c1: '#ff0000', c2: '#ffffff', star: 'Luka Modrić', d: 'h', f: ['#ff0000', '#ffffff', '#171796'] },
    { id: 'no', name: 'Norvège', flag: '🇳🇴', c1: '#ba0c2f', c2: '#ffffff', star: 'Erling Haaland', d: '+', f: ['#ba0c2f', '#00205b'] },
    { id: 'us', name: 'États-Unis', flag: '🇺🇸', c1: '#002868', c2: '#bf0a30', star: 'Christian Pulisic', d: 'h', f: ['#bf0a30', '#ffffff', '#bf0a30', '#ffffff', '#bf0a30'] },
    { id: 'jp', name: 'Japon', flag: '🇯🇵', c1: '#000080', c2: '#ffffff', star: 'Kaoru Mitoma', d: 'c', f: ['#ffffff', '#ffffff', '#bc002d'] },
    { id: 'mx', name: 'Mexique', flag: '🇲🇽', c1: '#006847', c2: '#ce1126', star: 'Raúl Jiménez', d: 'v', f: ['#006847', '#ffffff', '#ce1126'] },
  ];

  // Joueurs = disques pleins (vue de dessus, sans gravité)
  function makeDummy(x, y, side) {
    const body = Bodies.circle(x, y, PR, { restitution: 0.3, friction: 0.02, frictionAir: 0.02, density: 0.02, inertia: Infinity });
    return { body, torso: body, parts: [body], side, cooldown: 0, home: { x, y } };
  }

  function create(opts = {}) {
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engine.positionIterations = 8; engine.velocityIterations = 6;
    const st = { isStatic: true, friction: 0, restitution: 0.8 };
    const gx0 = (W - GOAL_W) / 2, gx1 = (W + GOAL_W) / 2, T = 60;
    const side = (x0, x1, y) => Bodies.rectangle((x0 + x1) / 2, y, x1 - x0, T, st);
    const statics = [
      Bodies.rectangle(-T / 2, H / 2, T, H + 400, st), Bodies.rectangle(W + T / 2, H / 2, T, H + 400, st),
      side(-T, gx0, -T / 2), side(gx1, W + T, -T / 2), side(-T, gx0, H + T / 2), side(gx1, W + T, H + T / 2),
      // fonds de but
      Bodies.rectangle(W / 2, -GOAL_D - T / 2, GOAL_W + 2 * T, T, st), Bodies.rectangle(W / 2, H + GOAL_D + T / 2, GOAL_W + 2 * T, T, st),
      // coins arrondis (évite les blocages)
      ...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Bodies.rectangle(x, y, 60, 60, { ...st, angle: Math.PI / 4 })),
    ];
    const ball = Bodies.circle(W / 2, H / 2, BR, { restitution: 0.85, friction: 0.01, frictionAir: 0.012, density: 0.0012 });
    const d0 = makeDummy(W / 2, H - 150, 0), d1 = makeDummy(W / 2, 150, 1);
    Composite.add(engine.world, [...statics, ball, d0.body, d1.body]);
    const g = {
      engine, ball, dummies: [d0, d1], score: [0, 0], time: opts.time || MATCH_TIME,
      phase: 'play', phaseT: 0, events: [], over: false, lastScorer: -1,
    };
    resetPositions(g, -1);
    return g;
  }

  function resetPositions(g, towards) {
    for (const d of g.dummies) {
      Body.setPosition(d.body, d.home); Body.setVelocity(d.body, { x: 0, y: 0 }); Body.setAngle(d.body, 0); Body.setAngularVelocity(d.body, 0); d.cooldown = 0; d.target = null;
    }
    Body.setPosition(g.ball, { x: W / 2, y: H / 2 });
    // engagement : léger avantage à celui qui a encaissé
    Body.setVelocity(g.ball, { x: 0, y: towards === 0 ? 1.2 : towards === 1 ? -1.2 : 0 });
    Body.setAngularVelocity(g.ball, 0);
  }

  // Contrôle "air hockey" : le disque suit le doigt (cible) ; t = {x,y} ou null (doigt levé)
  const MOVE_K = 0.5; // fraction de la distance parcourue par pas (réactivité)
  function move(g, side, t, maxSp) {
    const d = g.dummies[side];
    if (!t || !isFinite(t.x) || !isFinite(t.y)) { d.target = null; return; }
    const m = PR + 2, x = Math.max(m, Math.min(W - m, t.x));
    // chacun reste dans sa moitié (un peu au-delà de la ligne médiane)
    const y = side === 0 ? Math.max(H / 2 - 60, Math.min(H - m, t.y)) : Math.max(m, Math.min(H / 2 + 60, t.y));
    d.target = { x, y }; d.maxSp = maxSp || MAX_SPEED;
  }
  function drive(g) {
    for (const d of g.dummies) {
      const p = d.body.position, v = d.body.velocity;
      if (!d.target) { Body.setVelocity(d.body, { x: v.x * 0.85, y: v.y * 0.85 }); continue; }
      let vx = (d.target.x - p.x) * MOVE_K, vy = (d.target.y - p.y) * MOVE_K;
      const sp = Math.hypot(vx, vy), mx = d.maxSp || MAX_SPEED;
      if (sp > mx) { vx *= mx / sp; vy *= mx / sp; }
      Body.setVelocity(d.body, { x: vx, y: vy }); Body.setAngularVelocity(d.body, 0);
    }
  }

  function botThink(g, side, dt, level = 1) {
    const d = g.dummies[side];
    if (g.phase !== 'play') { d.target = null; return; }
    d.think = (d.think || 0) - dt; if (d.think > 0) return; d.think = 0.12 - level * 0.03; // temps de réaction
    const b = g.ball.position, p = d.body.position;
    const goal = { x: W / 2, y: side === 0 ? -GOAL_D : H + GOAL_D };
    const own = side === 0 ? H : 0;
    const err = (3 - level) * 20;
    let tx, ty;
    const behind = side === 1 ? p.y < b.y - 10 : p.y > b.y + 10;
    const inHalf = side === 1 ? b.y < H / 2 + 40 : b.y > H / 2 - 40;
    if (behind && inHalf) { // foncer à travers la balle vers le but adverse
      let ux = goal.x - b.x, uy = goal.y - b.y; const l = Math.hypot(ux, uy) || 1;
      tx = b.x + ux / l * 40; ty = b.y + uy / l * 40;
    } else if (behind) { tx = (b.x + W / 2) / 2; ty = own + (side === 1 ? 160 : -160); }
    else { tx = (b.x + W / 2) / 2; ty = own + (side === 1 ? 90 : -90); } // revenir défendre
    tx += (Math.random() - 0.5) * err; ty += (Math.random() - 0.5) * err;
    move(g, side, { x: tx, y: ty }, 6 + level * 3);
  }

  function step(g, dt) {
    g.events.length = 0;
    if (g.over) return g;
    for (const d of g.dummies) d.cooldown = Math.max(0, d.cooldown - dt);
    if (g.phase === 'kickoff' || g.phase === 'goal') {
      g.phaseT -= dt;
      if (g.phase === 'goal') Engine.update(g.engine, dt * 1000 * 0.4);
      if (g.phaseT <= 0) {
        if (g.phase === 'goal') { resetPositions(g, g.lastScorer === 0 ? 1 : 0); if (g.time <= 0) return finish(g); }
        g.phase = 'play';
        g.events.push({ t: 'start' });
      }
      return g;
    }
    drive(g);
    Engine.update(g.engine, dt * 1000);
    const bv = g.ball.velocity, sp = Math.hypot(bv.x, bv.y);
    if (sp > 26) Body.setVelocity(g.ball, { x: bv.x * 26 / sp, y: bv.y * 26 / sp });
    const b = g.ball.position;
    if (b.y < -BR) return goal(g, 0); // but du haut : marqué par le joueur du bas (0)
    if (b.y > H + BR) return goal(g, 1);
    g.time -= dt;
    if (g.time <= 0) { g.time = 0; return finish(g); }
    return g;
  }
  function goal(g, scorer) {
    g.score[scorer]++; g.lastScorer = scorer; g.phase = 'goal'; g.phaseT = 1.2;
    g.events.push({ t: 'goal', side: scorer });
    return g;
  }
  function finish(g) {
    g.over = true; g.phase = 'over';
    const w = g.score[0] === g.score[1] ? -1 : g.score[0] > g.score[1] ? 0 : 1;
    g.events.push({ t: 'end', winner: w });
    g.winner = w;
    return g;
  }

  const r = (n) => Math.round(n * 10) / 10;
  function snapshot(g) {
    const s = [r(g.ball.position.x), r(g.ball.position.y), r(g.ball.angle)];
    for (const d of g.dummies) for (const p of d.parts) s.push(r(p.position.x), r(p.position.y), Math.round(p.angle * 100) / 100);
    return { s, sc: g.score, t: Math.ceil(g.time), ph: g.phase, cd: g.dummies.map((d) => r(d.cooldown)) };
  }
  // état "rendu" depuis la sim locale (même format)
  return { W, H, GOAL_W, GOAL_D, PR, BR, COUNTRIES, MATCH_TIME, COOLDOWN, create, step, move, botThink, snapshot };
});
