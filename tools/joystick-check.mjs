import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const endpoint=process.env.CDP_URL||'http://127.0.0.1:9247';
const targets=await fetch(endpoint+'/json').then(r=>r.json());
const target=targets.find(t=>t.type==='page'&&t.url.startsWith(process.env.CHECK_URL||'http://127.0.0.1:4185'));
assert.ok(target,'Open http://127.0.0.1:4185 in the debug browser first.');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function shot(name){await pause(100);const r=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(`analysis/browser/${name}.png`,Buffer.from(r.data,'base64'));}
try{
 await fs.mkdir('analysis/browser',{recursive:true});await send('Runtime.enable');await send('Page.enable');await send('Page.bringToFront');await send('Page.reload');
 for(let i=0;i<100;i++){if(await evaluate('!!window.pacmac'))break;await pause(100);}
 for(const mobile of [false,true]){
  await send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1280,height:mobile?844:900,deviceScaleFactor:1,mobile});
  await evaluate('pacmac.action("play")');await pause(100);
  const rect=await evaluate('(()=>{const r=document.querySelector("#joystick").getBoundingClientRect(),c=document.querySelector("#game").getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,boardRight:c.left+c.width*872/1024}})()');
  assert.ok(rect.x>rect.boardRight);assert.ok(rect.x+rect.w<=(mobile?390:1280));
  const points=[[.5,.1,'up'],[.9,.5,'right'],[.5,.9,'down'],[.1,.5,'left']];
  for(let i=0;i<points.length;i++){
   const [x,y,dir]=points[i];
   if(mobile)await send('Input.dispatchTouchEvent',{type:i?'touchMove':'touchStart',touchPoints:[{x:rect.x+x*rect.w,y:rect.y+y*rect.h,id:0}]});
   else await send('Input.dispatchMouseEvent',{type:i?'mouseMoved':'mousePressed',x:rect.x+x*rect.w,y:rect.y+y*rect.h,button:'left',buttons:1,clickCount:1});
   await pause(60);assert.equal(await evaluate('pacmac.game.player.next'),dir);
  }
  if(mobile)await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  else await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x,y:rect.y,button:'left',clickCount:1});
  assert.deepEqual(await evaluate('[...document.querySelector("#joystick circle").attributes].filter(a=>["cx","cy"].includes(a.name)).map(a=>Number(a.value))'),[100,100]);
  assert.equal(await evaluate('pacmac.game.player.next'),'left');
  await shot('joystick-'+(mobile?'mobile':'desktop'));
 }
 await evaluate('pacmac.action("home")');await pause(100);assert.ok(await evaluate('document.querySelector("#joystick").hidden'));
 console.log('Joystick checks passed: mouse/touch continuous four-way drag, release, desktop/mobile placement, menu visibility.');
}finally{await send('Emulation.clearDeviceMetricsOverride');ws.close();}
