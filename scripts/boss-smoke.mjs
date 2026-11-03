import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184'],{stdio:'pipe'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5184')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5184');await page.waitForFunction(()=>window.__emboscada?.scene.isActive('Menu'));
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').show('help'));
 assert.deepEqual(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons.map(b=>b.label.text)),['Volver']);
 await page.screenshot({path:'test-results/tutorial.png'});
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').show('characters'));
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons[0].fn());
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('Game')&&window.__emboscada.scene.getScene('Game').hero);
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.time.removeAllEvents();s.wave=5;s.plan={boss:'DemonSlime'};s.spawnEnemy(true,0);s.pending=1;s.hero.body.reset(200,s.ground);s.enemies[0].sprite.body.reset(750,s.ground);s.enemies[0].next=Infinity;});
 await page.waitForTimeout(180);
 assert.deepEqual(await page.evaluate(()=>{const e=window.__emboscada.scene.getScene('Game').enemies[0];return [e.sprite.body.velocity.x<0,e.sprite.flipX];}),[true,false],'Morgath avanza a izquierda mirando a izquierda');
 await page.screenshot({path:'test-results/boss-facing-left.png'});
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');s.hero.body.reset(1100,s.ground);});
 await page.waitForTimeout(180);
 assert.deepEqual(await page.evaluate(()=>{const e=window.__emboscada.scene.getScene('Game').enemies[0];return [e.sprite.body.velocity.x>0,e.sprite.flipX];}),[true,true],'Morgath avanza a derecha mirando a derecha');
 assert.deepEqual(await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game'),e=s.enemies[0];
  const result=[];
  for(const dir of [-1,1])for(const distance of [120,210]){
   e.sprite.body.reset(640,s.ground);e.sprite.setFlipX(dir>0);s.hero.body.reset(640+dir*distance,s.ground);s.hero.body.updateFromGameObject();s.hp=100;s.invincible=0;
   s.startEnemyAttack(e,s.time.now);e.sprite.anims.setCurrentFrame(e.sprite.anims.currentAnim.frames[e.attack.frame-1]);result.push(s.hp);
  }return result;
 }),[62,100,62,100],'golpe reducido y orientado hacia ambos lados');
 await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Game');for(const e of s.enemies)e.sprite.destroy();s.enemies=[];s.plan={boss:'Minotaur'};s.spawnEnemy(true,0);const e=s.enemies[0];e.sprite.body.reset(850,s.ground);e.speed=0;e.next=Infinity;s.hero.body.reset(350,s.ground);});
 await page.waitForTimeout(150);
 const feet=await page.evaluate(()=>{
  const s=window.__emboscada.scene.getScene('Game'),e=s.enemies[0],sprite=e.sprite;
  const anim=s.anims.get('Minotaur:idle');
  return anim.frames.map(f=>{
   const image=s.textures.get(f.textureKey).getSourceImage(),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
   let bottom=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(pixels[(y*image.width+x)*4+3]>0)bottom=Math.max(bottom,y+1);
   return {height:image.height,bottom,gap:s.ground-(sprite.y+(bottom-image.height*sprite.originY)*sprite.scaleY),bodyGap:s.ground-sprite.body.bottom};
  });
 });
 assert.ok(feet.every(f=>Math.abs(f.gap)<=3&&Math.abs(f.bodyGap)<=1),JSON.stringify(feet));
 await page.screenshot({path:'test-results/minotaur-grounded.png'});
 assert.deepEqual(errors,[]);
 console.log('OK: tutorial sin calibración, orientación y alcance de Morgath, pies y cuerpo de Minotauro alineados.',feet[0]);
}finally{await browser?.close();server.kill();}
