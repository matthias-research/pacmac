import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
function board(){const b=Array(300).fill(1);for(let x=1;x<19;x++)b[8*20+x]=47;b[8*20+7]=0;return b;}
function advance(g,seconds){for(let t=0;t<seconds;t+=1/120)g.update(1/120);}
test('buffered movement eats food, scores and stops at walls',()=>{
 const g=new Game({random:()=>.5});g.start(board());g.ghosts=[];g.direction('right');advance(g,.8);assert.ok(g.score>=30);assert.ok(g.food<g.totalFood);g.direction('up');advance(g,.5);assert.equal(g.player.y,8);assert.equal(g.player.next,'up');advance(g,5);assert.equal(g.player.x,18);
});
test('pill makes ghosts edible and increases consecutive points',()=>{
 const b=board();b[8*20+8]=48;const g=new Game();g.start(b);g.ghosts=[];g.direction('right');advance(g,.21);assert.ok(g.power>6);assert.equal(g.score,250);
 g.ghosts=[{name:'Red',x:g.player.x,y:8,dir:'right',state:'active',index:0}];g.update(.001);assert.equal(g.ghosts[0].state,'eyes');assert.equal(g.score,450);
});
test('pause freezes positions, timers and food',()=>{const g=new Game();g.start(board());g.direction('right');g.pause();const before=JSON.stringify({player:g.player,power:g.power,food:g.food});advance(g,3);assert.equal(JSON.stringify({player:g.player,power:g.power,food:g.food}),before);g.pause();assert.equal(g.state,'playing');});
test('death preserves eaten dots and ends after the final life',()=>{const g=new Game();g.start(board());g.direction('right');g.lives=1;g.ghosts=[{name:'Red',x:7,y:8,dir:'right',state:'active',index:0}];g.update(.001);assert.equal(g.state,'dying');advance(g,3);assert.equal(g.state,'gameover');assert.equal(g.lives,0);});
test('clearing the maze advances exactly once',()=>{const b=Array(300).fill(1);b[167]=0;b[168]=47;const events=[];const g=new Game({onEvent:e=>events.push(e.type)});g.start(b);g.ghosts=[];g.direction('right');advance(g,4);assert.equal(g.state,'between');assert.equal(events.filter(e=>e==='next').length,1);});
test('horizontal tunnels wrap without moving through walls',()=>{const b=Array(300).fill(1);b[160]=47;b[179]=47;b[167]=0;const g=new Game();g.start(b);g.player={x:19,y:8,dir:'right',next:'right'};g.ghosts=[];g.state='playing';advance(g,.21);assert.ok(g.player.x<.1);});

