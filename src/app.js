import {Game,DIRECTIONS,isFood,isPill,walkable} from './engine.js';
import {AudioEngine} from './audio.js';
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d'),hotspots=$('#hotspots'),dialog=$('#dialog');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let settings={speed:30,volume:.65,music:true,sound:true,waka:true,random:false,set:'Pac Levels',level:0,keys:{up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',pause:'p'},...read('pacmac.preferences',{})};
let scores=read('pacmac.scores',[]),custom=read('pacmac.custom',[]),assets,library,images={},view='title',hover='',buttons=[],ticks=0,gameTicks=0,accumulator=0,last=0,activeSet,activeLevel=0,editor=null,flash=[],menuVisible=false,currentMusic=2,dialogPaused=false;
const audio=new AudioEngine();
const game=new Game({onEvent:event});
const BOARD={x:152,y:112,size:36};
const musicNames=["'dlaczego?'",'4aces','UralVolga'];
const pad=(n,width=7)=>String(n).padStart(width,'0');
function sound(name){audio.playEffect(name);}
function startMusic(index){currentMusic=index;audio.setMusic(index);}
function event(e){
  switch(e.type){
    case 'level':sound('Begin Level');break;
    case 'food':if(!e.pill&&settings.waka)sound('WakaWaka');break;
    case 'pill':sound('Got Pill');break;
    case 'ghost':sound('Ghost Eaten');flash.push({text:String(e.points),x:BOARD.x+e.x*36+18,y:BOARD.y+e.y*36,time:1});break;
    case 'fruit':sound('Got Fruit');flash.push({text:String(e.points),x:BOARD.x+e.x*36+18,y:BOARD.y+e.y*36,time:2.5});break;
    case 'fruitAppears':sound('Fruit Appears');break;
    case 'life':sound('New Life');break;
    case 'death':sound('Pac Dying');break;
    case 'complete':sound('Lovely Tune');break;
    case 'gameover':sound('Game Over');recordScore();break;
    case 'next':if(editor?.testing){editor.testing=false;view='editor';buildButtons();}else nextLevel();break;
  }
}
function textWidth(text,size=18){const f=assets?.fonts?.[String(size)];if(!f)return text.length*size*.55;return [...String(text)].reduce((w,c)=>w+(f.glyphs[c.codePointAt(0)]?.advance??size*.45),0);}
function text(str,x,y,size=18,color='white',align='left'){
  str=String(str).replace(/[–—·]/g,'-').replace(/[’‘]/g,"'");const f=assets?.fonts?.[String(size)];
  if(align==='center')x-=textWidth(str,size)/2;else if(align==='right')x-=textWidth(str,size);
  if(f&&images[f.image]){
    // Font resources contain the original antialiased glyphs. Red variants are recovered separately when available.
    const red=assets.fonts[String(Number(size)+1)];const font=color==='red'&&red?red:f;const image=images[font.image]||images[f.image];
    for(const c of str){const g=font.glyphs[c.codePointAt(0)]||font.glyphs['63'];if(g){ctx.drawImage(image,g.x,g.y,g.w,g.h,Math.round(x),Math.round(y),g.w,g.h);x+=g.advance;}else x+=size*.45;}
  }else{ctx.fillStyle=color;ctx.font=`bold ${size}px Arial`;ctx.textBaseline='top';ctx.fillText(str,x,y);}
}
function sprite(type,id,x,y,size){const sheet=assets?.sprites[type],s=sheet?.ids[id];if(s&&images[sheet.image])ctx.drawImage(images[sheet.image],s.x,s.y,s.w,s.h,Math.round(x),Math.round(y),size||s.w,size||s.h);}
function animation(name,x,y,time=(view==='game'?gameTicks:ticks),loop=true){
  const a=assets.animations[name];if(!a)return false;
  const n=Math.floor(time*(a.fps||12));const frame=a.frames[loop?n%a.frames.length:Math.min(a.frames.length-1,n)];
  if(frame){if(frame.main>=0)sprite('Sprb',frame.main,x,y,36);if(frame.overlay>=0)sprite('Sprb',frame.overlay,x,y,36);}return true;
}
function button(label,x,y,size,action,width){const w=width||textWidth(label,size)+20;buttons.push({label,x:x-w/2,y:y-3,w,h:size+14,size,action,textX:x,textY:y});}
function buildButtons(){
  buttons=[];
  if(view==='title'){
    ['Play The Game','Hall Of Fame','Set Preferences','Level Editor','About PacMac Deluxe','Quit'].forEach((label,i)=>button(label,512,326+i*57,36,['play','scores','preferences','editor','about','quit'][i]));
  }else if(view==='editor'){
    [['New','editorNew'],['Undo','editorUndo'],['Save','editorSave'],['Test','editorTest'],['Export','editorExport'],['Import','editorImport'],['Done','editorDone']].forEach(([label,action],i)=>button(label,820,145+i*52,18,action,130));
  }else if(view==='scores'||view==='about'||view==='quit')button('Main Menu',512,685,30,'home');
  hotspots.replaceChildren();
  for(const b of buttons){const el=document.createElement('button');el.className='hotspot';el.textContent=b.label;el.setAttribute('aria-label',b.label);el.style.cssText=`left:${b.x/10.24}%;top:${b.y/7.68}%;width:${b.w/10.24}%;height:${b.h/7.68}%`;el.addEventListener('click',()=>action(b.action));el.addEventListener('pointerenter',()=>hover=b.action);el.addEventListener('pointerleave',()=>hover='');el.addEventListener('focus',()=>hover=b.action);el.addEventListener('blur',()=>hover='');hotspots.append(el);}
}
function renderTitle(){
  if(images['assets/title-0.png'])ctx.drawImage(images['assets/title-0.png'],326,64);
  else text('PacMac Deluxe',512,61,36,'white','center');
  text('Version 1.3',512,205,14,'white','center');
  text('2,332 levels - 117 level files',512,224,14,'white','center');
  for(const b of buttons)text(b.label,b.textX,b.textY,b.size,hover===b.action?'red':'white','center');
  text('Press space to show the menu bar.',512,730,14,'red','center');
  text(settings.music?`Now playing "${musicNames[currentMusic]}", STrk file.`:'Music off',512,746,14,'red','center');
}
function drawTiles(tiles,x=BOARD.x,y=BOARD.y,size=36){for(let i=0;i<300;i++){const t=tiles[i];if(t){sprite('Sprb',3999+t,x+(i%20)*size,y+Math.floor(i/20)*size,size);}}}
function renderGame(){
  text(settings.music?`Now playing "${musicNames[currentMusic]}", STrk file.`:'',512,2,14,'red','center');
  if(game.state!=='complete'||Math.floor(ticks*6)%2===0)drawTiles(game.tiles);
  if(game.fruit){const names=['Grape','Melon','Apple','Raspberry'];const name=names[game.fruit.kind%4],fading=game.fruit.remaining<game.fruit.fade;animation(name+(fading?' Fade':' Normal'),BOARD.x+game.fruit.x*36,BOARD.y+game.fruit.y*36,fading?game.fruit.fade-game.fruit.remaining:gameTicks,!fading);}
  const suffix={up:'UP',down:'DN',left:'LF',right:'RT'};
  for(const g of game.ghosts){
    let name=g.state==='eyes'?'Eyes '+suffix[g.dir]:g.state==='house'?g.name+' In Box':g.name+' '+suffix[g.dir]+(game.power&&g.state==='active'?' Stoned':'');
    if(game.power>0&&game.power<1.5&&g.state==='active')name=g.name+' Stone End';
    if(!animation(name,BOARD.x+g.x*36,BOARD.y+g.y*36))animation(g.name+' '+suffix[g.dir],BOARD.x+g.x*36,BOARD.y+g.y*36);
  }
  const p=game.player;
  if(game.state==='dying'){
    if(!animation('Pac Dying',BOARD.x+p.x*36,BOARD.y+p.y*36,40/15-game.phaseTime,false)){ctx.globalAlpha=Math.max(0,game.phaseTime/(40/15));animation('Pac '+suffix[p.dir],BOARD.x+p.x*36,BOARD.y+p.y*36);ctx.globalAlpha=1;}
  }else animation(p.moving?'Pac '+suffix[p.dir]:'Pac Stopped',BOARD.x+p.x*36,BOARD.y+p.y*36);
  let levelLabel=`Level ${game.levelNumber}, "${game.setName}"`;
  if(textWidth(levelLabel,18)>248){while(textWidth(levelLabel+'...',18)>248)levelLabel=levelLabel.slice(0,-1);levelLabel+='...';}
  const foodX=BOARD.x+24+textWidth(levelLabel,18);
  text(levelLabel,BOARD.x+4,654,18);
  text(`Food: ${String(game.totalFood?Math.round(game.food/game.totalFood*100):0).padStart(3,'0')}%`,foodX,654,18);
  text(`Lives: ${String(game.lives).padStart(2,'0')}`,foodX+102,654,18);
  text(`High: ${pad(Math.max(10000,...scores.map(s=>s.score),game.score))}  Score: ${pad(game.score)}`,BOARD.x+720,654,18,'white','right');
  const title={ready:'Get Ready',paused:'Paused',complete:'Well Done!',gameover:'Game Over'}[game.state];if(title)text(title,512,352,30,'white','center');
  if(game.state==='paused')text('Press P to resume',512,391,14,'white','center');
  if(game.state==='gameover')text('Press Enter to play again',512,393,18,'white','center');
  for(const f of flash)text(f.text,f.x,f.y,18,'white','center');
  if(editor?.testing)text('Testing level · Esc returns to editor',512,730,14,'red','center');
}
function renderScores(){text('Hall Of Fame',512,65,36,'white','center');text('Name',250,170,18);text('Score',750,170,18,'white','right');const rows=scores.length?scores:[{name:'DAPPSoft',score:10000,level:1}];rows.slice(0,10).forEach((s,i)=>{text(`${i+1}.  ${s.name}`,250,215+i*39,18);text(pad(s.score),750,215+i*39,18,'white','right');});for(const b of buttons)text(b.label,b.textX,b.textY,b.size,hover===b.action?'red':'white','center');}
function renderAbout(){text('PacMac Deluxe',512,65,36,'white','center');const lines=['© 1996–99 DAPPSoft. All Rights Reserved.','','Dario Accornero — CodeMeister','Giuseppe Sciacchitano — GraphMeister','Alessio Saitta & Piero Zardo — Concept & Levels','Alessandro Calvi — Levels','','Eat every coloured dot to complete the maze.','Pills let you eat ghosts for up to seven seconds.','Eat consecutive ghosts for increasing points.','','Arrow keys: move     P: pause     Esc: abort','Space: menus     Enter: new game','','Original graphics, sounds, music and mazes.','JavaScript recreation of the classic Macintosh game.'];lines.forEach((s,i)=>text(s,512,150+i*29,18,'white','center'));for(const b of buttons)text(b.label,b.textX,b.textY,b.size,hover===b.action?'red':'white','center');}
function renderEditor(){
  text('Level Editor',512,25,30,'white','center');text(editor.name,110,85,18);drawTiles(editor.tiles,110,120,28);
  ctx.strokeStyle='#292929';ctx.lineWidth=1;for(let x=0;x<=20;x++){ctx.beginPath();ctx.moveTo(110+x*28,120);ctx.lineTo(110+x*28,540);ctx.stroke();}for(let y=0;y<=15;y++){ctx.beginPath();ctx.moveTo(110,120+y*28);ctx.lineTo(670,120+y*28);ctx.stroke();}
  for(let t=0;t<81;t++){const x=110+(t%20)*28,y=575+Math.floor(t/20)*28;if(t)sprite('Sprb',3999+t,x,y,28);if(t===editor.tile){ctx.strokeStyle='red';ctx.strokeRect(x,y,28,28);}}
  for(const b of buttons)text(b.label,b.textX,b.textY,b.size,hover===b.action?'red':'white','center');
  text(`Tile: ${editor.tile} · ${editor.tiles.filter(isFood).length} food · Alt-click to pick a tile`,110,730,14);text('Draw with mouse or touch. Right-click erases.',110,747,14);
}
function render(){ctx.fillStyle='#000';ctx.fillRect(0,0,1024,768);if(view==='title')renderTitle();else if(view==='game')renderGame();else if(view==='scores')renderScores();else if(view==='about')renderAbout();else if(view==='editor')renderEditor();else if(view==='quit'){text('Thanks for playing!',512,310,36,'white','center');for(const b of buttons)text(b.label,b.textX,b.textY,b.size,hover===b.action?'red':'white','center');}}
function frame(now){const elapsed=Math.min((now-last)/1000||0,.1);last=now;ticks+=elapsed;if(view==='game'&&game.state!=='paused'&&!dialog.open)gameTicks+=elapsed;if(view==='game'&&!dialog.open){accumulator+=elapsed*(settings.speed/30);while(accumulator>=1/120){game.update(1/120,1/120/(settings.speed/30));accumulator-=1/120;}}else accumulator=0;flash=flash.filter(f=>(f.time-=elapsed)>0);render();requestAnimationFrame(frame);}
function allSets(){return [...library.sets,...custom.map(s=>({...s,custom:true}))];}
function play(){activeSet=allSets().find(s=>s.name===settings.set)||library.sets.find(s=>s.name==='Pac Levels')||library.sets[0];activeLevel=Math.min(settings.level,activeSet.levels.length-1);if(settings.random){activeSet=allSets()[Math.floor(Math.random()*allSets().length)];activeLevel=Math.floor(Math.random()*activeSet.levels.length);}view='game';editor=null;game.start(activeSet.levels[activeLevel],{setName:activeSet.name,levelNumber:activeLevel+1});startMusic(0);buildButtons();}
function nextLevel(){if(settings.random){activeSet=allSets()[Math.floor(Math.random()*allSets().length)];activeLevel=Math.floor(Math.random()*activeSet.levels.length);}else if(++activeLevel>=activeSet.levels.length){const sets=allSets();activeSet=sets[(sets.indexOf(activeSet)+1)%sets.length];activeLevel=0;}game.start(activeSet.levels[activeLevel],{setName:activeSet.name,levelNumber:activeLevel+1,fresh:false});}
function home(){view='title';editor=null;game.state='menu';startMusic(2);buildButtons();}
function recordScore(){
  if(editor?.testing||game.score===0)return;
  const entry={name:read('pacmac.player','Player'),score:game.score,level:game.levelNumber,date:new Date().toISOString()};
  scores.push(entry);scores.sort((a,b)=>b.score-a.score);scores=scores.slice(0,10);save('pacmac.scores',scores);
  if(scores.includes(entry))showDialog('Hall Of Fame',`<p>Your score: <strong>${pad(entry.score)}</strong></p><label>Your name <input id="player-name" maxlength="24" value="${escapeHTML(entry.name)}" autocomplete="off"></label>`,[{label:'Save',run:()=>{entry.name=$('#player-name').value.trim()||'Player';save('pacmac.player',entry.name);save('pacmac.scores',scores);}}]);
}
function showDialog(title,html,actions=[{label:'OK',run:()=>{}}]){dialogPaused=true;$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;$('#dialog-buttons').replaceChildren();actions.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.textContent=a.label;if(i===actions.length-1)b.className='primary';b.onclick=()=>{if(a.run?.()===false)return;dialog.close();dialogPaused=false;};$('#dialog-buttons').append(b);});dialog.showModal();}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function preferences(){
  showDialog('Set Preferences',`<div class="columns"><section><strong>Game Keys</strong>${['left','right','down','up','pause'].map(k=>`<label class="field">${k[0].toUpperCase()+k.slice(1)} <input data-key="${k}" value="${escapeHTML(settings.keys[k])}" readonly aria-label="${k} key"></label>`).join('')}<p class="notice">Select a key field, then press the preferred key.</p></section><section><strong>Sound &amp; Music</strong><label><input id="pref-music" type="checkbox" ${settings.music?'checked':''}> Music in game</label><label><input id="pref-sound" type="checkbox" ${settings.sound?'checked':''}> Sound effects</label><label><input id="pref-waka" type="checkbox" ${settings.waka?'checked':''}> WakaWaka</label><label>Volume <input id="pref-volume" type="range" min="0" max="100" value="${settings.volume*100}"></label><label>Game Speed: <output id="speed-value">${settings.speed}</output> fps<input id="pref-speed" type="range" min="25" max="100" value="${settings.speed}"></label><p class="small">Normal: 30 fps · Turbo: 60 fps</p></section></div>`,[{label:'Cancel'},{label:'OK',run:()=>{settings.music=$('#pref-music').checked;settings.sound=$('#pref-sound').checked;settings.waka=$('#pref-waka').checked;settings.volume=+$('#pref-volume').value/100;settings.speed=+$('#pref-speed').value;for(const input of dialog.querySelectorAll('[data-key]'))settings.keys[input.dataset.key]=input.value;saveSettings();}}]);
  $('#pref-speed').oninput=e=>$('#speed-value').value=e.target.value;
  for(const input of dialog.querySelectorAll('[data-key]'))input.onkeydown=e=>{e.preventDefault();e.stopPropagation();if(!['Escape','Enter',' ','Tab'].includes(e.key))input.value=e.key;};
}
function saveSettings(){save('pacmac.preferences',settings);audio.setSettings(settings);}
function levelDialog(){const sets=allSets();showDialog('Choose Starting Level',`<label>Level file<select id="level-set">${sets.map(s=>`<option value="${escapeHTML(s.name)}" ${s.name===settings.set?'selected':''}>${escapeHTML(s.name)} (${s.levels.length})</option>`).join('')}</select></label><label>Starting level <input id="level-number" type="number" min="1" value="${settings.level+1}"></label><canvas id="level-preview" width="560" height="420"></canvas><label><input id="level-random" type="checkbox" ${settings.random?'checked':''}> Random play across all level files</label>`,[{label:'Cancel'},{label:'Play',run:()=>{settings.set=$('#level-set').value;const set=sets.find(s=>s.name===settings.set);settings.level=Math.max(0,Math.min(set.levels.length-1,(+$('#level-number').value||1)-1));settings.random=$('#level-random').checked;saveSettings();play();}}]);
  const preview=()=>{const set=sets.find(s=>s.name===$('#level-set').value);$('#level-number').max=set.levels.length;const index=Math.max(0,Math.min(set.levels.length-1,(+$('#level-number').value||1)-1));const c=$('#level-preview').getContext('2d');c.fillStyle='#000';c.fillRect(0,0,560,420);const sheet=assets.sprites.Sprb;set.levels[index].forEach((t,i)=>{const s=sheet.ids[3999+t];if(t&&s)c.drawImage(images[sheet.image],s.x,s.y,s.w,s.h,(i%20)*28,Math.floor(i/20)*28,28,28);});};$('#level-set').onchange=preview;$('#level-number').oninput=preview;preview();
}
function openEditor(){editor={name:'My Levels',tiles:[...(activeSet?.levels[activeLevel]||library.sets.find(s=>s.name==='Pac Levels').levels[0])],tile:47,undo:[],testing:false};view='editor';buildButtons();}
function download(name,contents){const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function action(name){audio.unlock();for(const d of document.querySelectorAll('details'))d.open=false;
  switch(name){
    case 'play':play();break;case 'home':home();break;case 'pause':game.pause();break;
    case 'abort':if(editor?.testing){editor.testing=false;view='editor';buildButtons();}else home();break;
    case 'preferences':preferences();break;case 'levels':levelDialog();break;case 'random':settings.random=!settings.random;saveSettings();levelDialog();break;
    case 'scores':view='scores';startMusic(1);buildButtons();break;case 'about':view='about';buildButtons();break;case 'quit':view='quit';audio.stopMusic();buildButtons();break;
    case 'music':settings.music=!settings.music;saveSettings();break;case 'sound':settings.sound=!settings.sound;saveSettings();break;case 'nextMusic':startMusic((currentMusic+1)%3);break;
    case 'fullscreen':if(document.fullscreenElement)document.exitFullscreen();else $('#screen').requestFullscreen?.();break;
    case 'menu':menuVisible=!menuVisible;$('#menubar').hidden=!menuVisible;break;
    case 'editor':openEditor();break;
    case 'editorUndo':if(editor.undo.length)editor.tiles=editor.undo.pop();break;
    case 'editorNew':editor.undo.push([...editor.tiles]);editor.tiles=Array(300).fill(0);for(const [i,t] of [[129,0],[130,0],[131,45],[149,0],[150,0],[151,45]])editor.tiles[i]=t;break;
    case 'editorSave':showDialog('Save Level File',`<label>Name <input id="custom-name" value="${escapeHTML(editor.name)}" maxlength="40"></label><p class="small">Saved in this browser. Export a copy to keep a separate backup.</p>`,[{label:'Cancel'},{label:'Save',run:()=>{editor.name=$('#custom-name').value.trim()||'My Levels';const set={name:editor.name,author:'You',levels:[[...editor.tiles]],count:1};const index=custom.findIndex(s=>s.name===set.name);if(index<0)custom.push(set);else custom[index]=set;save('pacmac.custom',custom);}}]);break;
    case 'editorTest':if(!editor.tiles.some(isFood)){showDialog('No food in this level','<p>Add dots or pills before testing.</p>');break;}editor.testing=true;view='game';game.start(editor.tiles,{setName:editor.name});buildButtons();break;
    case 'editorDone':home();break;
    case 'editorExport':download(editor.name+'.json',JSON.stringify({name:editor.name,width:20,height:15,levels:[editor.tiles]},null,2));break;
    case 'editorImport':showDialog('Import Level File','<input id="import-file" type="file" accept=".json,application/json"><p id="import-error" class="notice"></p>',[{label:'Cancel'},{label:'Import',run:()=>{const f=$('#import-file').files[0];if(!f)return false;f.text().then(raw=>{const d=JSON.parse(raw);if(!Array.isArray(d.levels)||!d.levels.length||!d.levels.every(l=>Array.isArray(l)&&l.length===300&&l.every(t=>Number.isInteger(t)&&t>=0&&t<=80)))throw Error('Expected 300 tile values (0–80) per level.');editor.undo.push([...editor.tiles]);editor.tiles=[...d.levels[0]];editor.name=String(d.name||'Imported Levels').slice(0,40);dialog.close();}).catch(e=>$('#import-error').textContent=e.message);return false;}}]);break;
  }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)action(b.dataset.action);});
document.addEventListener('keydown',e=>{
  if(dialog.open)return;
  const key=e.key;
  if(key===' '){e.preventDefault();if(!e.repeat)action('menu');return;}
  if(key==='Escape'){e.preventDefault();action('abort');return;}
  if(key==='Enter'&&!e.target.closest('button,summary')){e.preventDefault();if(view!=='game'||game.state==='gameover')action('play');return;}
  if(key.toLowerCase()===settings.keys.pause.toLowerCase()){e.preventDefault();if(!e.repeat)game.pause();return;}
  const dir=Object.keys(DIRECTIONS).find(d=>settings.keys[d]===key)||({w:'up',a:'left',s:'down',d:'right'})[key.toLowerCase()];
  if(dir){e.preventDefault();audio.unlock();if(view==='game')game.direction(dir);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&view==='game'&&game.state==='playing')game.pause();});
for(const b of document.querySelectorAll('[data-dir]'))b.addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();game.direction(b.dataset.dir);});
let drawing=false;
function paint(e){if(view!=='editor'||dialog.open)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*1024/r.width,y=(e.clientY-r.top)*768/r.height;if(x>=110&&x<670&&y>=575&&y<715){const t=Math.floor((y-575)/28)*20+Math.floor((x-110)/28);if(t<=80)editor.tile=t;return;}if(x>=110&&x<670&&y>=120&&y<540){const i=Math.floor((y-120)/28)*20+Math.floor((x-110)/28);if(e.altKey)editor.tile=editor.tiles[i];else editor.tiles[i]=e.buttons===2?0:editor.tile;}}
canvas.addEventListener('pointerdown',e=>{audio.unlock();if(view==='editor'){drawing=true;editor.undo.push([...editor.tiles]);if(editor.undo.length>30)editor.undo.shift();canvas.setPointerCapture(e.pointerId);paint(e);}});canvas.addEventListener('pointermove',e=>{if(drawing)paint(e);});canvas.addEventListener('pointerup',()=>drawing=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
dialog.addEventListener('close',()=>dialogPaused=false);
async function init(){
  if(globalThis.__PACMAC_BUNDLE__){assets=globalThis.__PACMAC_BUNDLE__.assets;library=globalThis.__PACMAC_BUNDLE__.levels;}
  else [assets,library]=await Promise.all(['data/assets.json','data/levels.json'].map(p=>fetch(p).then(r=>{if(!r.ok)throw Error('Could not load '+p);return r.json();})));
  const urls=new Set([...Object.values(assets.sprites).map(s=>s.image),...Object.values(assets.fonts||{}).map(f=>f.image),'assets/title-0.png']);
  await Promise.all([...urls].map(url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[url]=img;resolve();};img.onerror=()=>reject(Error('Could not load '+url));img.src=globalThis.__PACMAC_BUNDLE__?.files[url]||url;})));
  if(audio.load)await audio.load(assets.sounds);audio.setSettings(settings);startMusic(2);$('#loading').remove();buildButtons();requestAnimationFrame(frame);
  window.pacmac={game,assets,library,action,getState:()=>({view,settings,score:game.score,lives:game.lives,state:game.state,player:game.player,food:game.food}),startLevel:(tiles)=>{view='game';game.start(tiles);buildButtons();},editor:()=>editor};
}
init().catch(e=>{$('#loading').textContent='Unable to load PacMac Deluxe. '+e.message;console.error(e);});



