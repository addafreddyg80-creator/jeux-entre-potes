// Simulation partagée (navigateur solo + serveur en ligne)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('matter-js'));
  else root.FootSim = factory(root.Matter);
})(typeof self !== 'undefined' ? self : this, function (Matter) {
  const { Engine, Bodies, Body, Composite } = Matter;
  const W = 500, H = 860, GOAL_W = 128, GOAL_D = 40, PR = 38, BR = 17;
  const MATCH_TIME = 60, COOLDOWN = 0.35, MAX_SPEED = 32;

  const COUNTRIES = [
    { id: 'fr', name: 'France', flag: '🇫🇷', c1: '#1f4fd1', c2: '#ffffff' },
    { id: 'bj', name: 'Bénin', flag: '🇧🇯', c1: '#0a8f3c', c2: '#fcd116' },
    { id: 'ci', name: "Côte d'Ivoire", flag: '🇨🇮', c1: '#f77f00', c2: '#ffffff' },
    { id: 'sn', name: 'Sénégal', flag: '🇸🇳', c1: '#00853f', c2: '#fdef42' },
    { id: 'cm', name: 'Cameroun', flag: '🇨🇲', c1: '#007a5e', c2: '#ce1126' },
    { id: 'ma', name: 'Maroc', flag: '🇲🇦', c1: '#c1272d', c2: '#006233' },
    { id: 'ng', name: 'Nigeria', flag: '🇳🇬', c1: '#008751', c2: '#ffffff' },
    { id: 'gh', name: 'Ghana', flag: '🇬🇭', c1: '#ffffff', c2: '#ce1126' },
    { id: 'br', name: 'Brésil', flag: '🇧🇷', c1: '#ffdf00', c2: '#009c3b' },
    { id: 'ar', name: 'Argentine', flag: '🇦🇷', c1: '#74acdf', c2: '#ffffff' },
    { id: 'es', name: 'Espagne', flag: '🇪🇸', c1: '#c60b1e', c2: '#ffc400' },
    { id: 'de', name: 'Allemagne', flag: '🇩🇪', c1: '#ffffff', c2: '#000000' },
    { id: 'pt', name: 'Portugal', flag: '🇵🇹', c1: '#c8102e', c2: '#046a38' },
    { id: 'gb', name: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', c1: '#ffffff', c2: '#cf081f' },
    { id: 'it', name: 'Italie', flag: '🇮🇹', c1: '#0066cc', c2: '#ffffff' },
    { id: 'us', name: 'États-Unis', flag: '🇺🇸', c1: '#002868', c2: '#bf0a30' },
    { id: 'jp', name: 'Japon', flag: '🇯🇵', c1: '#000080', c2: '#ffffff' },
    { id: 'mx', name: 'Mexique', flag: '🇲🇽', c1: '#006847', c2: '#ce1126' },
  ];

  // Joueurs = disques pleins (vue de dessus, sans gravité)
  function makeDummy(x, y, side) {
    const body = Bodies.circle(x, y, PR, { restitution: 0.6, friction: 0.02, frictionAir: 0.022, density: 0.0019 });
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
      phase: 'kickoff', phaseT: 1.2, events: [], over: false, lastScorer: -1,
    };
    resetPositions(g, -1);
    return g;
  }

  function resetPositions(g, towards) {
    for (const d of g.dummies) {
      Body.setPosition(d.body, d.home); Body.setVelocity(d.body, { x: 0, y: 0 }); Body.setAngle(d.body, 0); Body.setAngularVelocity(d.body, 0); d.cooldown = 0;
    }
    Body.setPosition(g.ball, { x: W / 2, y: H / 2 });
    // engagement : léger avantage à celui qui a encaissé
    Body.setVelocity(g.ball, { x: 0, y: towards === 0 ? 1.2 : towards === 1 ? -1.2 : 0 });
    Body.setAngularVelocity(g.ball, 0);
  }

  // input : {dx, dy} vecteur normalisé, power 0..1
  function launch(g, side, inp) {
    const d = g.dummies[side];
    if (g.phase !== 'play' || d.cooldown > 0 || !inp) return false;
    let { dx, dy, power } = inp;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    power = Math.max(0.3, Math.min(1, Math.sqrt(power || 0)));
    Body.setVelocity(d.body, { x: dx * MAX_SPEED * power, y: dy * MAX_SPEED * power });
    Body.setAngularVelocity(d.body, (Math.random() - 0.5) * 0.4);
    d.cooldown = COOLDOWN;
    g.events.push({ t: 'launch', side });
    return true;
  }

  function botThink(g, side, dt, level = 1) {
    const d = g.dummies[side];
    if (g.phase !== 'play' || d.cooldown > 0) return;
    if (Math.random() > dt * (1.2 + level)) return; // temps de réaction
    const b = g.ball.position, p = d.body.position;
    const goal = { x: W / 2, y: side === 0 ? -GOAL_D : H + GOAL_D }; // but visé
    const own = side === 0 ? H : 0;
    const err = (3 - level) * 25;
    let tx, ty;
    const behind = side === 1 ? p.y < b.y : p.y > b.y; // le bot est entre son but et la balle
    if (behind) {
      // viser un point derrière la balle, aligné vers le but adverse
      let ux = b.x - goal.x, uy = b.y - goal.y; const l = Math.hypot(ux, uy) || 1;
      tx = b.x + ux / l * (BR + PR - 10); ty = b.y + uy / l * (BR + PR - 10);
    } else {
      // revenir défendre côté de son propre but
      tx = (b.x + W / 2) / 2; ty = own + (side === 1 ? 110 : -110);
    }
    tx += (Math.random() - 0.5) * err; ty += (Math.random() - 0.5) * err;
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
    if (dist < 15) return;
    launch(g, side, { dx, dy, power: Math.min(1, 0.4 + dist / 500) * (0.7 + level * 0.1) });
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
    g.score[scorer]++; g.lastScorer = scorer; g.phase = 'goal'; g.phaseT = 2.2;
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
  return { W, H, GOAL_W, GOAL_D, PR, BR, COUNTRIES, MATCH_TIME, COOLDOWN, create, step, launch, botThink, snapshot };
});
