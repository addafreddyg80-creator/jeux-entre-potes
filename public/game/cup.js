// Mode "Coupe du monde" : logique du tournoi (pure, testable) + écrans
(function (root, f) { const m = f(root.FootSim || (typeof require === 'function' ? require('./sim.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.Cup = m; })(this, function (S) {
  const KEY = 'cup_v1';
  const STAGES = ['groups', 'r16', 'qf', 'sf', 'final'];
  const NAMES = { groups: 'Phase de groupes', r16: 'Huitièmes de finale', qf: 'Quarts de finale', sf: 'Demi-finales', final: 'Finale' };
  const LEVELS = { groups: [0.5, 0.8, 1.1], r16: 1.5, qf: 2, sf: 2.5, final: 3 };
  const PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]; // 3 journées, 2 matchs chacune
  const L = 'ABCDEFGH';
  const rg = (rng) => Math.floor(rng() * 4.2 * rng()); // buts simulés 0..4

  function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function create(me, rng = Math.random) {
    const others = shuffle(S.COUNTRIES.map((c) => c.id).filter((id) => id !== me), rng).slice(0, 31);
    const all = [me, ...others];
    const groups = []; for (let g = 0; g < 8; g++) groups.push(all.slice(g * 4, g * 4 + 4));
    const gm = groups.map((t) => PAIRS.map(([i, j]) => ({ a: t[i], b: t[j], ga: null, gb: null })));
    return { v: 1, me, groups, gm, stage: 'groups', day: 0, ko: {}, status: 'play', last: null };
  }
  function table(s, g) {
    const rows = {}; for (const id of s.groups[g]) rows[id] = { id, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, pts: 0 };
    for (const m of s.gm[g]) if (m.ga != null) {
      const A = rows[m.a], B = rows[m.b]; A.j++; B.j++; A.bp += m.ga; A.bc += m.gb; B.bp += m.gb; B.bc += m.ga;
      if (m.ga > m.gb) { A.g++; B.p++; A.pts += 3; } else if (m.ga < m.gb) { B.g++; A.p++; B.pts += 3; } else { A.n++; B.n++; A.pts++; B.pts++; }
    }
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.bp - y.bc) - (x.bp - x.bc) || y.bp - x.bp || s.groups[g].indexOf(x.id) - s.groups[g].indexOf(y.id));
  }
  function next(s) { // prochain match du joueur
    if (s.status !== 'play') return null;
    if (s.stage === 'groups') { const m = s.gm[0][s.day * 2]; return { stage: 'groups', opp: m.b, level: LEVELS.groups[s.day], label: `${NAMES.groups} — match ${s.day + 1}/3` }; }
    const m = s.ko[s.stage].find((x) => x.a === s.me || x.b === s.me);
    return { stage: s.stage, opp: m.a === s.me ? m.b : m.a, level: LEVELS[s.stage], label: NAMES[s.stage] };
  }
  function koWinner(m, rng) { if (m.ga !== m.gb) return m.ga > m.gb ? m.a : m.b; m.tab = true; return rng() < 0.5 ? m.a : m.b; }
  function simKO(m, rng) { m.ga = rg(rng); m.gb = rg(rng); m.w = koWinner(m, rng); }
  function buildKO(s, rng) {
    if (s.stage === 'groups') {
      const q = s.groups.map((_, g) => table(s, g).map((r) => r.id));
      const ms = []; for (let g = 0; g < 8; g += 2) { ms.push({ a: q[g][0], b: q[g + 1][1] }, { a: q[g + 1][0], b: q[g][1] }); }
      s.ko.r16 = ms; s.stage = 'r16';
    } else {
      const prev = s.ko[s.stage], st = STAGES[STAGES.indexOf(s.stage) + 1], ms = [];
      for (let i = 0; i < prev.length; i += 2) ms.push({ a: prev[i].w, b: prev[i + 1].w });
      s.ko[st] = ms; s.stage = st;
    }
  }
  // Résultat du match du joueur (mine = buts du joueur, opp = buts de l'adversaire)
  function record(s, mine, opp, rng = Math.random) {
    const n = next(s); if (!n) return s;
    if (s.stage === 'groups') {
      const m = s.gm[0][s.day * 2]; m.ga = mine; m.gb = opp;
      const o = s.gm[0][s.day * 2 + 1]; o.ga = rg(rng); o.gb = rg(rng);
      s.last = { who: n.opp, mine, them: opp };
      s.day++;
      if (s.day === 3) {
        for (let g = 1; g < 8; g++) for (const x of s.gm[g]) { x.ga = rg(rng); x.gb = rg(rng); }
        const t = table(s, 0); s.groupRank = t.findIndex((r) => r.id === s.me) + 1;
        if (s.groupRank > 2) { s.status = 'out'; s.outAt = 'groups'; return s; }
        buildKO(s, rng);
      }
      return s;
    }
    const ms = s.ko[s.stage];
    for (const m of ms) {
      if (m.a === s.me) { m.ga = mine; m.gb = opp; m.w = koWinner(m, rng); }
      else if (m.b === s.me) { m.ga = opp; m.gb = mine; m.w = koWinner(m, rng); }
      else simKO(m, rng);
    }
    const my = ms.find((m) => m.a === s.me || m.b === s.me);
    s.last = { who: n.opp, mine, them: opp, tab: !!my.tab, won: my.w === s.me };
    if (my.w !== s.me) { s.status = 'out'; s.outAt = s.stage; return s; }
    if (s.stage === 'final') { s.status = 'champion'; return s; }
    buildKO(s, rng); return s;
  }
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } };
  const save = (s) => { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} };

  // ---------- Écrans ----------
  const C = (id) => S.COUNTRIES.find((c) => c.id === id) || S.COUNTRIES[0];
  const nm = (id) => `${C(id).flag} ${C(id).name}`;
  function tableHTML(s, g) {
    return `<div class="card"><h2 style="margin-top:0">Groupe ${L[g]}</h2><table class="cup"><tr><th></th><th>Équipe</th><th>J</th><th>Diff</th><th>Pts</th></tr>${table(s, g).map((r, i) => `<tr class="${r.id === s.me ? 'me' : ''} ${i < 2 ? 'q' : ''}"><td>${i + 1}</td><td>${nm(r.id)}</td><td>${r.j}</td><td>${r.bp - r.bc > 0 ? '+' : ''}${r.bp - r.bc}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table></div>`;
  }
  function koHTML(s) {
    return STAGES.slice(1).filter((st) => s.ko[st]).map((st) => `<div class="card"><h2 style="margin-top:0">${NAMES[st]}</h2>${s.ko[st].map((m) => `<div class="kom ${m.a === s.me || m.b === s.me ? 'me' : ''}"><span>${nm(m.a)}</span><b>${m.ga == null ? 'vs' : `${m.ga} - ${m.gb}${m.tab ? ' (t.a.b.)' : ''}`}</b><span>${nm(m.b)}</span></div>`).join('')}</div>`).join('');
  }
  function lastHTML(s) {
    if (!s.last) return '';
    const l = s.last; const r = l.mine > l.them ? 'Victoire' : l.mine < l.them ? 'Défaite' : 'Match nul';
    return `<div class="card mut">Dernier match : <b>${r} ${l.mine} - ${l.them}</b> contre ${nm(l.who)}${l.tab ? (l.won ? ' — gagné aux tirs au but 🎯' : ' — perdu aux tirs au but') : ''}</div>`;
  }
  function open(app, o) {
    let s = load();
    const render = () => {
      if (!s) {
        app.innerHTML = `<h1>🏆 Coupe du monde</h1><div class="card"><h2 style="margin-top:0">Choisis ton pays</h2><div class="flags">${S.COUNTRIES.map((k) => `<div data-c="${k.id}" class="${k.id === o.country ? 'sel' : ''}"><b>${k.flag}</b>${k.name}</div>`).join('')}</div></div>
        <div class="card col"><div class="mut">32 équipes, 8 groupes de 4. Les 2 premiers passent en huitièmes. L’ordi devient plus fort à chaque tour. En cas d’égalité à élimination directe : tirs au but.</div><button id="cgo">🏁 Lancer la Coupe avec ${nm(o.country)}</button><button class="ghost" id="cback">← Retour</button></div>`;
        app.querySelectorAll('.flags div').forEach((d) => (d.onclick = () => { o.country = d.dataset.c; o.onCountry && o.onCountry(o.country); render(); }));
        app.querySelector('#cgo').onclick = () => { s = create(o.country); save(s); render(); };
        app.querySelector('#cback').onclick = o.onBack; return;
      }
      if (s.status === 'champion') {
        app.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:96px;line-height:1.1">🏆</div><h1>CHAMPION DU MONDE !</h1><div style="font-size:48px">${C(s.me).flag}</div><h2>${C(s.me).name}</h2><div class="mut">Mené par ${C(s.me).star}. Personne ne t’a arrêté !</div></div>${lastHTML(s)}${koHTML(s)}<div class="card col"><button id="cnew">🔁 Nouvelle Coupe</button><button class="ghost" id="cback">← Retour</button></div>`;
      } else if (s.status === 'out') {
        app.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:72px">😢</div><h1>Éliminé</h1><h2>${nm(s.me)}</h2><div class="mut">${s.outAt === 'groups' ? `Tu finis ${s.groupRank}ᵉ de ton groupe.` : `Sorti en ${NAMES[s.outAt].toLowerCase()}.`}</div></div>${lastHTML(s)}${s.outAt === 'groups' ? tableHTML(s, 0) : koHTML(s)}<div class="card col"><button id="cnew">🔁 Nouvelle Coupe</button><button class="ghost" id="cback">← Retour</button></div>`;
      } else {
        const n = next(s);
        app.innerHTML = `<h1>🏆 Coupe du monde</h1>${lastHTML(s)}<div class="card col" style="text-align:center"><div class="mut">${n.label}</div><h2 style="margin:4px 0">Prochain adversaire</h2><div style="font-size:22px">${nm(s.me)} <b>vs</b> ${nm(n.opp)}</div><div class="mut">${C(n.opp).star} t’attend.</div><button id="cplay">⚽ Jouer le match</button></div>
        ${s.stage === 'groups' ? tableHTML(s, 0) + `<details class="card"><summary>Autres groupes</summary>${s.groups.slice(1).map((_, i) => tableHTML(s, i + 1)).join('')}</details>` : koHTML(s)}
        <div class="card col"><button class="ghost" id="cback">← Retour (la Coupe est sauvegardée)</button><button class="ghost" id="cnew">Abandonner et recommencer</button></div>`;
        app.querySelector('#cplay').onclick = () => {
          o.play({ opp: C(n.opp), me: C(s.me), level: n.level, onEnd: (mine, opp) => { s = record(s, mine, opp); save(s); }, onQuit: () => render() });
        };
      }
      const nw = app.querySelector('#cnew'); if (nw) nw.onclick = () => { if (s.status === 'play' && !confirm('Abandonner cette Coupe ?')) return; s = null; save(null); render(); };
      app.querySelector('#cback').onclick = o.onBack;
    };
    render();
  }
  return { create, table, next, record, load, save, open, NAMES, LEVELS };
});
