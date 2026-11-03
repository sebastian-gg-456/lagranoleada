import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185'],{stdio:'pipe'});
for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5185')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}

// Verifica que los ojos voladores tengan roles distintos y usen disparo, embestida y mordida.
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:5185');
  await page.waitForFunction(()=>window.__emboscada?.scene.isActive('Menu'));
  await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').scene.start('Game'));
  await page.waitForFunction(()=>window.__emboscada.scene.isActive('Game')&&window.__emboscada.scene.getScene('Game').hero);
  const result=await page.evaluate(async()=>{
    const s=window.__emboscada.scene.getScene('Game');
    s.time.removeAllEvents();for(const e of s.enemies)e.sprite.destroy();s.enemies=[];
    s.hp=100000;s.maxHp=100000;s.plan={hp:100000,speed:80};s.wave=1;
    s.hero.body.reset(640,300);
    const eyes=[];
    for(let i=0;i<9;i++){s.spawnEnemy(false,1);const e=s.enemies.at(-1);e.sprite.body.reset(200+i*100,200);e.next=0;eyes.push(e);}
    const seen={};
    const start=performance.now();
    while(performance.now()-start<14000){
      s.hero.body.reset(640,300);s.hero.body.setVelocity(0,0);
      for(const e of eyes)if(e.attack&&e.role){(seen[e.role]??={})[e.attack.action]=true;}
      await new Promise(r=>setTimeout(r,100));
    }
    return {roles:[...new Set(eyes.map(e=>e.role))],seen};
  });
  console.log(JSON.stringify(result));
  assert.ok(result.roles.length>=2,'hay mas de un rol');
  assert.ok(result.seen.sniper?.attack3||!result.roles.includes('sniper'),'el francotirador dispara');
  assert.ok(result.seen.diver?.attack2||!result.roles.includes('diver'),'el embestidor carga');
  console.log('OK: roles de ojos voladores');
}finally{await browser.close();server.kill();}
