const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let country = localStorage.getItem('country') || 'bj';
const C = (id) => FootSim.COUNTRIES.find((c) => c.id === id) || FootSim.COUNTRIES[0];
const SOON = '<div class="card" style="border:1px dashed #ffe066">🚧 <b>Bientôt en ligne</b> — ceci est un aperçu. Les comptes, la recherche de joueurs, la messagerie et le jeu en ligne arrivent avec la version complète.</div>';
const FAKE = [['Koffi','🦁','#22d3a6',1],['Aïcha','🐼','#ff5c7a',1],['Yann','😎','#2fa8ff',0],['Fifi','👑','#ffb020',0]];
const av = (u) => `<div class="av ${u[3] ? 'on' : ''}" style="background:${u[2]}33">${u[1]}</div>`;
function pageJeux() {
  app.innerHTML = `<h1>Salut 👋 (démo)</h1>
  <a class="game-tile" href="#/foot"><span class="tag">Solo</span><span class="tag">1 vs 1 en ligne (bientôt)</span><h3 style="margin-top:12px">Dummies Foot</h3><div>Foot ragdoll complètement chaotique</div><div class="em">⚽</div></a>
  <div class="game-tile soon"><span class="tag">Bientôt</span><h3 style="margin-top:12px">Prochain jeu…</h3><div>D’autres jeux arrivent (jusqu’à 4 joueurs)</div><div class="em">🎲</div></div>`;
}
function pageFoot() {
  const c = C(country);
  app.innerHTML = `<h1>⚽ Dummies Foot</h1>
  <div class="card"><h2 style="margin-top:0">Ton équipe : <span id="cn">${c.flag} ${c.name}</span></h2><div class="flags">${FootSim.COUNTRIES.map((k) => `<div data-c="${k.id}" class="${k.id === country ? 'sel' : ''}"><b>${k.flag}</b>${k.name}</div>`).join('')}</div></div>
  <div class="card col"><h2 style="margin:0">⏱️ Durée du match</h2><div class="row"><button class="ghost grow" data-dur="45">45 s</button><button class="ghost grow" data-dur="60">1 min</button><button class="ghost grow" data-dur="90">1 min 30</button><button class="ghost grow" data-dur="120">2 min</button></div></div>
  <div class="card col"><button id="solo">🤖 Jouer en solo contre l’ordi</button>
  <div class="row"><button class="ghost grow" data-l="0">Facile</button><button class="ghost grow" data-l="1">Normal</button><button class="ghost grow" data-l="2.5">Difficile</button></div></div>
  <div class="card col" style="opacity:.6"><h2 style="margin:0">En ligne (1 vs 1)</h2><button class="alt" disabled>Créer un salon</button>
  <div class="row"><input placeholder="CODE" disabled style="text-align:center"><button disabled>Rejoindre</button></div></div>${SOON}
  <div class="card mut" style="font-size:14px">🎯 <b>Comment jouer :</b> touche l’écran, glisse ton doigt <b>dans la direction où tu veux aller</b> (vers l’avant = attaque, vers l’arrière = défense) puis relâche. Plus tu glisses loin, plus ton rond va vite.</div>`;
  let level = 1, dur = [45, 60, 90, 120].includes(+localStorage.getItem("dur")) ? +localStorage.getItem("dur") : 60;
  document.querySelectorAll('[data-dur]').forEach((b) => { b.classList.toggle('alt', +b.dataset.dur === dur); b.onclick = () => { dur = +b.dataset.dur; localStorage.setItem('dur', dur); document.querySelectorAll('[data-dur]').forEach((x) => x.classList.toggle('alt', x === b)); }; });
  document.querySelectorAll('.flags div').forEach((d) => (d.onclick = () => { country = d.dataset.c; localStorage.setItem('country', country); pageFoot(); }));
  document.querySelectorAll('[data-l]').forEach((b) => { b.classList.toggle('alt', +b.dataset.l === level); b.onclick = () => { level = +b.dataset.l; document.querySelectorAll('[data-l]').forEach((x) => x.classList.toggle('alt', x === b)); }; });
  $('#solo').onclick = () => {
    const cpu = FootSim.COUNTRIES.filter((k) => k.id !== country)[Math.floor(Math.random() * (FootSim.COUNTRIES.length - 1))];
    Foot.start({ mode: 'solo', mySide: 0, level, time: dur, countries: [C(country), cpu], names: ['Toi', 'CPU'], onQuit: () => route() });
  };
}
function pageRecherche() {
  app.innerHTML = `<h1>🔎 Joueurs</h1>${SOON}<div class="card col"><input placeholder="Rechercher un pseudo…" disabled>
  ${FAKE.map((u) => `<div class="row">${av(u)}<b class="grow">${u[0]}</b><span class="mut">${u[3] ? 'en ligne' : 'hors ligne'}</span></div>`).join('')}</div>`;
}
function pageMessages() {
  app.innerHTML = `<h1>💬 Messages</h1>${SOON}<div class="card col">
  ${FAKE.slice(0, 3).map((u, i) => `<div class="row">${av(u)}<div class="grow"><b>${u[0]}</b><div class="mut">${['On se fait un match ce soir ? ⚽', 'Revanche demain 😤', 'GG mon frère !'][i]}</div></div></div>`).join('')}</div>`;
}
function pageProfil() {
  app.innerHTML = `<h1>👤 Profil</h1>${SOON}<div class="card col" style="text-align:center"><div style="font-size:48px">⚽</div><h2>Invité (démo)</h2><div class="mut">Crée ton compte bientôt pour garder tes victoires et défier tes potes.</div></div>`;
}
function route() {
  if (Foot.active) return;
  const h = location.hash || '#/jeux';
  const tab = h.startsWith('#/foot') ? 'jeux' : h.slice(2);
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.t === tab));
  $('#tabs').classList.remove('hidden');
  ({ '#/recherche': pageRecherche, '#/messages': pageMessages, '#/profil': pageProfil, '#/foot': pageFoot }[h] || pageJeux)();
}
addEventListener('hashchange', route);
route();
