import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5181'],{stdio:'pipe'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5181')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto('http://127.0.0.1:5181');
 const manifest=await (await fetch('http://127.0.0.1:5181/assets/manifest.json')).json();
 for(const id of ['LeafRanger','CrystalMauler','GroundMonk','WaterPriestess']){
  let html='<style>body{margin:0;background:#344351;color:white;font:14px Arial}section{display:grid;grid-template-columns:repeat(8,160px)}img{width:160px;height:90px;object-fit:contain;image-rendering:pixelated}div{text-align:center;height:110px}h3{margin:4px}</style>';
  for(const action of ['attack','attack2','attack3','airAttack','special'])html+=`<h3>${id} ${action}</h3><section>`+manifest.actors[id].actions[action].files.map((f,i)=>`<div><img src="http://127.0.0.1:5181/assets/${f}"><br>${i+1}</div>`).join('')+'</section>';
  await page.setContent(html);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:`test-results/frames-${id}.png`,fullPage:true});
 }
}finally{await browser?.close();server.kill();}
