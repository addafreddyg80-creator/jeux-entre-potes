const puppeteer = require('puppeteer-core');
const B = process.argv[2] || 'http://localhost:8099/';
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const p = await br.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(B + '#/foot'); await p.waitForSelector('[data-dur]');
  await p.click('[data-dur="120"]');
  await p.evaluate(() => { FootSim.botThink = () => {}; });
  await p.evaluate(() => document.querySelector('#solo').click()); await new Promise(r => setTimeout(r, 150));
  const phase = await p.evaluate(() => Foot._st().game.phase);
  const pos = () => p.evaluate(() => { const b = Foot._st().game.dummies[0].body.position; return { x: b.x, y: b.y }; });
  const reset = () => p.evaluate(() => { const gm = Foot._st().game, d = gm.dummies[0]; Matter.Body.setPosition(d.body, { x: 250, y: 500 }); Matter.Body.setVelocity(d.body, { x: 0, y: 0 }); d.cooldown = 0; });
  const res = {};
  const swipe = async (name, dx, dy, steps, ms) => { await reset(); await new Promise(r => setTimeout(r, 100)); const a = await pos();
    await p.mouse.move(195, 500); await p.mouse.down();
    for (let i = 1; i <= steps; i++) { await p.mouse.move(195 + dx * i / steps, 500 + dy * i / steps); await new Promise(r => setTimeout(r, ms / steps)); }
    await p.mouse.up(); await new Promise(r => setTimeout(r, 1500)); const b = await pos();
    res[name] = Math.round(Math.hypot(b.x - a.x, b.y - a.y)); };
  await swipe('fwd_small_slow', 0, -25, 5, 300);
  await swipe('fwd_medium', 0, -70, 5, 150);
  await swipe('fwd_big_fast', 0, -150, 4, 50);
  await swipe('back_small', 0, 25, 5, 300);
  await swipe('back_big', 0, 150, 4, 50);
  await swipe('left_small', -25, 0, 5, 300);
  await swipe('right_big', 150, 0, 4, 50);
  // two quick moves back-to-back (no cooldown block)
  await reset(); const a = await pos();
  await p.mouse.move(195, 500); await p.mouse.down(); await p.mouse.move(195, 420, { steps: 3 }); await p.mouse.up();
  await new Promise(r => setTimeout(r, 120));
  await p.mouse.move(195, 500); await p.mouse.down(); await p.mouse.move(275, 500, { steps: 3 }); await p.mouse.up();
  await new Promise(r => setTimeout(r, 200)); const b2 = await pos(); res.second_move_dx = Math.round(b2.x - a.x);
  await p.screenshot({ path: 'screens/v6.png' });
  console.log(JSON.stringify({ phase, res, errs }));
  await br.close();
})();
