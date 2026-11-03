const floorPositions=[80,320,560,800,1040,1200];

export function generateScenario(seed=1){
 let state=seed>>>0;
 const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
 const columns=[190,460,750,1060];
 const platforms=columns.map((base,index)=>({
  id:`platform-${index}`,
  x:Math.round(base+(random()-0.5)*70),
  y:[370,420,470,510][Math.floor(random()*4)],
  w:160+Math.floor(random()*51),
  exposed:false
 }));
 const exposedCount=1+Math.floor(random()*2);
 const exposed=new Set();
 while(exposed.size<exposedCount)exposed.add(Math.floor(random()*platforms.length));
 for(const index of exposed)platforms[index].exposed=true;
 return {seed,platforms};
}

export function createNavigationGraph(ground,platforms=[]){
 const nodes=[
  ...floorPositions.map((x,index)=>({id:`ground-${index}`,x,y:ground,type:'ground',exposed:false})),
  ...platforms.map((p,index)=>({id:p.id||`platform-${index}`,x:p.x,y:p.y,type:'platform',w:p.w,exposed:!!p.exposed}))
 ];
 const edges=Object.fromEntries(nodes.map(node=>[node.id,[]]));
 const connect=(a,b)=>{
  const cost=Math.hypot(a.x-b.x,a.y-b.y);
  edges[a.id].push({to:b.id,cost});
  edges[b.id].push({to:a.id,cost});
 };
 for(let i=0;i<floorPositions.length-1;i++)connect(nodes[i],nodes[i+1]);
 const floors=nodes.filter(node=>node.type==='ground');
 const ledges=nodes.filter(node=>node.type==='platform');
 for(const ledge of ledges){
  for(const floor of floors)if(Math.abs(floor.x-ledge.x)<=180&&ground-ledge.y<=320)connect(ledge,floor);
 }
 for(let i=0;i<ledges.length;i++)for(let j=i+1;j<ledges.length;j++){
  const a=ledges[i],b=ledges[j];
  if(Math.abs(a.x-b.x)<=400&&Math.abs(a.y-b.y)<=230)connect(a,b);
 }
 return {nodes,edges,byId:Object.fromEntries(nodes.map(node=>[node.id,node]))};
}

export function nearestSurfaceNode(graph,x,bottomY,ground,tolerance=70){
 const platforms=graph.nodes.filter(node=>node.type==='platform'&&
  x>=node.x-node.w/2&&x<=node.x+node.w/2&&Math.abs(bottomY-node.y)<=tolerance);
 if(platforms.length)return platforms.reduce((best,node)=>Math.abs(node.y-bottomY)<Math.abs(best.y-bottomY)?node:best);
 const floor=graph.nodes.filter(node=>node.type==='ground');
 if(Math.abs(bottomY-ground)<=tolerance)return floor.reduce((best,node)=>Math.abs(node.x-x)<Math.abs(best.x-x)?node:best);
 return null;
}

function reconstructPath(previous,current){
 const path=[current];
 while(previous.has(current)){current=previous.get(current);path.unshift(current);}
 return path;
}

function breadthFirst(graph,start,goal,avoidExposed){
 const queue=[start],previous=new Map(),visited=new Set([start]);
 for(let index=0;index<queue.length;index++){
  const current=queue[index];
  if(current===goal)return reconstructPath(previous,current);
  for(const edge of graph.edges[current]||[]){
   const next=graph.byId[edge.to];
   if(avoidExposed&&next.exposed||visited.has(next.id))continue;
   visited.add(next.id);previous.set(next.id,current);queue.push(next.id);
  }
 }
 return null;
}

function aStar(graph,start,goal,mode){
 const open=new Set([start]),previous=new Map(),costs=new Map([[start,0]]);
 const heuristic=id=>Math.hypot(graph.byId[id].x-graph.byId[goal].x,graph.byId[id].y-graph.byId[goal].y);
 while(open.size){
  let current=null,best=Infinity;
  for(const id of open){const estimate=costs.get(id)+heuristic(id);if(estimate<best){best=estimate;current=id;}}
  if(current===goal)return reconstructPath(previous,current);
  open.delete(current);
  for(const edge of graph.edges[current]||[]){
   const next=graph.byId[edge.to],risk=mode==='safe'&&next.exposed?1000:0;
   const candidate=costs.get(current)+edge.cost+risk;
   if(candidate>=(costs.get(next.id)??Infinity))continue;
   costs.set(next.id,candidate);previous.set(next.id,current);open.add(next.id);
  }
 }
 return null;
}

export function findPath(graph,start,goal,algorithm='astar',mode='short'){
 if(!graph.byId[start]||!graph.byId[goal])return null;
 if(algorithm==='bfs'){
  if(mode==='safe')return breadthFirst(graph,start,goal,true)||breadthFirst(graph,start,goal,false);
  return breadthFirst(graph,start,goal,false);
 }
 return aStar(graph,start,goal,mode);
}

export function routeLength(graph,path){
 if(!path)return Infinity;
 let length=0;
 for(let i=1;i<path.length;i++){
  length+=graph.edges[path[i-1]].find(edge=>edge.to===path[i])?.cost??Infinity;
 }
 return length;
}
