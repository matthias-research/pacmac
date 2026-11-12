// Translated from PacMac Deluxe 1.3 CODE2, Ghidra m68k decompilation.
// Original direction numbers: 1 left, 2 right, 3 down, 4 up.
// See analysis/logic/CODE2-decompiled.c: 399c, 3f3e, 3d36, 42f8.
// Purple's Random() OS trap is confirmed in CODE2 bytes at 41d8 (A861).
const names=['','left','right','down','up'];
const reverse=[0,2,1,4,3];
function toward(d,g,p,away=false){
  const delta=d<3?p.x-g.x:p.y-g.y;
  const forward=d===1||d===4?delta<0:delta>0;
  const backward=d===1||d===4?delta>0:delta<0;
  return away?backward:forward;
}
function perpendicular(d,g,p,away=false){
  if(d===1||d===2){if(p.y>g.y)return away?4:3;if(p.y<g.y)return away?3:4;}
  else {if(p.x>g.x)return away?1:2;if(p.x<g.x)return away?2:1;}
  return 0;
}
export function chooseGhostDirection(g,player,choices,{frightened=false,random=Math.random}={}){
  const available=names.map(n=>choices.includes(n));
  const current=names.indexOf(g.dir)||1;
  const nonreverse=()=>[1,2,3,4].find(d=>available[d]&&d!==reverse[current])||0;
  let candidate=current,found=false;
  // Original checks tile coordinates, not fractional pixel positions.
  const p={x:Math.floor(player.x),y:Math.floor(player.y)};
  if(g.index===3&&!frightened){
    const candidates=[1,2,3,4].filter(d=>available[d]&&d!==reverse[current]);
    // Repeated Random() & 3 until an untried valid option is equivalent to
    // uniform choice among available non-reversing directions.
    candidate=candidates.length?candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))]:[1,2,3,4].find(d=>available[d]);
    return names[candidate]||g.dir;
  }
  const continueToward=()=>{
    if(toward(candidate,g,p,frightened)){found=!!available[candidate];}
  };
  const turnToward=()=>{
    const turn=perpendicular(current,g,p,frightened);
    if(turn){candidate=turn;found=!!available[turn];}else found=false;
  };
  const takeFirst=()=>{const d=nonreverse();if(d){candidate=d;found=true;}};
  if(frightened||g.index===0){
    continueToward();
    if(!found)turnToward();
    if(!frightened&&!found&&available[current]){candidate=current;found=true;}
    if(!found)takeFirst();
  }else if(g.index===1){
    continueToward();
    if(!found)takeFirst();
    if(!found)turnToward();
  }else{
    turnToward();
    if(!found)continueToward();
    if(!found)takeFirst();
  }
  if(!found||!available[candidate]){
    // Preserve the original routine's final fallback ordering/conditions.
    const fallback=[1,2,3,4].find(d=>available[d]&&d!==current&&d-1!==current&&d+1!==current);
    if(fallback)candidate=fallback;
  }
  // Original authors warned that cul-de-sacs can strand ghosts. A safe reverse
  // fallback avoids freezing user-created levels when the original finds none.
  if(!available[candidate])candidate=[1,2,3,4].find(d=>available[d])||current;
  return names[candidate];
}

