import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
class FakeAudio {
 constructor(){this.paused=true;this.volume=1;this.src='';}
 addEventListener(){} load(){} pause(){this.paused=true;}
 async play(){this.paused=false;}
}
let starts=0,stops=0;
class FakeContext {
 constructor(){this.currentTime=1;this.destination={};}
 createGain(){return {gain:{value:1,setTargetAtTime(){}},connect(){}};}
 decodeAudioData(bytes){assert(bytes.byteLength>44);return Promise.resolve({});}
 createBufferSource(){return {connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}
 async resume(){}
}
globalThis.Audio=FakeAudio;globalThis.AudioContext=FakeContext;
globalThis.fetch=async path=>({ok:true,arrayBuffer:async()=>{const b=await fs.readFile(path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
const {AudioEngine}=await import('../src/audio.js');
const manifest=JSON.parse(await fs.readFile('data/assets.json','utf8'));
const audio=new AudioEngine();await audio.load(manifest.sounds);
assert.equal(audio.effects.size,12);
audio.setMusic(2);assert(audio.music.paused,'must not autoplay before gesture');
audio.unlock();await Promise.resolve();assert(!audio.music.paused);
await audio.playEffect('Got Fruit');assert.equal(starts,1);
audio.setSettings({sound:false,music:false});assert(audio.music.paused);assert.equal(stops,1);
await audio.playEffect('Got Fruit');assert.equal(starts,1);
audio.setSettings({sound:true,waka:false});await audio.playEffect('WakaWaka');assert.equal(starts,1);
audio.setSettings({waka:true});await audio.playEffect('WakaWaka');await audio.playEffect('WakaWaka');assert.equal(starts,2,'eating sound is rate limited');
audio.setSettings({music:true,volume:4});assert.equal(audio.settings.volume,1);assert(!audio.music.paused);
audio.stopMusic();assert(audio.music.paused);audio.unlock();assert(audio.music.paused,'quit must not restart music');
audio.setMusic(0);assert(!audio.music.paused);assert(audio.music.src.endsWith('dlaczego.ogg'));
await audio.playEffect('missing');assert.equal(starts,2);
console.log('Audio tests passed: 12 original effects load; autoplay, mute, volume, eating throttle, and music transitions.');
