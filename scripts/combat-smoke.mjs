import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {verifyCombatTiming} from './verify-combat.mjs';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5182'],{stdio:'pipe'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5182')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5182');
 await page.waitForFunction(()=>window.__emboscada?.scene.isActive('Menu'));
 await verifyCombatTiming(page);assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill();}
