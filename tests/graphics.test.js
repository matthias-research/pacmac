import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BitmapGraphics} from '../src/graphics.js';
const report=JSON.parse(fs.readFileSync(new URL('../data/enhanced.json',import.meta.url)));
test('enhanced collection covers every bitmap and preserves original files',()=>{
  const originals=fs.readdirSync(new URL('../assets/',import.meta.url)).filter(p=>p.endsWith('.png')).map(p=>'assets/'+p).sort();
  assert.deepEqual(report.images.map(r=>r.source).sort(),originals);
  for(const row of report.images)for(const [path,hash,size] of [[row.source,row.sourceSha256,row.sourceSize],[row.image,row.outputSha256,row.outputSize]]){
    const bytes=fs.readFileSync(new URL('../'+path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
    assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],size);
    assert.deepEqual(row.outputSize,row.sourceSize.map(n=>n*2));
  }
});
test('switching graphics scales source sampling but preserves logical placement',()=>{
  const graphics=new BitmapGraphics(report),row=report.images[0];graphics.images[row.source]='original';graphics.images[row.image]='enhanced';
  let args;const context={drawImage:(...a)=>args=a};
  graphics.draw(context,row.source,7,11,28,28,100,200,36,36);
  assert.deepEqual(args,['enhanced',14,22,56,56,100,200,36,36]);
  graphics.setMode('original');graphics.draw(context,row.source,7,11,28,28,100,200,36,36);
  assert.deepEqual(args,['original',7,11,28,28,100,200,36,36]);
  assert.throws(()=>graphics.setMode('unknown'));assert.equal(graphics.mode,'original');
});
