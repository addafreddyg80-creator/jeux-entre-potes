const puppeteer = require('puppeteer-core');
const B = 'http://localhost:3000';
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const errs = [];
  async function page(pseudo, landscape) {
    const ctx = await br.createBrowserContext(); const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(pseudo + ': ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(pseudo + ' console: ' + m.text()));
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p.goto(B); await p.waitForSelector('#f');
    await p.type('[name=pseudo]', pseudo); await p.type('[name=password]', 'test1234');
    await p.click('#f button'); await p.waitForSelector('#tabs:not(.hidden)'); return p;
  }
  const a = await page('Freddy'); const b = await page('Kossi');
  await a.screenshot({ path: 'screens/1-accueil-jeux.png' });
  await a.goto(B + '/#/recherche'); await new Promise(r=>setTimeout(r,800)); await a.screenshot({ path: 'screens/2-recherche.png' });
  await a.goto(B + '/#/u/2'); await new Promise(r=>setTimeout(r,800)); await a.screenshot({ path: 'screens/3-profil-joueur.png' });
  await a.goto(B + '/#/chat/2'); await a.waitForSelector('#mi'); await a.type('#mi', 'Prêt pour la revanche ? 😤'); await a.keyboard.press('Enter');
  await new Promise(r=>setTimeout(r,800)); await a.screenshot({ path: 'screens/4-discussion.png' });
  await b.screenshot({ path: 'screens/4b-notif-message.png' });
  await a.goto(B + '/#/profil'); await new Promise(r=>setTimeout(r,600)); await a.screenshot({ path: 'screens/5-mon-profil.png' });
  await a.goto(B + '/#/foot'); await new Promise(r=>setTimeout(r,600)); await a.screenshot({ path: 'screens/6-foot-menu.png', fullPage: true });
  // solo en paysage
  await a.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await a.click('#solo'); await new Promise(r=>setTimeout(r,3500));
  // simulate drag
  await a.mouse.move(300, 250); await a.mouse.down(); await a.mouse.move(220, 300, { steps: 5 });
  await a.screenshot({ path: 'screens/7-solo-visee.png' });
  await a.mouse.up(); await new Promise(r=>setTimeout(r,500)); await a.screenshot({ path: 'screens/8-solo-action.png' });
  await a.click('#quit');
  // en ligne : A défie B depuis son profil
  await b.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await a.goto(B + '/#/u/2'); await a.waitForSelector('#ch'); await a.click('#ch');
  await b.waitForSelector('[data-a=ok]'); await b.screenshot({ path: 'screens/9-defi-recu.png' });
  await b.click('[data-a=ok]'); await new Promise(r=>setTimeout(r,3000));
  for (const [p, x] of [[a, 300], [b, 560]]) { await p.mouse.move(x, 250); await p.mouse.down(); await p.mouse.move(x + (x < 400 ? -60 : 60), 300, { steps: 4 }); await p.mouse.up(); }
  await new Promise(r=>setTimeout(r,400));
  await a.screenshot({ path: 'screens/10-enligne-joueur1.png' }); await b.screenshot({ path: 'screens/11-enligne-joueur2.png' });
  console.log('erreurs:', errs);
  await br.close();
})();
