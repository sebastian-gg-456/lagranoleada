import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {verifyCombatTiming} from './verify-combat.mjs';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179'],{stdio:'pipe'});
let browser;
try {
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5179')).ok)break;}catch{}await new Promise(r=>setTimeout(r,300));}
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://127.0.0.1:5179');
 await page.waitForFunction(()=>window.__emboscada?.scene.isActive('Menu'),{},{timeout:120000});
 async function key(k){await page.keyboard.down(k);await page.waitForTimeout(65);await page.keyboard.up(k);await page.waitForTimeout(185);}
 await key('Enter');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').page),'maps');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').preview.list.length),9,'preview completo del mapa');
 await key('Enter');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').page),'characters');
 assert.match(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').charDesc.text),/Arquera/);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').preview.scaleX),4);
 await key('ArrowDown');
 assert.match(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').charDesc.text),/Coloso/);
 await key('ArrowUp');await key('Enter');
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('Game'));
 await page.waitForTimeout(1500);
 assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').platformGroup.getLength()>0),'plataformas');
 assert.deepEqual(await page.evaluate(()=>[...new Set(window.__emboscada.scene.getScene('Game').platformGroup.getChildren().map(p=>p.body.height))]),[16],'hitbox de plataforma');
 assert.deepEqual(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').platformGroup.getChildren().map(p=>p.body.y)),[510,390,510,390,300],'superficie de plataforma');
 assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return {portrait:s.textures.exists(`${s.id}:portrait`),red:s.hpFill.fillColor===0xd94b4b,right:s.scoreHud.x===1252};}),{portrait:true,red:true,right:true},'hud con retrato, barra roja y puntos a la derecha');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();for(const e of s.enemies){e.dead=true;e.sprite.destroy();}s.enemies=[];s.hero.setPosition(170,510);s.hero.body.setVelocity(0,0);s.spawnEnemy(false,0);const e=s.enemies.at(-1);e.sprite.setPosition(250,s.ground);e.speed=0;e.next=Infinity;e.jumpAt=0;});
 await page.waitForTimeout(900);
 assert.ok(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return Math.abs(s.enemies.at(-1).sprite.y-510)<25;}),'enemigo salta a plataforma');
 const initial=await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.x);
 await page.waitForTimeout(150);await page.keyboard.down('d');await page.waitForTimeout(450);await page.keyboard.up('d');
 assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.x)>initial+40,'movimiento');
 await key('Space');
 assert.ok(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return s.hero.y<s.ground-20;}),'salto');
 await key('j');
 assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').nextAttack>0),'ataque');
  await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return s.time.now>s.nextAttack&&s.time.now>s.hurtUntil;});
 await key('k');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').lastAttack),'secondary','ataque secundario');
  await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.cancelAction();s.hero.setPosition(640,s.ground);s.hero.body.setVelocity(0,0);s.hurtUntil=0;s.rollUntil=0;});
 await page.keyboard.down('s');await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.anims.currentAnim?.key.endsWith(':defendStart')),true,'defensa');
  await page.keyboard.up('s');await page.waitForTimeout(700);
   await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.cancelAction();s.hero.setPosition(300,200);s.hero.body.setVelocity(0,-300);s.hurtUntil=0;});
 await page.waitForTimeout(120);
 await key('j');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').lastAttack),'air','ataque aéreo');
  await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.cancelAction();});
 await key('k');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').lastAttack),'special','ataque especial aéreo');
 await key('Escape');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.isPaused('Game')),true,'pausa');
 await key('ArrowDown');await key('Enter');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Overlay').page),'options','opciones desde pausa');
 await key('Escape');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Overlay').page),'main','volver de opciones');
 await key('Enter');
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.isActive('Game')),true,'reanudar');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.score=1234;s.invincible=0;s.damage(1000,s.time.now);});
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('Overlay'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('emboscada-v1')).record),1234);
 await key('Enter');await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hp),100,'reintentar');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();s.wave=4;s.startWave();});
 await page.waitForTimeout(1400);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies.some(e=>e.boss&&e.id==='DemonSlime')),true,'jefe');
 await page.screenshot({path:'test-results/game.png'});
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();for(const e of s.enemies)s.hitEnemy(e,99999);s.pending=0;});
 await page.waitForTimeout(3200);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').wave),6,'avanza oleada');
 for(let i=0;i<4;i++){
  await page.evaluate(()=>{const game=window.__emboscada;game.scene.stop('Game');game.scene.start('Menu',{page:'maps'});});
  await page.waitForTimeout(200);
  for(let j=0;j<i+1;j++)await key('ArrowDown');
  await key('Enter');
  for(let j=0;j<i;j++)await key('ArrowDown');
  await key('Enter');await page.waitForFunction(()=>window.__emboscada.scene.isActive('Game'));await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').id),['LeafRanger','CrystalMauler','GroundMonk','WaterPriestess'][i]);
  await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();s.hero.setPosition(640,s.ground);s.plan={hp:50,speed:0};s.spawnEnemy(false,0);const e=s.enemies.at(-1);e.sprite.setPosition(700,s.ground);e.speed=0;e.hp=50;e.busy=Infinity;s.facing=1;});
  await key('j');await page.waitForTimeout(300);
  assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies.at(-1).hp<50),'ataque causa daño');
  await page.screenshot({path:`test-results/character-${i}.png`});
   await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();for(const e of s.enemies)e.sprite.destroy();s.enemies=[];s.wave=0;s.cancelAction();s.hurtUntil=0;s.hero.setPosition(640,s.ground);s.hero.setVelocity(0);s.comboStep=0;s.comboUntil=0;});
  await page.waitForTimeout(200);
  // Real standard-gamepad RB input, including hold and release frame ranges.
  await page.evaluate(()=>{window.__pad={axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});window.__pad.buttons[5].pressed=true;});
  await page.waitForTimeout(1400);
  assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');const hp=s.hp;s.invincible=0;s.damage(20,s.time.now);return [s.defenseState,s.hero.anims.currentFrame.index,s.hp===hp];}),['hold',[13,5,10,7][i],true],'RB sostiene el frame y bloquea daño');
  await page.evaluate(()=>{window.__pad.buttons[5].pressed=false;});await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.anims.currentAnim.key.endsWith(':defendEnd')),true,'salida de defensa');
  await page.waitForTimeout(650);
  const combo=i===1?['attack','attack2']:i===0?['attack']:['attack','attack2','attack3'];
  for(const action of combo){
   await key('j');
   assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hero.anims.currentAnim.key.split(':')[1]),action,'combo ordenado');
   await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return s.time.now>s.attackUntil;});
  }
  if(i===0){
   await page.keyboard.down('k');await page.waitForTimeout(1550);await page.keyboard.up('k');
   assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').charge),null,'carga terrestre termina a los 1,5 s');
   await page.waitForFunction(()=>window.__emboscada.scene.getScene('Game').projectiles.some(p=>['area','poison'].includes(p.kind)));
   assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').projectiles.some(p=>['area','poison'].includes(p.kind))),'Y cargado');
   await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return s.time.now>s.attackUntil;});
   await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.hero.setPosition(400,200);s.hero.setVelocity(0,-300);});
   await page.waitForTimeout(80);await page.keyboard.down('k');await page.waitForTimeout(600);await page.keyboard.up('k');
   await page.waitForFunction(()=>window.__emboscada.scene.getScene('Game').projectiles.some(p=>p.air&&p.kind==='area'));
   assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').projectiles.some(p=>p.air&&p.kind==='area')),'carga aérea disponible durante el salto');
   await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return s.time.now>s.attackUntil;});
   await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.hero.setPosition(640,s.ground);s.hero.setVelocity(0);});
   // Verify poison ticks and area damage against separate targets.
   assert.deepEqual(await page.evaluate(()=>{
    const s=window.__emboscada.scene.getScene('Game');s.plan={hp:300,speed:0};s.spawnEnemy(false,0);s.spawnEnemy(false,0);
    const [a,b]=s.enemies;a.sprite.body.reset(700,s.ground);b.sprite.body.reset(730,s.ground);a.busy=b.busy=Infinity;a.next=b.next=Infinity;
    a.sprite.body.updateFromGameObject();b.sprite.body.updateFromGameObject();
    s.shoot('poison');s.impact(s.projectiles.at(-1),a);const poisoned=a.poisonUntil>s.time.now;
    s.shoot('area');s.projectiles.at(-1).s.x=700;s.impact(s.projectiles.at(-1),a);
    return [poisoned,a.hp<235,b.hp<300];
   }),[true,true,true],'veneno y daño de área');
   const beforePoison=await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies[0].hp);
   await page.waitForTimeout(1150);
   assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').enemies[0].hp)<beforePoison,'veneno causa daño con el tiempo');
  }
  await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');for(const e of s.enemies)e.sprite.destroy();s.enemies=[];s.hp=50;});
  if(i===0)await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.plan={hp:1000,speed:0};s.spawnEnemy(false,0);s.enemies[0].sprite.setPosition(s.hero.x+180,s.ground);s.enemies[0].busy=Infinity;});
  await page.evaluate(()=>{window.__pad.buttons[1].pressed=true;});await page.waitForTimeout(100);await page.evaluate(()=>{window.__pad.buttons[1].pressed=false;});
  assert.equal(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return s.hero.anims.currentAnim.key.split(':')[1];}),['attack3','special','meditate','heal'][i],'habilidad B');
  assert.equal(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return s.abilityReady>s.time.now;}),true,'recarga de habilidad');
  if(i===0){
   await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return s.time.now>s.attackUntil+1100;});
   assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');return [s.enemies[0].hp<1000,s.children.list.some(o=>o.anims?.currentAnim?.key==='LeafRanger:shower')];}),[true,true],'lluvia de flechas causa daño y reproduce efectos');
  }
  if(i===3){
   await page.waitForFunction(()=>window.__emboscada.scene.getScene('Game').hp===75);
   assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hp),75,'cura limitada a 25');
   await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return s.time.now>s.attackUntil;});
   await key('l');assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').hp),75,'no permite curar durante recarga');
  }
  if(i===2){
   await page.waitForTimeout(3100);
   assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.invincible=0;s.damage(20,s.time.now);return [s.buffUntil>s.time.now,s.hp];}),[true,36],'meditación completa y resistencia');
   assert.equal(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.plan={hp:300,speed:0};s.spawnEnemy(false,0);const e=s.enemies.at(-1);s.deal(e,100);e.sprite.destroy();s.enemies=[];return e.hp;}),150,'beneficio de daño');
   await page.waitForFunction(()=>{const s=window.__emboscada.scene.getScene('Game');return s.time.now>s.hurtUntil;});
   await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.abilityReady=0;s.buffUntil=0;});
   await key('l');
   assert.equal(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.invincible=0;s.damage(1,s.time.now);return s.meditatingUntil;}),0,'daño interrumpe meditación');
   await page.waitForTimeout(3100);
   assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Game').buffUntil),0,'meditación interrumpida no otorga beneficio');
  }
 }
  await verifyCombatTiming(page);
  await page.evaluate(()=>{window.__emboscada.scene.stop('Game');window.__emboscada.scene.start('Menu',{page:'home'});window.__pad={id:'test',index:0,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad]});});
 await page.waitForTimeout(300);
 await page.evaluate(()=>{window.__pad.buttons[13]={pressed:true,value:1};});await page.waitForTimeout(200);
 await page.evaluate(()=>{window.__pad.buttons[13]={pressed:false,value:0};});await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').selected),1,'mando navega');
 await page.evaluate(()=>{window.__pad.buttons[0]={pressed:true,value:1};});await page.waitForTimeout(150);
 await page.evaluate(()=>{window.__pad.buttons[0]={pressed:false,value:0};});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').page),'options','mando confirma');
 assert.deepEqual(errors,[]);
 console.log('OK: carga, menús, previews completos, plataformas, salto enemigo a plataformas, movimiento, salto, ataque básico, secundario, aéreo y especial, defensa, combate de los cuatro personajes, cinco mapas, pausa con opciones, derrota, récord, reinicio, jefe, avance de oleada y mando simulado.');
} finally {await browser?.close();server.kill();}
