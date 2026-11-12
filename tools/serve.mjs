import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.wav':'audio/wav','.ogg':'audio/ogg','.mod':'application/octet-stream'};
http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))throw Error('Forbidden');
    const data=await fs.readFile(file);const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${data.length}`});res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));}
    else{res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);}
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT)||4185,'127.0.0.1',()=>console.log(`PacMac Deluxe: http://localhost:${Number(process.env.PORT)||4185}`));
