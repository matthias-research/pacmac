import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFile(path.join(root,p),'utf8');
const assets=JSON.parse(await read('data/assets.json')),levels=JSON.parse(await read('data/levels.json'));
const graphics=JSON.parse(await read('data/enhanced.json'));
const files={};
async function pack(dir){for(const entry of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+entry.name;if(entry.isDirectory())await pack(name);else if(/\.(png|ogg|wav)$/.test(name)){const mime={'.png':'image/png','.ogg':'audio/ogg','.wav':'audio/wav'}[path.extname(name)];files[name]=`data:${mime};base64,${(await fs.readFile(path.join(root,name))).toString('base64')}`;}}}
await pack('assets');
const modules=await Promise.all(['src/ghost-ai.js','src/engine.js','src/audio.js','src/joystick.js','src/graphics.js','src/app.js'].map(read));
const code=modules.map(s=>s.replace(/^import .*?;\s*$/gm,'').replace(/\bexport (?=(const|class|function)\b)/g,'')).join('\n');
let html=await read('index.html');html=html.replace('<link rel="stylesheet" href="styles.css">',`<style>${await read('styles.css')}</style>`);
const script=`globalThis.__PACMAC_BUNDLE__=${JSON.stringify({assets,levels,graphics,files})};\n${code}`.replace(/<\/script/gi,'<\\/script');
html=html.replace('<script type="module" src="src/app.js"></script>',()=>`<script type="module">${script}</script>`);
await fs.mkdir(path.join(root,'dist'),{recursive:true});await fs.writeFile(path.join(root,'dist','PacMac Deluxe.html'),html);
await fs.mkdir(path.join(root,'dist','site'),{recursive:true});await fs.writeFile(path.join(root,'dist','site','index.html'),html);
console.log(`Built dist/PacMac Deluxe.html (${(Buffer.byteLength(html)/1048576).toFixed(1)} MB), fully self-contained.`);
