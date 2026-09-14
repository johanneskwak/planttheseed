import assert from 'node:assert/strict';
import {newGame,transition,aiAction,options,wealth} from '../newhabituslife/engine.mjs';
let steps=0;
for(let seed=1;seed<=150;seed++){
 let g=newGame(['A','B','C','D','E','F'].slice(0,2+seed%5),{seed,rounds:seed%2?8:12});
 let n=0;
 while(g.phase!=='done'&&n++<1000){g=transition(g,aiAction(g));steps++;for(const p of g.players){assert.ok(Number.isFinite(wealth(p)));assert.ok(p.cash>=0);assert.ok(p.health>=0&&p.health<=6);assert.ok(p.pos>=0&&p.pos<28);}}
 assert.equal(g.phase,'done');assert.equal(g.history.length,g.maxRounds);for(const p of g.players)assert.equal(p.choices.length,g.maxRounds);
}
let g=newGame(['A','B'],{seed:3});assert.throws(()=>transition(g,{actor:1,type:'roll'}));
g=transition(g,{actor:0,type:'roll'});assert.throws(()=>transition(g,{actor:0,type:'roll'}));
g.event={type:'care',variant:0};g.phase='choice';g.players[1].cash=300;
g=transition(g,{actor:0,type:'choose',value:'ask'});g=transition(g,{actor:0,type:'target',value:1});
assert.throws(()=>transition(g,{actor:0,type:'respond',value:'yes'}));const before=g.players[1].cash;
g=transition(g,{actor:1,type:'respond',value:'yes'});assert.equal(g.players[1].cash,before-60);assert.equal(g.players[1].help,1);assert.equal(g.phase,'result');
g.phase='vote';g.round=4;g.votes={};const revision=g.revision;
g=transition(g,{actor:0,type:'vote',value:'care',expected:revision,round:4});g=transition(g,{actor:1,type:'vote',value:'care',expected:revision,round:4});assert.deepEqual(g.policies,['care']);assert.equal(g.round,5);
g.phase='choice';g.event={type:'market'};g.players[0].cash=10;assert.throws(()=>transition(g,{actor:0,type:'choose',value:'home'}));
console.log(`PASS: 150 complete games, ${steps} validated actions; turn ownership, affordability, support consent and simultaneous votes.`);
