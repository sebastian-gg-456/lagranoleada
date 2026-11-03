import {test} from 'node:test';
import assert from 'node:assert/strict';
import {basicAction,chargedKind,defenseFrames,frontRect,overlaps} from '../src/combat.js';
test('combos y ataques aéreos respetan el personaje',()=>{
 for(const id of ['WaterPriestess','GroundMonk'])assert.deepEqual([0,1,2,3].map(n=>basicAction(id,n,false)),['attack','attack2','attack3','attack']);
 assert.deepEqual([0,1,2].map(n=>basicAction('CrystalMauler',n,false)),['attack','attack2','attack']);
 for(const id of ['WaterPriestess','CrystalMauler'])assert.equal(basicAction(id,1,true),'airAttack');
 assert.equal(basicAction('LeafRanger',2,false),'attack');
});
test('las dos variantes cargadas tienen intervalos de probabilidad iguales',()=>{
 assert.equal(chargedKind(()=>0),'area');assert.equal(chargedKind(()=>0.4999),'area');
 assert.equal(chargedKind(()=>0.5),'poison');assert.equal(chargedKind(()=>0.9999),'poison');
 assert.deepEqual(defenseFrames,{LeafRanger:13,WaterPriestess:7,GroundMonk:10,CrystalMauler:5});
});
test('hitbox horizontal frontal respeta dirección y altura',()=>{
 const right=frontRect(300,500,1,150),left=frontRect(300,500,-1,150);
 const front={x:350,y:440,width:30,height:50},back={x:220,y:440,width:30,height:50},above={x:350,y:300,width:30,height:50};
 assert.ok(right.width>right.height);
 assert.equal(overlaps(right,front),true);assert.equal(overlaps(right,back),false);assert.equal(overlaps(right,above),false);
 assert.equal(overlaps(left,back),true);assert.equal(overlaps(left,front),false);
});
