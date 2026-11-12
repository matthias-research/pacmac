// A rounded diamond gate with four-way steering and diagonal hysteresis.
export function stickPosition(x,y){
  // Rounded square (rotated 45 degrees), inset for the thumb radius.
  const u=(x+y)/Math.SQRT2,v=(y-x)/Math.SQRT2,half=43,radius=1;
  const a=Math.max(-half,Math.min(half,u)),b=Math.max(-half,Math.min(half,v));
  const du=u-a,dv=v-b,length=Math.hypot(du,dv),factor=length>radius?radius/length:1;
  return {x:(a+du*factor-b-dv*factor)/Math.SQRT2,y:(a+du*factor+b+dv*factor)/Math.SQRT2};
}
export function stickDirection(x,y,previous){
  if(Math.hypot(x,y)<12)return null;
  const horizontal=Math.abs(x),vertical=Math.abs(y);
  if(previous&&Math.abs(horizontal-vertical)<8){
    if((previous==='left'&&x<0)||(previous==='right'&&x>0)||(previous==='up'&&y<0)||(previous==='down'&&y>0))return previous;
  }
  return horizontal>vertical?(x<0?'left':'right'):(y<0?'up':'down');
}
export function attachJoystick(pad,{direction,unlock,enabled}){
  const thumb=pad.querySelector('circle');let pointer,previous;
  function reset(){const captured=pointer;pointer=undefined;previous=null;thumb.setAttribute('cx',100);thumb.setAttribute('cy',100);if(captured!==undefined&&pad.hasPointerCapture(captured))pad.releasePointerCapture(captured);}
  function move(event){
    if(!enabled()){reset();return;}
    const rect=pad.getBoundingClientRect(),point=stickPosition((event.clientX-rect.left)/rect.width*200-100,(event.clientY-rect.top)/rect.height*200-100);
    thumb.setAttribute('cx',100+point.x);thumb.setAttribute('cy',100+point.y);
    const next=stickDirection(point.x,point.y,previous);if(next)direction(next);previous=next;
  }
  pad.addEventListener('pointerdown',event=>{if(pointer!==undefined||event.button!==0||!enabled())return;event.preventDefault();unlock();pad.focus({preventScroll:true});pointer=event.pointerId;pad.setPointerCapture(pointer);move(event);});
  pad.addEventListener('pointermove',event=>{if(event.pointerId===pointer)move(event);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,event=>{if(event.pointerId===pointer)reset();});
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  return {reset};
}

