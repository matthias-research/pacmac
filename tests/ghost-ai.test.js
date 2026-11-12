import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseGhostDirection} from '../src/ghost-ai.js';
const all=['left','right','down','up'];
const ghost=(index,dir='right')=>({index,dir,x:5,y:5});
test('recovered red and green priorities diverge at an open junction',()=>{
 const target={x:10,y:10};
 assert.equal(chooseGhostDirection(ghost(0),target,all),'right');
 assert.equal(chooseGhostDirection(ghost(2),target,all),'down');
});
test('blue uses fixed non-reversing direction order before perpendicular pursuit',()=>{
 const target={x:0,y:0};
 assert.equal(chooseGhostDirection(ghost(0),target,all),'up');
 assert.equal(chooseGhostDirection(ghost(1),target,all),'right');
});
test('frightened ghosts prefer an escape turn and all colors share policy',()=>{
 for(let index=0;index<4;index++)assert.equal(chooseGhostDirection(ghost(index),{x:10,y:10},all,{frightened:true}),'up');
});
test('purple random selection excludes reversing unless it is the only exit',()=>{
 assert.equal(chooseGhostDirection(ghost(3),{x:5,y:5},all,{random:()=>0}),'right');
 assert.equal(chooseGhostDirection(ghost(3),{x:5,y:5},all,{random:()=>.999}),'up');
 assert.equal(chooseGhostDirection(ghost(3),{x:5,y:5},['left']),'left');
});
test('every recovered policy selects a passable neighbor for every exit combination',()=>{
 for(let index=0;index<4;index++)for(const dir of all)for(let mask=1;mask<16;mask++){
  const choices=all.filter((_,n)=>mask&(1<<n));
  for(const frightened of [false,true])assert(choices.includes(chooseGhostDirection(ghost(index,dir),{x:8,y:3},choices,{frightened,random:()=>.5})));
 }
});
