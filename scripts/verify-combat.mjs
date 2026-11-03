import assert from 'node:assert/strict';

export async function verifyCombatTiming(page){
 const cases=[
  [{frame:5},{secondary:true,frame:9,projectile:true},{secondary:true,air:true,frame:6,projectile:true}],
  [{frame:4},{combo:1,frame:4},{secondary:true,frame:11},{air:true,frame:4},{ability:true,frame:9}],
   [{frame:2},{combo:1,frame:2,hits:[2,6,9]},{combo:2,frame:2,hits:[2,6,9,17]},{secondary:true,frame:8,hits:[8,18]}],
   [{frame:3,projectile:true},{combo:1,frame:3,hits:[3,15],projectile:true},{combo:2,frame:3,hits:[3,15,22],projectile:true},{air:true,frame:4,projectile:true},{secondary:true,frame:13}]
 ];
 for(let character=0;character<4;character++){
  await page.evaluate(()=>{const g=window.__emboscada;g.scene.stop('Game');g.scene.start('Menu',{page:'characters'});});
  await page.waitForFunction(()=>window.__emboscada.scene.isActive('Menu'));
  await page.evaluate(i=>window.__emboscada.scene.getScene('Menu').buttons[i].fn(),character);
  await page.waitForFunction(()=>window.__emboscada.scene.isActive('Game'));
  await page.evaluate(()=>{
   window.prepareCombat=()=>{
    const s=window.__emboscada.scene.getScene('Game');
    s.time.removeAllEvents();s.wave=0;s.pending=0;s.finished=false;s.cancelAction();s.defenseState=null;s.defending=false;s.meditatingUntil=0;s.buffUntil=0;s.charge=null;s.hurtUntil=0;s.rollUntil=0;s.abilityReady=0;s.invincible=0;s.hp=100;s.facing=1;s.comboStep=0;s.comboUntil=0;
    for(const e of s.enemies)e.sprite.destroy();s.enemies=[];
    for(const p of s.projectiles)if(p.s.active)p.s.destroy();s.projectiles=[];
    s.hero.anims.resume();s.hero.body.reset(640,s.ground);s.hero.setFlipX(false);s.hero.body.setAllowGravity(true);
    s.hero.body.updateFromGameObject();
    s.plan={hp:1000,speed:0};
    for(const [x,y] of [[710,s.ground],[570,s.ground],[710,s.ground-180]]){
     s.spawnEnemy(false,0);const e=s.enemies.at(-1);e.sprite.body.reset(x,y);e.sprite.body.setAllowGravity(false);e.busy=e.next=e.jumpAt=Infinity;
     e.sprite.body.updateFromGameObject();
    }
    return s;
   };
  });
  for(const attack of cases[character]){
   const result=await page.evaluate(test=>{
    const s=window.prepareCombat();s.comboStep=test.combo||0;s.comboUntil=Infinity;
    if(test.ability)s.ability(s.time.now,true);else s.attack(s.time.now,!!test.secondary,!!test.air);
    const anim=s.hero.anims.currentAnim;
    const before=[s.enemies[0].hp,s.projectiles.length];
    if(test.frame>2)s.hero.anims.setCurrentFrame(anim.frames[test.frame-2]);
    const windup=[s.enemies[0].hp,s.projectiles.length];
    s.hero.anims.setCurrentFrame(anim.frames[test.frame-1]);
    const contact=[s.enemies[0].hp,s.projectiles.length];
    s.hero.anims.setCurrentFrame(anim.frames[test.frame-1]);
    const repeated=[s.enemies[0].hp,s.projectiles.length];
    const b=s.enemies[0].sprite.body;
    return {before,windup,contact,repeated,behind:s.enemies[1].hp,above:s.enemies[2].hp,debug:{body:{x:b.x,y:b.y,width:b.width,height:b.height},hero:{x:s.hero.x,y:s.hero.y},events:s.activeAction.events.map(e=>({frame:e.frame,done:e.done})),playing:s.hero.anims.isPlaying,started:s.hero.anims.hasStarted}};
   },attack);
   const label=`personaje ${character}, ${JSON.stringify(attack)}`;
   assert.deepEqual(result.before,[1000,0],`sin daño instantáneo: ${label}`);
   assert.deepEqual(result.windup,[1000,0],`sin daño durante preparación: ${label}`);
   assert.ok(attack.projectile?result.contact[1]>0:result.contact[0]<1000,`impacto en el fotograma previsto: ${label} ${JSON.stringify(result.debug)}`);
   assert.deepEqual(result.repeated,result.contact,`sin repetir el mismo golpe: ${label}`);
   assert.equal(result.behind,1000,`rectángulo no golpea detrás: ${label}`);
   assert.equal(result.above,1000,`rectángulo no golpea otra altura: ${label}`);
   const timeline=await page.evaluate(test=>{
    const s=window.prepareCombat();s.comboStep=test.combo||0;s.comboUntil=Infinity;
    if(test.ability)s.ability(s.time.now,true);else s.attack(s.time.now,!!test.secondary,!!test.air);
    let hp=s.enemies[0].hp,shots=0;const hits=[];
    for(const frame of s.hero.anims.currentAnim.frames){
     s.hero.anims.setCurrentFrame(frame);
     if(s.enemies[0].hp!==hp||s.projectiles.length!==shots)hits.push(frame.index);
     hp=s.enemies[0].hp;shots=s.projectiles.length;
    }
    return hits;
   },attack);
   assert.deepEqual(timeline,attack.hits||[attack.frame],`todos los contactos y ningún golpe extra: ${label}`);
  }
  // Invert the attack: its rectangle must move to the left, never remain right.
  assert.deepEqual(await page.evaluate(()=>{
   const s=window.prepareCombat();s.facing=-1;s.hero.setFlipX(true);s.attack(s.time.now);
   s.hero.anims.setCurrentFrame(s.hero.anims.currentAnim.frames[4]);
   return s.id==='WaterPriestess'?[s.projectiles[0].s.body.velocity.x<0,true]:[s.enemies[1].hp<1000,s.enemies[0].hp===1000];
  }),[true,true],'hitbox/proyectil orientado a la izquierda');
  // Cancelled actions must not leave delayed hits behind.
  assert.deepEqual(await page.evaluate(()=>{
   const s=window.prepareCombat();s.attack(s.time.now,true);const anim=s.hero.anims.currentAnim;s.cancelAction();
   for(const frame of anim.frames)s.hero.anims.setCurrentFrame(frame);
   return [s.enemies[0].hp,s.projectiles.length];
  }),[1000,0],'cancelación elimina impactos pendientes');
 }

  // The sphere explodes at 13; the separate ice phase starts at 23.
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.prepareCombat();s.attack(s.time.now,true);const anim=s.hero.anims.currentAnim;
   s.hero.anims.setCurrentFrame(anim.frames[11]);
  const before=s.enemies[0].hp;
   s.hero.anims.setCurrentFrame(anim.frames[12]);
   const after=s.enemies[0].hp;
   if(s.enemies[0].frozen)throw Error('No congelar durante la explosión');
  const front=s.enemies[0],behind=s.enemies[1];
  s.enemies[2].sprite.body.reset(760,s.ground);
  s.enemies[2].sprite.body.updateFromGameObject();
   for(const frame of anim.frames.slice(22))s.hero.anims.setCurrentFrame(frame);
  window.freezeSnapshot={frontUntil:front.frozenUntil};
  return [before,after,s.enemies[0].hp,s.enemies[2].hp,front.frozen,!!behind.frozen,s.enemies[2].frozen,s.projectiles.length,front.sprite.body.moves,front.sprite.anims.isPaused];
  }),[1000,900,900,1000,true,false,true,0,false,true],'agua: daño al 13, hielo sin daño al 23');
 await page.screenshot({path:'test-results/water-freeze.png'});
 await page.waitForTimeout(3200);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies[0].frozen),false,'descongela al pasar tres segundos');

  // Attacks root the player, including jump input, without turning the sprite.
 await page.evaluate(()=>{const s=window.prepareCombat();for(const e of s.enemies)e.sprite.destroy();s.enemies=[];s.attack(s.time.now,true);});
 await page.keyboard.down('a');await page.waitForTimeout(260);await page.keyboard.up('a');
  assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return [Math.abs(s.hero.x-640)<1,s.facing,s.hero.flipX,!!s.activeAction];}),[true,1,false,true],'acción inmóvil sin girar');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.invincible=0;s.damage(10,s.time.now);});
 assert.equal(await page.evaluate(()=>!!window.__emboscada.scene.getScene('Game').activeAction),true,'daño no interrumpe ataque');
 await page.keyboard.down('Shift');await page.waitForTimeout(80);await page.keyboard.up('Shift');
 assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return [s.activeAction===null,s.rollUntil>s.time.now];}),[true,true],'rodada cancela ataque para escapar');

 await page.evaluate(()=>{const s=window.prepareCombat();for(const e of s.enemies)e.sprite.destroy();s.enemies=[];s.damage(10,s.time.now);});
 await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
 assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.x)>670,'recibir daño no bloquea movimiento');
 await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');
 assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.body.velocity.y)<0,'se puede saltar tras recibir daño');

 // Enemy attacks also follow their animation, lock facing and respect rectangles.
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.prepareCombat(),e=s.enemies[0];e.sprite.body.reset(700,s.ground);e.sprite.setFlipX(true);
  e.sprite.body.updateFromGameObject();
  s.startEnemyAttack(e,s.time.now);const anim=e.sprite.anims.currentAnim,frame=e.attack.frame;
  e.sprite.anims.setCurrentFrame(anim.frames[frame-2]);const before=s.hp;
  e.sprite.anims.setCurrentFrame(anim.frames[frame-1]);const after=s.hp;
  s.invincible=0;e.sprite.anims.setCurrentFrame(anim.frames[frame-1]);
  return [before,after,s.hp];
 }),[100,90,90],'enemigo golpea una vez en el fotograma de contacto');
 assert.equal(await page.evaluate(()=>{
  const s=window.prepareCombat(),e=s.enemies[0];e.sprite.body.reset(700,s.ground);e.sprite.setFlipX(false);
  e.sprite.body.updateFromGameObject();
  s.startEnemyAttack(e,s.time.now);e.sprite.anims.setCurrentFrame(e.sprite.anims.currentAnim.frames[e.attack.frame-1]);return s.hp;
 }),100,'enemigo no golpea a sus espaldas');
 assert.equal(await page.evaluate(()=>{
  const s=window.prepareCombat(),e=s.enemies[0];e.sprite.setFlipX(true);s.startEnemyAttack(e,s.time.now);
  const anim=e.sprite.anims.currentAnim,frame=e.attack.frame;s.freezeFront({frozen:new Set()});
  e.sprite.anims.setCurrentFrame(anim.frames[frame-1]);return s.hp;
 }),100,'congelar cancela un ataque enemigo pendiente');
 console.log('OK: impactos por fotograma, rectángulos frontales, orientación fija, movimiento sin stun, cancelación y congelación de agua.');
}
