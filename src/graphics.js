// Source rectangles remain in original pixels; only bitmap sampling is scaled.
export class BitmapGraphics {
  constructor(report,files={}){this.report=report;this.files=files;this.images={};this.mode='enhanced';this.variants=new Map(report.images.map(row=>[row.source,row]));}
  get scale(){return this.mode==='enhanced'?2:1;}
  async load(){
    const paths=new Set(this.report.images.flatMap(row=>[row.source,row.image]));
    await Promise.all([...paths].map(path=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{this.images[path]=image;resolve();};image.onerror=()=>reject(Error('Could not load '+path));image.src=this.files[path]||path;})));
  }
  setMode(mode){if(!['original','enhanced'].includes(mode))throw Error('Unknown graphics mode: '+mode);this.mode=mode;this.onChange?.();return mode;}
  draw(context,path,sx,sy,sw,sh,dx,dy,dw,dh){const variant=this.mode==='enhanced'&&this.variants.get(path),scale=variant?variant.scale:1;context.drawImage(this.images[variant?variant.image:path],sx*scale,sy*scale,sw*scale,sh*scale,dx,dy,dw,dh);}
  prepare(canvas,width,height){const scale=this.scale;if(canvas.width!==width*scale||canvas.height!==height*scale){canvas.width=width*scale;canvas.height=height*scale;}canvas.style.imageRendering=scale===1?'pixelated':'auto';const context=canvas.getContext('2d');context.setTransform(scale,0,0,scale,0,0);context.imageSmoothingEnabled=false;return context;}
}
