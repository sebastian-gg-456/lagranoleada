import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185'],{stdio:'pipe'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5185')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 await page.goto('http://127.0.0.1:5185');
 await page.waitForFunction(()=>window.__emboscada?.scene.isActive('Menu'));
 assert.ok(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons.some(button=>button.label.text==='Campo libre')));
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons[1].fn());
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').page),'field');
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons[0].fn());
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons[3].fn());
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('Training')&&window.__emboscada.scene.getScene('Training').hero&&window.__emboscada.scene.getScene('Training').talkText);
 assert.equal(await page.evaluate(()=>window.__emboscada.scene.getScene('Training').platformGroup.getLength()),0,'practica solo tiene piso');
 await page.evaluate(()=>{
  window.__trainingPad={axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__trainingPad]});
  window.__trainingPad.buttons[0].pressed=true;
 });
 await page.waitForTimeout(100);
 await page.evaluate(()=>{window.__trainingPad.buttons[0].pressed=false;});
 await page.waitForTimeout(100);
 assert.deepEqual(await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('Training');return [s.talkBox.visible,/no siento nada/i.test(s.talkText.text)];}),[true,true],'el boton A del mando activa al muñeco');
 await page.mouse.click(1130,62);
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('Menu')&&window.__emboscada.scene.getScene('Menu').page==='field');
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons[1].fn());
 await page.evaluate(()=>window.__emboscada.scene.getScene('Menu').buttons[0].fn());
 await page.waitForFunction(()=>window.__emboscada.scene.isActive('AILab')&&window.__emboscada.scene.getScene('AILab').labStatus);
 const before=await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('AILab');return {seed:s.seed,platforms:s.scenario.platforms.map(p=>[p.x,p.y,p.exposed]),algorithm:s.algorithm,navigation:s.navigation};});
 await page.mouse.click(850,610);await page.mouse.click(1030,610);await page.mouse.click(1200,610);
 await page.waitForFunction(seed=>window.__emboscada.scene.getScene('AILab').seed===seed,before.seed+1);
 await page.waitForFunction(()=>window.__emboscada.scene.getScene('AILab').enemies.filter(e=>e.id==='Mushroom').every(e=>e.route?.length&&e.routeAlgorithm==='astar'&&e.routeNavigation==='safe'));
 const after=await page.evaluate(()=>{const s=window.__emboscada.scene.getScene('AILab');return {seed:s.seed,platforms:s.scenario.platforms.map(p=>[p.x,p.y,p.exposed]),algorithm:s.algorithm,navigation:s.navigation,hasMushroomRoute:s.enemies.filter(e=>e.id==='Mushroom').every(e=>Array.isArray(e.route)&&e.routeAlgorithm==='astar'&&e.routeNavigation==='safe'),skeletonOnGround:s.enemies.find(e=>e.id==='Skeleton').sprite.body.blocked.down};});
 assert.equal(after.algorithm,'astar','Q cambia BFS por A*');
 assert.equal(after.navigation,'safe','E activa ruta segura');
 assert.notDeepEqual(after.platforms,before.platforms,'R cambia plataformas/riesgos');
 assert.equal(after.hasMushroomRoute,true);
 assert.deepEqual(errors,[]);
 console.log('OK: menú Campo libre, práctica y diálogo, laboratorio BFS/A*, rutas segura/corta y escenario regenerable.');
}finally{await browser?.close();server.kill();}
