const puppeteer = require('puppeteer-core');
const B = process.argv[2] || 'http://localhost:8099/';
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const p = await br.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(B + '#/foot'); await p.waitForSelector('[data-t]');
  await p.click('[data-t="600"]');
  await p.evaluate(() => { const o = FootSim.botThink; window.__bot = true; FootSim.botThink = (...a) => window.__bot && o(...a); });
  await p.evaluate(() => document.querySelector('#solo').click()); await new Promise(r => setTimeout(r, 2000));
  console.log('E', errs, await p.evaluate(() => Foot.active)); const timer0 = await p.$eval('#timer', e => e.textContent);
  await p.evaluate(() => window.__bot = false);
  const g = () => p.evaluate(() => { const s = FootSim.snapshot(Foot._st().game); return { y: s.s[4], x: s.s[3], sc: s.sc.join('-') }; });
  const before = await g();
  await p.mouse.move(195, 600); await p.mouse.down(); await p.mouse.move(195, 480, { steps: 5 });
  await p.screenshot({ path: 'screens/v3.png' });
  await p.mouse.up(); await new Promise(r => setTimeout(r, 300));
  const after = await g();
  // goal: drive player behind ball repeatedly
  let sc = after.sc;
  for (let i = 0; i < 40 && sc === '0-0'; i++) {
    await p.evaluate(() => { const st = Foot._st(), gm = st.game, b = gm.ball.position, d = gm.dummies[0].body.position;
      const tx = b.x - d.x + (b.x - 300) * 0, ty = b.y - d.y; FootSim.launch(gm, 0, { dx: tx, dy: ty - 0, power: 1 }); });
    await new Promise(r => setTimeout(r, 900)); sc = (await g()).sc;
  }
  await p.screenshot({ path: 'screens/v3-goal.png' });
  console.log(JSON.stringify({ timer0, before, after, sc, errs }));
  await br.close();
})();
