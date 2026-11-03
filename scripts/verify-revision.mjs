import assert from 'node:assert/strict';

export async function verifyRevision(page){
 async function start(character=0){
  await page.evaluate(()=>{const g=window.__emboscada;g.scene.stop('Game');g.scene.stop('Overlay');g.scene.start('Menu',{page:'characters'});});
  await page.waitForFunction(()=>window.__emboscada.scene.isActive('Menu'));
  await page.evaluate(i=>window.__emboscada.scene.getScene('Menu').buttons[i].fn(),character);
  await page.waitForFunction(()=>window.__emboscada.scene.isActive('Game'));
  await page.evaluate(()=>{
   const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();s.wave=0;s.pending=0;s.plan={hp:1000,speed:0};
   window.spawnTestEnemy=(id,x=760,y=s.ground)=>{
    const types=['Mushroom','Skeleton','Flying eye'];
    s.spawnEnemy(false,types.indexOf(id));const e=s.enemies.at(-1);e.sprite.body.reset(x,y);e.sprite.body.updateFromGameObject();e.next=e.shieldReady=Infinity;return e;
   };
  });
  await page.waitForTimeout(100);
 }
 for(let character=0;character<4;character++){
  await start(character);
  assert.deepEqual(await page.evaluate(()=>{
   const s=window.__emboscada.scene.getScene('Game');
   window.__pad={axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});
   const mappings=[];
   for(const [index,action] of [[2,'attack'],[3,'secondary'],[1,'ability'],[4,'roll'],[5,'defend']]){
    s.controls.poll(s.time.now);window.__pad.buttons[index].pressed=true;const c=s.controls.poll(s.time.now);
    mappings.push(c[action]&&Object.entries(c).filter(([k,v])=>['attack','secondary','ability','roll','defend'].includes(k)&&v).length===1);
    window.__pad.buttons[index].pressed=false;s.controls.poll(s.time.now);
   }return mappings;
  }),[true,true,true,true,true],`mando X/Y/B/LB/RB personaje ${character}`);
  await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.attack(s.time.now,true);});
  await page.keyboard.down('d');await page.keyboard.down('Space');await page.waitForTimeout(160);
  await page.keyboard.up('d');await page.keyboard.up('Space');
  assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return [Math.abs(s.hero.x-640)<1,s.hero.body.velocity.y===0];}),[true,true],'ataque bloquea caminar y saltar');
  await page.evaluate(()=>{window.__pad.buttons[4].pressed=true;});await page.waitForTimeout(60);
  assert.equal(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return s.activeAction===null&&s.rollUntil>s.time.now;}),true,'LB ejecuta rodada real');
  await page.evaluate(()=>{window.__pad.buttons[4].pressed=false;});
 }
 await start(1);
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game');
  const y=s.attack(s.time.now,true,true);s.ability(s.time.now,false);
  return [y,s.activeAction===null,s.abilityReady===0,s.attack(s.time.now,false,true),s.hero.anims.currentAnim.key];
 }),[false,true,true,true,'CrystalMauler:airAttack'],'cristal: Y/B prohibidos en aire, X aéreo permitido');

 await start();
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game'),e=window.spawnTestEnemy('Mushroom',570);
  s.facing=-1;s.shoot();s.impact(s.projectiles.at(-1),e);
  const impact=s.children.list.find(o=>o.anims?.currentAnim?.key==='LeafRanger:arrowHit');
  const rain=s.effect('shower',400,s.ground),air=s.effect('airHit',500,s.ground,1.65,true,-1);
  return [impact.flipX,rain.y,rain.originY,air.y,air.originY,air.flipX,s.surfaceBelow(170,450),s.ground];
 }),[true,650,1,650,74/128,true,510,650],'impactos espejados y anclajes de suelo/plataforma');
 await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game');s.shoot('normal',true);const p=s.projectiles.at(-1);
  p.s.body.reset(170,480);p.s.setVelocity(0,440);p.previousY=480;
 });
 await page.waitForTimeout(120);
 assert.equal(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return s.children.list.some(o=>o.anims?.currentAnim?.key==='LeafRanger:airHit'&&o.y===510);}),true,'flecha aérea aterriza en plataforma');
 await page.screenshot({path:'test-results/revision-effects.png'});

 await start();
 await page.evaluate(()=>{window.spawnTestEnemy('Mushroom',700);});
 await page.keyboard.down('Space');await page.waitForTimeout(210);await page.keyboard.up('Space');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies[0].jumpAt),0,'enemigo no copia salto del jugador');
 await page.waitForTimeout(800);
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.hero.body.reset(170,510);const e=s.enemies[0];e.sprite.body.reset(250,s.ground);e.jumpAt=0;});
 await page.waitForTimeout(250);
 assert.ok(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return s.enemies[0].jumpAt>s.time.now;}),'enemigo persigue hacia plataforma ocupada');

 await start();
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game'),e=window.spawnTestEnemy('Skeleton');s.startShield(e,s.time.now);s.hitEnemy(e,50);const blocked=e.hp;
  e.shieldUntil=0;s.hitEnemy(e,50);const unblocked=e.hp;
  s.startEnemyAttack(e,s.time.now,'attack');const normal={...e.attack};
  s.startEnemyAttack(e,s.time.now,'attack2');
  return [blocked,unblocked,e.attack.damage>normal.damage,e.attack.width>normal.width,e.attack.width-normal.width<=30,e.recovery>=1000];
  }),[1000,950,true,true,true,true],'escudo y ataque pesado del esqueleto');
 assert.equal(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game'),e=s.enemies[0];s.startShield(e,s.time.now);s.shoot('poison');s.impact(s.projectiles.at(-1),e);return !!e.poisonUntil;
 }),false,'el escudo bloquea también la aplicación de veneno');
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game'),e=window.spawnTestEnemy('Mushroom');
  s.startEnemyAttack(e,s.time.now,'attack');const damage=e.attack.damage;
  s.startEnemyAttack(e,s.time.now,'attack2');return [e.attack.damage===damage,e.sprite.anims.currentAnim.key];
 }),[true,'Mushroom:attack2'],'dos golpes de hongo con mismo daño');

 await start();
 await page.evaluate(()=>{const e=window.spawnTestEnemy('Flying eye',640,160);e.patrol={x:900,y:160};});
 await page.waitForTimeout(200);
 assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies[0].sprite.x)>645,'ojo patrulla sin perseguir al jugador');
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game'),e=s.enemies[0];
  s.startEnemyAttack(e,s.time.now,'attack3');e.sprite.anims.setCurrentFrame(e.sprite.anims.currentAnim.frames[3]);
  const shot=s.enemyProjectiles[0];
  s.startEnemyAttack(e,s.time.now,'attack2');e.sprite.anims.setCurrentFrame(e.sprite.anims.currentAnim.frames[3]);
  return [shot.s.body.allowGravity,shot.s.body.velocity.y>0,!!e.dash,e.sprite.body.allowGravity];
 }),[false,true,true,false],'ojo dispara y taclea, sin gravedad');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game'),p=s.enemyProjectiles[0];p.s.body.reset(s.hero.x,s.hero.y-35);p.s.setVelocity(0);s.invincible=0;});
 await page.waitForTimeout(40);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hp),88,'proyectil del ojo daña al jugador');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game'),e=s.enemies[0];e.dash=null;e.busy=0;e.next=0;e.sprite.body.reset(s.hero.x+55,s.hero.y-20);});
 await page.waitForTimeout(40);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies[0].attack?.action),'attack','mordisco solo estando cerca y libre');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game'),e=s.enemies[0];e.sprite.body.reset(170,100);s.hitEnemy(e,9999);});
 await page.waitForTimeout(360);
 assert.deepEqual(await page.evaluate(()=>{const e=window.__emboscada.scene.getScene('Game').enemies[0];return [e.fallingDeath,e.sprite.anims.currentAnim.key,e.sprite.anims.currentFrame.index,e.sprite.body.allowGravity];}),[true,'eye:deathFall',2,true],'muerte aérea sostiene fotograma 2 mientras cae');
 await page.waitForTimeout(450);
 assert.deepEqual(await page.evaluate(()=>{const e=window.__emboscada.scene.getScene('Game').enemies[0];return [e.sprite.anims.currentAnim.key,Math.abs(e.sprite.y-510)<2];}),['eye:deathLanding',true],'resto de muerte sobre la plataforma');
 await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies.length),0,'ojo termina muerte al aterrizar');

 for(const wave of [5,10,15]){
  await start();
  await page.evaluate(w=>{const s=window.__emboscada.scene.getScene('Game');s.wave=w-1;s.startWave();},wave);
  await page.waitForTimeout(1300);
  assert.deepEqual(await page.evaluate(()=>{
   const s=window.__emboscada.scene.getScene('Game'),e=s.enemies[0];s.startEnemyAttack(e,s.time.now);
   return [s.enemies.length,e.boss,s.bossFill.visible,s.bossFill.width>700,e.sprite.scaleX>=2.8,e.attack.damage>=38];
  }),[1,true,true,true,true,true],`jefe exclusivo de oleada ${wave}`);
  await page.screenshot({path:`test-results/boss-${wave}.png`});
 }
 await page.evaluate(()=>{const g=window.__emboscada;g.scene.stop('Game');g.scene.start('Menu',{page:'help'});});
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('Menu'));
 await page.screenshot({path:'test-results/tutorial.png'});
 console.log('OK: controles por personaje, inmovilidad, efectos, persecución, escudo, variantes, ojo volador y tres jefes.');
}
