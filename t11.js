global.Matter=require('matter-js'); const S=require('./public/game/sim.js'); const Cup=require('./public/game/cup.js');
const assert=require('assert'); console.log('pays:',S.COUNTRIES.length);
function run(policy){let s=Cup.create('bj');const ids=new Set(s.groups.flat());assert.equal(ids.size,32);const log=[];
 for(let k=0;k<20&&s.status==='play';k++){const n=Cup.next(s);log.push(n.stage+'@'+n.level);const [a,b]=policy(n);s=JSON.parse(JSON.stringify(Cup.record(s,a,b)));}
 return {s,log};}
let r=run(()=>[3,0]);assert.equal(r.s.status,'champion');assert.equal(r.log.length,7);console.log('champion:',r.log.join(' '));
const levels=r.log.map(x=>+x.split('@')[1]);for(let i=1;i<7;i++)assert(levels[i]>levels[i-1]);
r=run(()=>[0,3]);assert.equal(r.s.status,'out');assert.equal(r.s.outAt,'groups');console.log('éliminé groupes, rang',r.s.groupRank);
r=run(n=>n.stage==='qf'?[1,1]:[2,0]); console.log('nul en quart ->',r.s.status,r.s.outAt||'',r.s.ko.qf.find(m=>m.a==='bj'||m.b==='bj'));
r=run(n=>n.stage==='sf'?[0,1]:[2,0]);assert.equal(r.s.outAt,'sf');console.log('défaite demi -> out sf');
for(let i=0;i<300;i++){const x=run(()=>[Math.random()*3|0,Math.random()*3|0]);assert(['out','champion'].includes(x.s.status));}
console.log('300 Coupes aléatoires terminées OK');
