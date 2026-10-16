// Simulation partagée (navigateur solo + serveur en ligne)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('matter-js'));
  else root.FootSim = factory(root.Matter);
})(typeof self !== 'undefined' ? self : this, function (Matter) {
  const { Engine, Bodies, Body, Composite, Constraint, Events } = Matter;
  const W = 1000, H = 500, GROUND = 470, GOAL_TOP = 325, GOAL_D = 55;
  const MATCH_TIME = 60, COOLDOWN = 0.75, MAX_SPEED = 21;

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

  function makeDummy(x, side, group) {
    const f = { group, category: 0x0002, mask: 0xffff };
    const o = { collisionFilter: f, friction: 0.6, restitution: 0.3, frictionAir: 0.012 };
    const torso = Bodies.rectangle(x, GROUND - 75, 22, 44, { ...o, density: 0.004, chamfer: { radius: 8 } });
    const head = Bodies.circle(x, GROUND - 112, 15, { ...o, density: 0.002 });
    const armL = Bodies.rectangle(x - 16, GROUND - 78, 8, 30, { ...o, density: 0.001, chamfer: { radius: 4 } });
    const armR = Bodies.rectangle(x + 16, GROUND - 78, 8, 30, { ...o, density: 0.001, chamfer: { radius: 4 } });
    const legL = Bodies.rectangle(x - 6, GROUND - 32, 10, 38, { ...o, density: 0.003, chamfer: { radius: 5 } });
    const legR = Bodies.rectangle(x + 6, GROUND - 32, 10, 38, { ...o, density: 0.003, chamfer: { radius: 5 } });
    const parts = [torso, head, armL, armR, legL, legR];
    const c = (a, pa, b, pb, s = 0.6) => Constraint.create({ bodyA: a, pointA: pa, bodyB: b, pointB: pb, stiffness: s, length: 0 });
    const cons = [
      c(torso, { x: 0, y: -24 }, head, { x: 0, y: 13 }, 0.9),
      c(torso, { x: -10, y: -18 }, armL, { x: 0, y: -13 }),
      c(torso, { x: 10, y: -18 }, armR, { x: 0, y: -13 }),
      c(torso, { x: -6, y: 20 }, legL, { x: 0, y: -17 }, 0.8),
      c(torso, { x: 6, y: 20 }, legR, { x: 0, y: -17 }, 0.8),
    ];
    return { parts, cons, torso, side, cooldown: 0 };
  }

  function create(opts = {}) {
    const engine = Engine.create({ gravity: { x: 0, y: 1.1 } });
    engine.positionIterations = 8; engine.velocityIterations = 6;
    const st = { isStatic: true, friction: 0.8, restitution: 0.4 };
    const statics = [
      Bodies.rectangle(W / 2, GROUND + 40, W * 2, 80, st), // sol
      Bodies.rectangle(W / 2, -40, W * 2, 80, st), // plafond
      Bodies.rectangle(-30, H / 2, 60, H * 2, st),
      Bodies.rectangle(W + 30, H / 2, 60, H * 2, st),
      // barres transversales (inclinées pour faire glisser la balle)
      Bodies.rectangle(GOAL_D / 2, GOAL_TOP, GOAL_D + 10, 10, { ...st, angle: 0.15 }),
      Bodies.rectangle(W - GOAL_D / 2, GOAL_TOP, GOAL_D + 10, 10, { ...st, angle: -0.15 }),
    ];
    const ball = Bodies.circle(W / 2, 200, 17, { restitution: 0.75, friction: 0.05, frictionAir: 0.006, density: 0.0012 });
    const d0 = makeDummy(250, 0, -1), d1 = makeDummy(750, 1, -2);
    Composite.add(engine.world, [...statics, ball, ...d0.parts, ...d0.cons, ...d1.parts, ...d1.cons]);
    const g = {
      engine, ball, dummies: [d0, d1], score: [0, 0], time: opts.time || MATCH_TIME,
      phase: 'kickoff', phaseT: 1.2, events: [], over: false, lastScorer: -1,
    };
    resetPositions(g, 0);
    return g;
  }

  function placeDummy(d, x) {
    const offs = [[0, -75], [0, -112], [-16, -78], [16, -78], [-6, -32], [6, -32]];
    d.parts.forEach((p, i) => {
      Body.setPosition(p, { x: x + offs[i][0], y: GROUND + offs[i][1] });
      Body.setAngle(p, 0); Body.setVelocity(p, { x: 0, y: 0 }); Body.setAngularVelocity(p, 0);
    });
    d.cooldown = 0;
  }
  function resetPositions(g, towards) {
    placeDummy(g.dummies[0], 260); placeDummy(g.dummies[1], 740);
    Body.setPosition(g.ball, { x: W / 2, y: 150 });
    Body.setVelocity(g.ball, { x: towards === 0 ? -1.5 : towards === 1 ? 1.5 : 0, y: 0 });
    Body.setAngularVelocity(g.ball, 0);
  }

  // input : {dx, dy} vecteur normalisé, power 0..1
  function launch(g, side, inp) {
    const d = g.dummies[side];
    if (g.phase !== 'play' || d.cooldown > 0 || !inp) return false;
    let { dx, dy, power } = inp;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    power = Math.max(0.15, Math.min(1, power || 0));
    const v = { x: dx * MAX_SPEED * power, y: dy * MAX_SPEED * power };
    d.parts.forEach((p, i) => {
      const j = i === 0 ? 1 : 0.85 + Math.random() * 0.3; // un peu de chaos
      Body.setVelocity(p, { x: v.x * j, y: v.y * j });
    });
    Body.setAngularVelocity(d.torso, (dx >= 0 ? 1 : -1) * (0.15 + Math.random() * 0.2));
    d.cooldown = COOLDOWN;
    g.events.push({ t: 'launch', side });
    return true;
  }

  function botThink(g, side, dt, level = 1) {
    const d = g.dummies[side];
    if (g.phase !== 'play' || d.cooldown > 0) return;
    if (Math.random() > dt * (1.6 + level)) return; // temps de réaction
    const b = g.ball.position, t = d.torso.position;
    const goalX = side === 0 ? W : 0;
    const dir = Math.sign(goalX - b.x);
    const tx = b.x - dir * 22 + (Math.random() - 0.5) * 40;
    const ty = b.y - 10;
    let dx = tx - t.x, dy = ty - t.y - Math.abs(tx - t.x) * 0.35; // trajectoire en cloche
    const dist = Math.hypot(dx, dy);
    launch(g, side, { dx, dy, power: Math.min(1, 0.35 + dist / 650) });
  }

  function step(g, dt) {
    g.events.length = 0;
    if (g.over) return g;
    for (const d of g.dummies) {
      d.cooldown = Math.max(0, d.cooldown - dt);
      // aide à se relever : couple léger vers la verticale
      const a = d.torso.angle % (Math.PI * 2);
      Body.setAngularVelocity(d.torso, d.torso.angularVelocity * 0.98 - Math.sin(a) * 0.004);
    }
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
    // sécurité vitesse balle
    const bv = g.ball.velocity, sp = Math.hypot(bv.x, bv.y);
    if (sp > 28) Body.setVelocity(g.ball, { x: bv.x * 28 / sp, y: bv.y * 28 / sp });
    const b = g.ball.position;
    if (b.y > GOAL_TOP + 8) {
      if (b.x < GOAL_D - 12) return goal(g, 1);
      if (b.x > W - GOAL_D + 12) return goal(g, 0);
    }
    // anti-coincement balle sur une barre
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
  return { W, H, GROUND, GOAL_TOP, GOAL_D, COUNTRIES, MATCH_TIME, COOLDOWN, create, step, launch, botThink, snapshot };
});
