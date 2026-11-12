import {chooseGhostDirection} from './ghost-ai.js';
export const WIDTH=20,HEIGHT=15;
export const DIRECTIONS={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}};
const opposite={left:'right',right:'left',up:'down',down:'up'};
export const isFood=t=>t===46||t===47||t===48||(t>=76&&t<=80);
export const isPill=t=>t===46||t===48||t===76;
// Recovered from original 68K CODE2 FUN_257a (food consumption).
export const FOOD_POINTS={46:100,47:10,48:250,76:400,77:15,78:20,79:25,80:30};
export const walkable=(t,ghost=false)=>t===0||isFood(t)||(ghost&&t===45);
export class Game {
  constructor({onEvent=()=>{},random=Math.random}={}){this.onEvent=onEvent;this.random=random;this.state='menu';this.score=0;this.lives=5;this.time=0;this.levelNumber=1;this.tiles=[];}
  event(type,data={}){this.onEvent({type,...data});}
  start(tiles,{setName='Pac Levels',levelNumber=1,fresh=true}={}){
    if(!Array.isArray(tiles)||tiles.length!==300)throw Error('A level must contain 300 cells.');
    this.tiles=[...tiles];this.original=[...tiles];this.setName=setName;this.levelNumber=levelNumber;
    if(fresh){this.score=0;this.lives=5;this.nextLife=10000;this.time=0;}
    this.totalFood=this.tiles.filter(isFood).length;this.food=this.totalFood;this.fruit=null;this.fruitTimer=0;this.fruitFrame=0;this.resetActors();this.state='ready';this.event('level');
  }
  resetActors(){
    this.player={x:7,y:8,dir:'up',next:'up',moving:false};
    if(!this.canEnter(7,8)){
      let n=this.tiles.findIndex(t=>walkable(t));if(n<0)n=167;this.player.x=n%20;this.player.y=Math.floor(n/20);
    }
    this.ghosts=['Red','Blue','Green','Purple'].map((name,i)=>({name,x:9+(i%2),y:6+Math.floor(i/2),dir:i%2?'left':'right',state:'house',release:i+1,index:i}));
    this.power=0;this.combo=0;this.phaseTime=0;this.deathTime=0;
  }
  tile(x,y){return this.tiles[((y+15)%15)*20+(x+20)%20];}
  canEnter(x,y,ghost=false){return walkable(this.tile(x,y),ghost);}
  direction(dir){if(!DIRECTIONS[dir])return;this.player.next=dir;if(this.state==='ready'){this.state='playing';this.player.dir=dir;this.event('begin');}}
  pause(){if(this.state==='paused'){this.state=this.resumeState||'playing';return;}if(['playing','ready'].includes(this.state)){this.resumeState=this.state;this.state='paused';}}
  addScore(n){this.score+=n;while(this.score>=this.nextLife){this.lives++;this.nextLife=this.nextLife===10000?50000:this.nextLife+50000;this.event('life');}}
  consume(){
    const x=Math.round(this.player.x)%20,y=Math.round(this.player.y)%15,i=y*20+x,t=this.tiles[i];
    if(isFood(t)){
      this.tiles[i]=0;this.food--;this.addScore(FOOD_POINTS[t]);this.event('food',{pill:isPill(t)});
      if(isPill(t)){this.power=7;this.combo=0;this.event('pill');}
      if(this.food===0){this.state='complete';this.phaseTime=2.3;this.event('complete');}
    }
    if(this.fruit&&Math.hypot(this.player.x-this.fruit.x,this.player.y-this.fruit.y)<.55){this.addScore(this.fruit.points);this.event('fruit',{points:this.fruit.points,x:this.fruit.x,y:this.fruit.y});this.fruit=null;this.fruitTimer=-2.5;}
  }
  move(actor,distance,choose,ghost=false){
    // Split at tile centres. Buffered turns only commit at a junction, so corners never cut through walls.
    let remaining=distance,guard=0;
    while(remaining>1e-7&&guard++<20){
      const centre=Math.abs(actor.x-Math.round(actor.x))<1e-6&&Math.abs(actor.y-Math.round(actor.y))<1e-6;
      if(centre){actor.x=(Math.round(actor.x)+20)%20;actor.y=(Math.round(actor.y)+15)%15;choose();}
      const d=DIRECTIONS[actor.dir];if(!d)break;
      if(centre&&!this.canEnter(actor.x+d.x,actor.y+d.y,ghost)){actor.moving=false;break;}
      let boundary=d.x?(d.x>0?Math.floor(actor.x+1e-6)+1:Math.ceil(actor.x-1e-6)-1):(d.y>0?Math.floor(actor.y+1e-6)+1:Math.ceil(actor.y-1e-6)-1);
      const current=d.x?actor.x:actor.y,step=Math.min(remaining,Math.abs(boundary-current));
      actor.x+=d.x*step;actor.y+=d.y*step;actor.moving=true;remaining-=step;
      if(actor.x<0)actor.x+=20;if(actor.x>=20)actor.x-=20;if(actor.y<0)actor.y+=15;if(actor.y>=15)actor.y-=15;
      if(!ghost&&Math.abs(actor.x-Math.round(actor.x))<1e-6&&Math.abs(actor.y-Math.round(actor.y))<1e-6)this.consume();
    }
  }
  ghostDirection(g){
    const eyes=g.state==='eyes';
    const choices=Object.keys(DIRECTIONS).filter(k=>{const d=DIRECTIONS[k];return this.canEnter(g.x+d.x,g.y+d.y,eyes);});
    const target=eyes?{x:9+g.index%2,y:6+Math.floor(g.index/2)}:this.player;
    g.dir=chooseGhostDirection(eyes?{...g,index:0}:g,target,choices,{frightened:!eyes&&this.power>0,random:this.random});
  }
  update(dt,clockDt=dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    if(this.state==='dying'){this.phaseTime-=clockDt;if(this.phaseTime<=0){this.lives--;if(this.lives<=0){this.state='gameover';this.event('gameover');}else{this.resetActors();this.state='ready';}}return;}
    if(this.state==='complete'){this.phaseTime-=clockDt;if(this.phaseTime<=0){this.state='between';this.event('next');}return;}
    if(this.state!=='playing')return;
    this.time+=dt;this.phaseTime+=dt;this.power=Math.max(0,this.power-clockDt);
    const p=this.player;
    if(opposite[p.dir]===p.next)p.dir=p.next;
    this.move(p,5*dt,()=>{const d=DIRECTIONS[p.next];if(this.canEnter(p.x+d.x,p.y+d.y))p.dir=p.next;});
    if(this.state!=='playing')return;
    for(const g of this.ghosts){
      if(g.state==='house'){
        g.release-=dt;if(g.release<=0){g.state='leaving';g.dir='right';}else {g.x+=(g.dir==='left'?-1:1)*5*dt;if(g.x>=10){g.x=10;g.dir='left';}if(g.x<=9){g.x=9;g.dir='right';}continue;}
      }
      if(g.state==='leaving'){
        g.x=Math.min(12,g.x+5*dt);g.dir='right';if(g.x>=12){g.state='active';g.dir='up';}continue;
      }
      const speed=g.state==='eyes'?5:this.power?2.5:5;
      this.move(g,speed*dt,()=>this.ghostDirection(g),true);
      const home={x:9+g.index%2,y:6+Math.floor(g.index/2)};
      if(g.state==='eyes'&&Math.hypot(g.x-home.x,g.y-home.y)<.6){g.x=home.x;g.y=home.y;g.state='house';g.release=g.index+1;continue;}
      let dx=Math.abs(p.x-g.x),dy=Math.abs(p.y-g.y);dx=Math.min(dx,20-dx);dy=Math.min(dy,15-dy);
      // CODE2 collision: aligned sprite bounds, with at least a quarter-tile overlap.
      if(g.state==='active'&&(dx<1e-6||dy<1e-6)&&dx<=.75&&dy<=.75){
        if(this.power){g.state='eyes';const points=200*2**(this.combo++%4);this.addScore(points);this.event('ghost',{points,x:g.x,y:g.y});}
        else{this.state='dying';this.phaseTime=40/15;this.event('death');break;}
      }
    }
    this.fruitTimer+=clockDt;this.fruitFrame+=dt*30;
    if(this.fruitFrame>=1){this.fruitFrame%=1;
      if(!this.fruit&&this.fruitTimer>4&&this.ghosts.filter(g=>g.state==='eyes').length<3&&Math.floor(this.random()*100)===99){const kind=Math.min(3,Math.floor(this.random()*4));this.fruitTimer=0;const fade=[13/6,29*7/60,37*7/60,13/6][kind];this.fruit={x:7,y:8,kind,points:[500,1000,1500,2000][kind],fade,remaining:[3,2,2,2][kind]+fade};this.event('fruitAppears');}
    }
    if(this.fruit){this.fruit.remaining-=clockDt;if(this.fruit.remaining<=0){this.fruit=null;this.fruitTimer=0;}}
  }
}
