import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationGraph,findPath,generateScenario,nearestSurfaceNode,routeLength} from '../src/navigation.js';

function routeGraph(){
 const nodes=[
  {id:'start',x:0,y:0,type:'ground',exposed:false},
  {id:'risk',x:5,y:0,type:'platform',exposed:true},
  {id:'goal',x:10,y:0,type:'ground',exposed:false},
  {id:'safe-a',x:0,y:10,type:'ground',exposed:false},
  {id:'safe-b',x:10,y:10,type:'ground',exposed:false}
 ];
 const edges={
  start:[{to:'risk',cost:5},{to:'safe-a',cost:10}],
  risk:[{to:'start',cost:5},{to:'goal',cost:5}],
  goal:[{to:'risk',cost:5},{to:'safe-b',cost:10}],
  'safe-a':[{to:'start',cost:10},{to:'safe-b',cost:10}],
  'safe-b':[{to:'safe-a',cost:10},{to:'goal',cost:10}]
 };
 return {nodes,edges,byId:Object.fromEntries(nodes.map(node=>[node.id,node]))};
}

test('BFS minimiza saltos y la ruta segura evita nodos expuestos',()=>{
 const graph=routeGraph();
 assert.deepEqual(findPath(graph,'start','goal','bfs','short'),['start','risk','goal']);
 assert.deepEqual(findPath(graph,'start','goal','bfs','safe'),['start','safe-a','safe-b','goal']);
});

test('A* elige distancia corta o rodeo seguro segun la navegacion',()=>{
 const graph=routeGraph();
 assert.deepEqual(findPath(graph,'start','goal','astar','short'),['start','risk','goal']);
 assert.deepEqual(findPath(graph,'start','goal','astar','safe'),['start','safe-a','safe-b','goal']);
 assert.equal(routeLength(graph,findPath(graph,'start','goal','astar','short')),10);
});

test('las variantes proceduralmente generadas son repetibles por semilla y alteran rutas',()=>{
 const first=generateScenario(1),repeat=generateScenario(1),next=generateScenario(2);
 assert.deepEqual(first,repeat);
 assert.notDeepEqual(first.platforms,next.platforms);
 const graph=createNavigationGraph(650,first.platforms);
 const start=nearestSurfaceNode(graph,320,650,650);
 const destination=nearestSurfaceNode(graph,first.platforms[0].x,first.platforms[0].y,650);
 assert.ok(findPath(graph,start.id,destination.id,'astar','short'));
 assert.ok(first.platforms.some(platform=>platform.exposed));
});
