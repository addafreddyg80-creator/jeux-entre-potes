global.Matter=require('matter-js'); const S=require('./public/game/sim.js');
const g=S.create({time:600}); let mn=1e9,mx=0,minY0=1e9,maxY1=0,goals=0,stopT=0;
for(let i=0;i<60*600&&!g.over;i++){S.botThink(g,0,1/60,2);S.botThink(g,1,1/60,2);S.step(g,1/60);
 if(g.phase==='play'){const v=g.ball.velocity,s=Math.hypot(v.x,v.y);mn=Math.min(mn,s);mx=Math.max(mx,s);}
 minY0=Math.min(minY0,g.dummies[0].body.position.y);maxY1=Math.max(maxY1,g.dummies[1].body.position.y);}
console.log({PR:S.PR,minSpeed:mn.toFixed(2),maxSpeed:mx.toFixed(2),score:g.score,botBottomReachedY:minY0.toFixed(0),botTopReachedY:maxY1.toFixed(0)});
const h=S.create({});h.phase='play';for(let i=0;i<120;i++){S.move(h,0,{x:120,y:0});S.step(h,1/60);}
console.log('player palet driven to top goal, y=',h.dummies[0].body.position.y.toFixed(0),'H=',S.H);
