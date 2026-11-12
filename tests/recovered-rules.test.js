import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,FOOD_POINTS,walkable} from '../src/engine.js';
test('all original valid levels and tile graphics are present',()=>{
 const levels=JSON.parse(fs.readFileSync(new URL('../data/levels.json',import.meta.url))),assets=JSON.parse(fs.readFileSync(new URL('../data/assets.json',import.meta.url)));
 assert.equal(levels.sets.length,117);assert.equal(levels.sets.reduce((n,s)=>n+s.levels.length,0),2332);
 for(const set of levels.sets)for(const level of set.levels){assert.equal(level.length,300);assert.ok(level.some(t=>FOOD_POINTS[t]));for(const t of level)assert.ok(t===0||assets.sprites.Sprb.ids[3999+t]);}
});
test('decompiled tile semantics distinguish decorative walls, ghost doors and coloured food',()=>{
 for(let t=0;t<=80;t++)assert.equal(walkable(t),t===0||Object.hasOwn(FOOD_POINTS,t));
 assert.equal(walkable(45,true),true);assert.equal(walkable(49),false);assert.equal(walkable(75),false);
 const g=new Game();const b=Array(300).fill(0);b[0]=47;g.start(b);
 for(const [tile,points] of Object.entries(FOOD_POINTS)){g.tiles[167]=+tile;g.food=2;const before=g.score;g.consume();assert.equal(g.score-before,points);}
});
test('bonus lives follow original 10000,50000,100000 thresholds',()=>{
 const g=new Game();g.start(Array(300).fill(47));g.addScore(9990);assert.equal(g.lives,5);g.addScore(10);assert.equal(g.lives,6);assert.equal(g.nextLife,50000);g.addScore(40000);assert.equal(g.lives,7);assert.equal(g.nextLife,100000);g.addScore(50000);assert.equal(g.lives,8);
});
test('pill duration uses real clock time even at turbo gameplay speed',()=>{
 const g=new Game();g.start(Array(300).fill(47));g.ghosts=[];g.state='playing';g.power=7;
 for(let i=0;i<360;i++)g.update(1/60,1/120);
 assert.ok(Math.abs(g.power-4)<1e-9);
});
test('original quarter-tile overlap collision catches aligned actors',()=>{
 const g=new Game();g.start(Array(300).fill(47));g.state='playing';g.player={x:7,y:8,dir:'right',next:'right'};g.ghosts=[{x:7.7,y:8,dir:'right',state:'active',index:0}];g.update(1/120);assert.equal(g.state,'dying');
});
