import assert from 'node:assert/strict';

export async function verifyControls(page){
 const standard={attack:2,secondary:3,ability:1,roll:4,defend:5,jump:0,pause:9};
 async function pad(id){await page.evaluate(id=>{window.__pad={id,mapping:id==='standard-test'?'standard':'',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});},id);}
 async function press(index){await page.evaluate(i=>{window.__pad.buttons[i].pressed=true;},index);await page.waitForTimeout(65);await page.evaluate(i=>{window.__pad.buttons[i].pressed=false;},index);await page.waitForTimeout(65);}
 async function start(character){
  await page.evaluate(()=>{const g=window.__emboscada;g.scene.stop('Game');g.scene.stop('Overlay');g.scene.start('Menu',{page:'characters'});});
  await page.waitForFunction(()=>window.__emboscada.scene.isActive('Menu'));
  await page.evaluate(i=>window.__emboscada.scene.getScene('Menu').buttons[i].fn(),character);
  await page.waitForFunction(()=>window.__emboscada.scene.isActive('Game'));
  await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();s.wave=0;s.hp=50;s.hero.body.reset(640,s.ground);});
  await page.waitForTimeout(100);
 }
 async function characterControls(character,map){
  await start(character);
  const combo=character===1?['attack','attack2']:['attack','attack2','attack3'];
  await press(map.attack);
  for(let i=0;i<combo.length;i++){
   await page.waitForFunction(action=>window.__emboscada.scene.getScene('Game').hero.anims.currentAnim.key.endsWith(':'+action),combo[i]);
   if(i<combo.length-1)await press(map.attack); // queue while the prior animation is still playing
  }
  await page.waitForFunction(()=>!window.__emboscada.scene.getScene('Game').activeAction);
  await press(map.secondary);
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.anims.currentAnim.key.split(':')[1]),character===1?'attack3':'special','Y usa el secundario del personaje');
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').rollUntil),0,'Y nunca rueda');
  await page.waitForFunction(()=>!window.__emboscada.scene.getScene('Game').activeAction);
  await press(map.ability);
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.anims.currentAnim.key.split(':')[1]),character===1?'special':character===2?'meditate':'heal','B usa habilidad');
  await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return !s.activeAction&&!s.meditatingUntil;});
  if(character===3)assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hp),75,'B cura de agua');
  await press(map.roll);
  assert.equal(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return s.rollUntil>s.time.now;}),true,'LB rueda');
 }
 await pad('standard-test');
 for(const character of [1,2,3])await characterControls(character,standard);

 // Reproduce a raw controller where physical Y is index 4, the old assumed LB.
 const raw={attack:5,secondary:4,ability:2,roll:3,defend:1,jump:0,pause:9};
 await pad('raw-test');
 await page.evaluate(()=>{const g=window.__emboscada;g.scene.stop('Game');g.scene.start('Menu',{page:'calibrate'});});
 await page.waitForFunction(()=>window.__emboscada.scene.getScene('Menu').page==='calibrate');
 await page.waitForTimeout(100);
 for(const action of ['attack','secondary','ability','roll','defend','jump','pause'])await press(raw[action]);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').page),'help','calibración termina y guarda');
 await page.reload();await page.waitForFunction(()=>window.__emboscada?.scene.isActive('Menu'));
 await pad('raw-test');await characterControls(3,raw);

 // Keyboard 5 starts clean boss encounters and cycles through the three bosses.
 for(const [wave,id] of [[5,'DemonSlime'],[10,'FrostGuardian'],[15,'Minotaur']]){
  await page.keyboard.press('5');
  await page.waitForFunction(w=>{const s=window.__emboscada.scene.getScene('Game');return s.wave===w&&s.enemies.length===1;},wave);
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies[0].id),id);
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hp),100);
 }
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game');s.plan={hp:1000,speed:0};s.wave=0;s.spawnEnemy(false,2);const e=s.enemies.at(-1);
  const initial=e.next-s.time.now;s.startEnemyAttack(e,s.time.now,'attack3');
  return [initial>=4500,initial<=6500,e.next-e.busy>=6500,e.next-e.busy<=8000];
 }),[true,true,true,true],'ojo espera 4,5–6,5 s inicialmente y 6,5–8 s tras cada ataque');
 await page.evaluate(()=>{const g=window.__emboscada;g.scene.stop('Game');g.scene.start('Menu',{page:'help'});});
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('Menu'));
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').children.list.some(o=>o.text?.startsWith('ELFO ·'))),false,'bloque explicativo retirado');
 await page.screenshot({path:'test-results/tutorial.png'});
 console.log('OK: combos con X, secundarios Y, habilidades B, LB, calibración persistente, tecla 5 y cadencia lenta.');
}
