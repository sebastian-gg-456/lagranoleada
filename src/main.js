import Phaser from 'phaser';
import {characters,names,descriptions,wavePlan,scoreFor,readSave,bosses} from './rules.js';
import {combatMethods,defenseFrames} from './combat.js';
import {enemyMethods} from './enemies.js';
import {buttonMap,saveButtonMap,calibrationSteps} from './gamepad.js';
import {createNavigationGraph,findPath,generateScenario,nearestSurfaceNode} from './navigation.js';

const W=1280,H=720;
let manifest;
const save=readSave(localStorage);
const session={map:0,character:0};
function persist(){try{localStorage.setItem('emboscada-v1',JSON.stringify(save));}catch{}}
function text(scene,x,y,value,size=24,color='#edf5ff'){return scene.add.text(x,y,value,{fontFamily:'Trebuchet MS, Arial',fontSize:size,color,stroke:'#07101d',strokeThickness:3});}
function play(sprite,id,action){const key=`${id}:${action}`;if(sprite.scene.anims.exists(key))sprite.play(key,true);}
function first(id){const a=manifest.actors[id].actions.idle;return a.sheet?`${id}:idle:sheet`:`${id}:idle:0`;}
function music(scene){if(!scene.sound.get('music'))scene.sound.add('music',{loop:true,volume:save.music}).play();else scene.sound.get('music').setVolume(save.music);}
function tone(scene,freq=440){
 if(!save.sfx || !scene.sound.context)return;
 const ctx=scene.sound.context,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(freq/2,ctx.currentTime+0.1);g.gain.setValueAtTime(save.sfx*0.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.14);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.15);
}
class Controls {
  constructor(scene){this.keys=scene.input.keyboard.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE,J,K,L,SHIFT,ESC,ENTER,FIVE,Q,E,R');this.prev=null;this.prevNav=false;this.lastNav=0;}
 poll(time){
   const p=Array.from(navigator.getGamepads?.()||[]).find(Boolean),b=i=>!!p?.buttons[i]?.pressed,k=this.keys;
   const map=buttonMap(p,localStorage),action=name=>b(map[name]);
  let axis=p?.axes[0]||0;if(Math.abs(axis)<0.25)axis=0;
    const held={jump:k.SPACE.isDown||action('jump'),attack:k.J.isDown||action('attack'),secondary:k.K.isDown||action('secondary'),ability:k.L.isDown||action('ability'),roll:k.SHIFT.isDown||action('roll'),defend:k.S.isDown||k.DOWN.isDown||action('defend'),pause:k.ESC.isDown||action('pause'),ok:k.ENTER.isDown||k.SPACE.isDown||action('jump'),back:k.ESC.isDown||action('ability'),boss:k.FIVE.isDown,algorithm:k.Q.isDown,route:k.E.isDown,regenerate:k.R.isDown};
  const result={x:Phaser.Math.Clamp((k.D.isDown||k.RIGHT.isDown||b(15)?1:0)-(k.A.isDown||k.LEFT.isDown||b(14)?1:0)+axis,-1,1),nav:0};
   for(const key of Object.keys(held))result[key]=!!this.prev&&held[key]&&!this.prev[key];result.defendHeld=!!held.defend;result.secondaryHeld=!!held.secondary;this.prev=held;
  const v=(k.DOWN.isDown||k.S.isDown||b(13)||(p?.axes[1]||0)>0.5?1:0)-(k.UP.isDown||k.W.isDown||b(12)||(p?.axes[1]||0)<-0.5?1:0);
  if(v&&!this.prevNav&&time-this.lastNav>180){result.nav=v;this.lastNav=time;}this.prevNav=v!==0;return result;
 }
}
class Boot extends Phaser.Scene {
 constructor(){super('Boot');}
 preload(){this.load.json('manifest','assets/manifest.json');text(this,640,330,'Preparando la emboscada…',28).setOrigin(0.5);}
 create(){manifest=this.cache.json.get('manifest');this.scene.start('Load');}
}
class Load extends Phaser.Scene {
 constructor(){super('Load');}
 preload(){
  const label=text(this,640,310,'Cargando recursos…',32).setOrigin(0.5);const bar=this.add.rectangle(340,370,0,14,0x5ee5b5).setOrigin(0,0.5);
  this.load.on('progress',p=>{bar.width=600*p;label.setText(`Cargando recursos · ${Math.round(p*100)}%`);});
  this.load.on('loaderror',file=>{console.error('No se pudo cargar',file.src);label.setText('Error al cargar recursos. Revisá la consola.');});
   for(const [id,actor] of Object.entries(manifest.actors)){
    if(actor.portrait)this.load.image(`${id}:portrait`,`assets/${actor.portrait}`);
    for(const [action,a] of Object.entries(actor.actions)){
     if(a.sheet)this.load.spritesheet(`${id}:${action}:sheet`,`assets/${a.sheet}`,{frameWidth:a.width,frameHeight:a.height});
     else a.files.forEach((url,i)=>this.load.image(`${id}:${action}:${i}`,`assets/${url}`));
    }
   }
   manifest.maps.forEach((m,i)=>m.layers.forEach((url,j)=>this.load.image(`map${i}:${j}`,`assets/${url}`)));
   this.load.audio('music',`assets/${manifest.music}`);
   this.load.spritesheet('buttonsXbox','assets/controles/controller_xbox.png',{frameWidth:16,frameHeight:16});
 }
 create(){
  for(const [id,actor] of Object.entries(manifest.actors))for(const [action,a] of Object.entries(actor.actions)){
   const frames=a.sheet?this.anims.generateFrameNumbers(`${id}:${action}:sheet`):a.files.map((_,i)=>({key:`${id}:${action}:${i}`}));
    const rates={idle:6,move:8,attack:10,attack2:9,attack3:9,airAttack:10,special:8,hurt:7,death:6,roll:8,defend:6,heal:8,meditate:5,up:8,down:8};
    if(characters.includes(id))Object.assign(rates,{attack:12,attack2:11,attack3:11,airAttack:12,special:10});
   this.anims.create({key:`${id}:${action}`,frames,frameRate:rates[action]||8,repeat:['idle','move'].includes(action)?-1:0});
   if(action==='defend'&&defenseFrames[id]){
    const split=defenseFrames[id];
    this.anims.create({key:`${id}:defendStart`,frames:frames.slice(0,split),frameRate:12,repeat:0});
    this.anims.create({key:`${id}:defendEnd`,frames:frames.slice(split),frameRate:12,repeat:0});
   }
   }
   this.anims.create({key:'eye:deathFall',frames:this.anims.get('Flying eye:death').frames.slice(0,2).map(f=>({key:f.textureKey,frame:f.textureFrame})),frameRate:6});
   this.anims.create({key:'eye:deathLanding',frames:this.anims.get('Flying eye:death').frames.slice(2).map(f=>({key:f.textureKey,frame:f.textureFrame})),frameRate:6});
   const eyeProjectile=this.anims.get('Flying eye:projectile').frames.map(f=>({key:f.textureKey,frame:f.textureFrame}));
   this.anims.create({key:'eye:projectileFlight',frames:eyeProjectile.slice(0,3),frameRate:10,repeat:-1});
   this.anims.create({key:'eye:projectileImpact',frames:eyeProjectile.slice(3),frameRate:12});
   const g=this.make.graphics({x:0,y:0,add:false});g.fillStyle(0xffffff);g.fillRect(0,0,24,6);g.generateTexture('bolt',24,6);g.clear();g.fillStyle(0x62efb6);g.fillCircle(12,12,12);g.generateTexture('heal',24,24);g.destroy();
  for(const width of new Set(manifest.maps.flatMap(m=>(m.platforms||[]).map(p=>p.w))))caveTexture(this,width);
  this.scene.start('Menu');
 }
}
function caveTexture(scene,width){
 const g=scene.make.graphics({x:0,y:0,add:false}),top=[];
 for(let x=0;x<=width;x+=28)top.push(new Phaser.Geom.Point(x,Phaser.Math.Between(0,5)));
 top[0].y=3;top[top.length-1].y=3;
 g.fillStyle(0x0d161d);g.fillRect(0,10,width,38);
 g.fillStyle(0x24343e);g.fillPoints([...top,new Phaser.Geom.Point(width,48),new Phaser.Geom.Point(0,48)],true);
 g.fillStyle(0x45615f);g.fillRect(0,10,width,3);
 for(let x=6;x<width;x+=52){g.fillStyle(0x6fbf8f,0.45);g.fillRect(x,top[Math.min(top.length-1,Math.floor(x/28))].y+2,Phaser.Math.Between(9,22),3);}
 g.lineStyle(2,0x101a21,0.8);for(let x=24;x<width;x+=74){g.lineBetween(x,16,x+Phaser.Math.Between(-9,9),44);}
 for(let x=34;x<width;x+=97)g.fillTriangle(x,48,x+Phaser.Math.Between(8,17),48,x+5,48+Phaser.Math.Between(4,10));
 g.generateTexture(`cave:${width}`,width,48);g.destroy();
}
function background(scene,index=0,alpha=1){manifest.maps[index].layers.forEach((_,j)=>scene.add.image(640,360,`map${index}:${j}`).setDisplaySize(W,H).setAlpha(alpha));}
class Menu extends Phaser.Scene {
 constructor(){super('Menu');}
 init(data){this.initialPage=data.page||'home';}
 create(){this.controls=new Controls(this);this.show(this.initialPage);}
 show(page){
  this.children.removeAll(true);this.preview=null;this.charDesc=null;this.page=page;this.buttons=[];this.selected=0;background(this,session.map);this.add.rectangle(640,360,W,H,0x07101d,0.8);
  text(this,75,42,'LA GRAN\nEMBOSCADA',52,'#82f5c8').setLineSpacing(-4);
  text(this,77,167,'RESISTÍ. LUCHÁ. SUPERÁ TU RÉCORD.',17,'#b7cbd7');
  let title='',items=[];
  if(page==='home'){
   title='Supervivencia sin fin';items=[['Jugar',()=>this.show('maps')],['Campo libre',()=>this.show('field')],['Opciones',()=>this.show('options')],['Controles',()=>this.show('help')],['Créditos',()=>this.show('credits')]];
   text(this,80,250,'Una caverna. Ninguna salida.\nOleadas cada vez más difíciles.\nUn jefe cada cinco oleadas.',24).setLineSpacing(14);
   text(this,80,445,`RÉCORD  ${save.record.toLocaleString()}`,29,'#ffd382');
  } else if(page==='maps'){
   title='Elegí el escenario';items=manifest.maps.map((m,i)=>[`${i===session.map?'◆ ':''}${m.name}`,()=>{session.map=i;this.show('characters');}]);items.push(['Volver',()=>this.show('home')]);
   this.mapPreview(session.map);text(this,80,530,'Cinco escenarios para sobrevivir.',21);
  } else if(page==='characters'){
   title='Elegí tu personaje';items=characters.map((id,i)=>[names[i],()=>{session.character=i;music(this);this.scene.start('Game');}]);items.push(['Volver',()=>this.show('maps')]);
   this.preview=this.add.sprite(250,650,first(characters[session.character])).setOrigin(0.5,1).setScale(4);play(this.preview,characters[session.character],'idle');this.charDesc=text(this,70,660,descriptions[session.character],19,'#d5e5ee').setWordWrapWidth(560).setLineSpacing(8);
  } else if(page==='field'){
   title='Campo libre';items=[['Práctica de personaje',()=>{session.fieldMode='practice';this.show('free-characters');}],['Laboratorio de IA',()=>{session.fieldMode='ai';this.show('free-characters');}],['Volver',()=>this.show('home')]];
   text(this,80,290,'Probá tus ataques sin oleadas y explorá cómo navegan los NPC.',23).setWordWrapWidth(590);
  } else if(page==='free-characters'){
   title='Elegí tu personaje';items=characters.map((id,i)=>[names[i],()=>{session.character=i;music(this);this.scene.start(session.fieldMode==='ai'?'AILab':'Training');}]);items.push(['Volver',()=>this.show('field')]);
   this.preview=this.add.sprite(250,650,first(characters[session.character])).setOrigin(0.5,1).setScale(4);play(this.preview,characters[session.character],'idle');this.charDesc=text(this,70,660,descriptions[session.character],19,'#d5e5ee').setWordWrapWidth(560).setLineSpacing(8);
  } else if(page==='options'){
   title='Opciones';items=[...optionItems(this,()=>this.show('options')),['Volver',()=>this.show('home')]];text(this,80,295,'Los ajustes se guardan\nautomáticamente en este navegador.',23).setLineSpacing(12);
  } else if(page==='help'){
    title='Tutorial · controles';items=[['Volver',()=>this.show('home')]];
    text(this,55,215,'ACCIÓN',26,'#ffd382');text(this,405,215,'TECLADO',26,'#ffd382');text(this,735,215,'XBOX / PLAYSTATION',26,'#ffd382');
    const rows=[['Mover','A/D o flechas','Stick / D-pad',8],['Saltar','Espacio','A / Cruz',6],['Básico / combo','J','X / Cuadrado',2],['Secundario / carga','K','Y / Triángulo',0],['Habilidad','L','B / Círculo',4],['Defender (mantener)','S / Abajo','RB / R1',17],['Rodar','Shift','LB / L1',15],['Pausa','Esc','Start / Options',14],['Probar siguiente jefe','5','—',null]];
    rows.forEach(([label,key,pad,row],i)=>{const y=263+i*48;text(this,55,y,label,25);text(this,405,y,key,25);text(this,800,y,pad,25);if(i===5||i===6){this.add.rectangle(755,y+15,48,30,0x34445c).setStrokeStyle(2,0xc4d6ed);text(this,755,y+15,i===5?'RB':'LB',19).setOrigin(0.5);}else if(row!==null)this.add.image(755,y+15,'buttonsXbox',row*7+3).setScale(3);});
   } else if(page==='calibrate'){
    title='Calibrar mando';items=[['Cancelar',()=>this.show('help')]];
    this.calibration={step:0,map:{},released:false,id:null};
    this.calibrationText=text(this,70,260,'Soltá los botones y conectá tu mando.',28).setWordWrapWidth(620).setLineSpacing(15);
  } else {
   title='Créditos';items=[['Volver',()=>this.show('home')]];
   text(this,80,235,'Juego desarrollado con Phaser 3.\n\nArte: packs Elementals, Monsters Creatures Fantasy,\nForest Monsters, Demon Slime, Frost Guardian,\nMinotaur, Crystal Cave y Parallax Cave.\nMúsica: Japanese Music Pack.\n\nDocumentos originales conservados con los recursos.',21).setLineSpacing(10);
  }
   text(this,760,page==='help'?38:198,title,26,'#ffd382');
   items.forEach(([label,fn],i)=>this.button(760,(page==='help'?80:250)+i*55,label,fn));
  this.highlight();
 }
  button(x,y,label,fn){const i=this.buttons.length;const bg=this.add.rectangle(x,y,440,45,0x14263a).setOrigin(0,0);const labelObj=text(this,x+16,y+9,label,22);bg.setInteractive({useHandCursor:true}).on('pointerover',()=>{this.selected=i;this.highlight();}).on('pointerdown',()=>{tone(this);fn();});this.buttons.push({bg,label:labelObj,fn});}
  mapPreview(index){this.preview?.destroy();this.preview=this.add.container(300,370);this.preview.add(manifest.maps[index].layers.map((_,layer)=>this.add.image(0,0,`map${index}:${layer}`).setDisplaySize(460,259)));}
  highlight(){this.buttons.forEach((b,i)=>{b.bg.setFillStyle(i===this.selected?0x276451:0x14263a);b.label.setColor(i===this.selected?'#ffffff':'#bfcedc');});if(this.preview&&this.page==='maps'&&this.selected<manifest.maps.length)this.mapPreview(this.selected);if(this.preview&&['characters','free-characters'].includes(this.page)&&this.selected<characters.length){play(this.preview,characters[this.selected],'idle');this.charDesc?.setText(descriptions[this.selected]);}}
  updateCalibration(){
   const cal=this.calibration,p=Array.from(navigator.getGamepads?.()||[]).find(Boolean);
   if(this.controls.keys.ESC.isDown){this.show('help');return;}
   if(!p)return;
   if(cal.id!==p.id){cal.id=p.id;cal.step=0;cal.map={};cal.released=false;}
   const pressed=p.buttons.flatMap((b,i)=>b.pressed?[i]:[]),[action,label]=calibrationSteps[cal.step];
   if(!pressed.length){cal.released=true;this.calibrationText.setText(`Paso ${cal.step+1} / 7\nPulsá ${label}\n\n${p.id}`);return;}
   if(!cal.released||pressed.length!==1)return;
   cal.released=false;
   if(Object.values(cal.map).includes(pressed[0])){this.calibrationText.setText('Ese botón ya está asignado.\nSoltalo y pulsá el botón solicitado.');return;}
   cal.map[action]=pressed[0];cal.step++;
   if(cal.step===calibrationSteps.length){try{saveButtonMap(p.id,cal.map,localStorage);this.show('help');}catch{cal.step=0;cal.map={};this.calibrationText.setText('No se pudo guardar la calibración. Revisá el almacenamiento del navegador.');}}
  }
  update(time){if(this.page==='calibrate'){this.updateCalibration();return;}const c=this.controls.poll(time);if(c.nav){this.selected=Phaser.Math.Wrap(this.selected+c.nav,0,this.buttons.length);this.highlight();}if(c.ok){tone(this);this.buttons[this.selected]?.fn();}else if(c.back&&this.page!=='home')this.show(this.page==='free-characters'?'field':'home');}
}
function optionItems(scene,refresh){return [
 [`Música: ${Math.round(save.music*100)}%`,()=>{save.music=+(save.music>=1?0:Math.min(1,save.music+0.25)).toFixed(2);scene.sound.get('music')?.setVolume(save.music);persist();refresh();}],
 [`Efectos: ${Math.round(save.sfx*100)}%`,()=>{save.sfx=+(save.sfx>=1?0:Math.min(1,save.sfx+0.25)).toFixed(2);persist();tone(scene);refresh();}],
 ['Pantalla completa',()=>{if(scene.scale.isFullscreen)scene.scale.stopFullscreen();else scene.scale.startFullscreen();}]
];}

class Game extends Phaser.Scene {
  constructor(){super('Game');}
  init(data){this.testBossWave=data?.bossWave||0;}
 create(){
   this.controls=new Controls(this);this.wave=0;this.score=0;this.kills=0;this.hp=100;this.maxHp=100;this.finished=false;this.between=false;this.pending=0;this.nextAttack=0;this.invincible=0;this.rollUntil=0;this.attackUntil=0;this.hurtUntil=0;this.comboUntil=0;this.lastAttack='';this.facing=1;this.defending=false;this.enemies=[];this.projectiles=[];this.enemyProjectiles=[];this.heals=[];
  background(this,session.map);this.ground=manifest.maps[session.map].ground;
  const mapPlatforms=manifest.maps[session.map].platforms||[];
  this.navigationGraph=createNavigationGraph(this.ground,mapPlatforms);this.aiAlgorithm='astar';this.aiNavigation='short';
  this.add.rectangle(640,this.ground+35,1280,70,0x07101d,0.32);
  this.platform=this.add.rectangle(640,this.ground+40,1280,80,0x000000,0);this.physics.add.existing(this.platform,true);
  this.platformGroup=this.physics.add.staticGroup();
   for(const p of mapPlatforms){const img=this.platformGroup.create(p.x,p.y+24,`cave:${p.w}`);img.setDepth(8).refreshBody();img.body.setSize(p.w,16,false).setOffset(0,0);img.body.checkCollision.down=false;img.body.checkCollision.left=false;img.body.checkCollision.right=false;}
   this.id=characters[session.character];this.hero=this.actor(640,this.ground,this.id,1.65);this.hero.setCollideWorldBounds(true);this.physics.add.collider(this.hero,this.platform);this.physics.add.collider(this.hero,this.platformGroup);
   this.initCombat();
   this.skillHud=text(this,20,690,'',16,'#82f5c8').setDepth(100);
  this.add.rectangle(640,40,1280,80,0x07101d,0.85).setDepth(90);
  this.add.rectangle(48,40,74,74,0x0b1722,0.96).setStrokeStyle(3,0x82f5c8,0.9).setDepth(99);
  this.add.image(48,40,`${this.id}:portrait`).setScale(0.95).setDepth(100);
  this.add.rectangle(94,31,300,24,0x1b2733,1).setOrigin(0,0).setStrokeStyle(2,0x000000,0.65).setDepth(99);
  this.hpFill=this.add.rectangle(97,34,294,18,0xd94b4b,1).setOrigin(0,0).setDepth(100);
  this.hpText=text(this,244,27,'100 / 100',14,'#ffffff').setOrigin(0.5,0).setDepth(101);
  this.scoreHud=text(this,1252,14,'',25,'#ffd382').setOrigin(1,0).setDepth(100);this.waveHud=text(this,1252,48,'',16,'#c7dbe7').setOrigin(1,0).setDepth(100);
   this.banner=text(this,640,185,'',42,'#ffd382').setOrigin(0.5).setDepth(100);this.bossHud=text(this,640,98,'',23,'#ff9b9b').setOrigin(0.5).setDepth(100);
   this.bossBack=this.add.rectangle(240,121,800,24,0x261522).setOrigin(0).setStrokeStyle(2,0xffc57d).setDepth(99).setVisible(false);
   this.bossFill=this.add.rectangle(243,124,794,18,0xc82c4d).setOrigin(0).setDepth(100).setVisible(false);
   if(this.testBossWave){this.wave=this.testBossWave-1;this.startWave();}else this.waveEvent=this.time.delayedCall(900,()=>this.startWave());
  this.blur=()=>{if(this.scene.isActive()&&!this.finished)this.pause();};this.game.events.on(Phaser.Core.Events.BLUR,this.blur);this.events.once('shutdown',()=>this.game.events.off(Phaser.Core.Events.BLUR,this.blur));
  music(this);
 }
 actor(x,y,id,scale){
  const a=manifest.actors[id],s=this.physics.add.sprite(x,y,first(id)).setOrigin(0.5,a.foot).setScale(scale).setDepth(20);
  const h=id==='ForestMushroom'?34:id==='FrostGuardian'?72:id==='DemonSlime'||id==='Minotaur'?90:48;
  const width=id==='DemonSlime'||id==='Minotaur'?60:25;
  s.body.setSize(width,h).setOffset((s.width-width)/2,s.height*a.foot-h);play(s,id,'idle');return s;
 }
 startWave(){
  if(this.finished)return;this.between=false;this.wave++;this.plan=wavePlan(this.wave);this.pending=this.plan.count+(this.plan.boss?1:0);this.banner.setText(`OLEADA ${this.wave}${this.plan.boss?' · JEFE':''}`);
  this.time.delayedCall(2000,()=>this.banner.setText(''));
  for(let i=0;i<this.plan.count;i++)this.time.delayedCall(i*650,()=>{if(!this.finished){this.spawnEnemy(false,i);this.pending--;}});
  if(this.plan.boss)this.time.delayedCall(1200,()=>{if(!this.finished){this.spawnEnemy(true,0);this.pending--;}});
 }
 spawnEnemy(boss,i){
   const types=['Mushroom','Skeleton','Flying eye'];const id=boss?this.plan.boss:types[(i+this.wave)%types.length];const left=Math.random()<0.5;
   const sprite=this.actor(left?(boss?200:90):(boss?1080:1190),id==='Flying eye'?200:this.ground,id,boss?bosses[id].scale:1.8);
  this.physics.add.collider(sprite,this.platform);this.physics.add.collider(sprite,this.platformGroup);sprite.setCollideWorldBounds(true);
    const e={sprite,id,boss,hp:boss?900+this.wave*90:this.plan.hp,max:boss?900+this.wave*90:this.plan.hp,speed:boss?75:this.plan.speed,next:this.time.now+1200,busy:0,jumpAt:0,hurtUntil:0,shieldUntil:0,shieldReady:0,recoverUntil:0,shots:0,dead:false,state:'patrol',route:[],routeAt:0,patrolDirection:left?1:-1};this.enemies.push(e);
    if(id==='Flying eye'){sprite.body.setAllowGravity(false);e.next=this.time.now+4500+Math.random()*2000;}
   sprite.on('animationupdate',(anim,frame)=>this.advanceEnemyAttack(e,anim,frame));
    sprite.on('animationcomplete',anim=>{
     if(e.attack?.key===anim.key){this.advanceEnemyAttack(e,anim,anim.frames.at(-1));e.attack=null;e.busy=this.time.now;e.recoverUntil=this.time.now+e.recovery;}
     if(e.dead&&(anim.key===`${id}:death`||anim.key==='eye:deathLanding'))sprite.destroy();
    });
 }
  hitEnemy(e,damage,poison=false){
    if(e.dead)return false;
    if(!poison&&!e.frozen&&this.time.now<e.shieldUntil){e.sprite.setTint(0xb5e5ff);this.time.delayedCall(100,()=>{if(e.sprite.active&&!e.frozen)e.sprite.clearTint();});return false;}
    e.hp-=damage;e.attack=null;e.dash=null;e.busy=0;e.sprite.setTint(e.frozen?0x80e6ff:0xffb3a5);this.time.delayedCall(100,()=>{if(e.sprite.active&&!e.frozen)e.sprite.clearTint();});
    if(e.hp<=0){
     e.dead=true;e.state='dead';e.stateEnteredAt=this.time.now;e.sprite.anims.resume();e.sprite.body.moves=true;e.sprite.body.stop();this.kills++;this.score+=scoreFor(e.boss);if(Math.random()<0.15||e.boss)this.dropHeal(e.sprite.x);
     if(e.id==='Flying eye'){e.fallingDeath=true;e.sprite.body.setAllowGravity(true);e.sprite.play('eye:deathFall');}
     else{e.sprite.body.enable=false;if(this.anims.exists(`${e.id}:death`))play(e.sprite,e.id,'death');else this.tweens.add({targets:e.sprite,alpha:0,duration:500,onComplete:()=>e.sprite.destroy()});}
    }else if(!e.frozen){e.hurtUntil=this.time.now+(e.boss?180:450);e.state='hurt';e.stateEnteredAt=this.time.now;play(e.sprite,e.id,'hurt');}
    return true;
 }
 dropHeal(x){const s=this.physics.add.image(x,this.ground-18,'heal').setDepth(25);s.body.setAllowGravity(false);this.heals.push(s);this.tweens.add({targets:s,y:s.y-9,yoyo:true,repeat:-1,duration:650});}
 damage(amount,time){
   if(time<this.invincible||this.finished)return;
   if(this.defending){tone(this,260);return;}
    this.meditatingUntil=0;
   this.hp=Math.max(0,this.hp-Math.max(1,Math.round(amount*(time<this.buffUntil?0.7:1))));this.invincible=time+850;this.hero.setTint(0xff7777);tone(this,120);this.cameras.main.shake(100,0.004);
    // Hurt is cosmetic, never a movement/input lock or an attack interruption.
    if(!this.activeAction&&!this.defenseState){play(this.hero,this.id,'hurt');this.hurtUntil=time+this.hero.anims.currentAnim.duration;}
  this.time.delayedCall(160,()=>{if(this.hero.active)this.hero.clearTint();});if(this.hp===0)this.end();
 }
 pause(){if(this.finished||!this.scene.isActive())return;this.scene.launch('Overlay',{kind:'pause'});this.scene.pause();}
   end(){this.finished=true;this.cancelAction();this.charge=null;this.meditatingUntil=0;this.hero.setVelocity(0);play(this.hero,this.id,'death');save.record=Math.max(save.record,this.score);persist();this.time.delayedCall(this.hero.anims.currentAnim.duration,()=>{this.scene.launch('Overlay',{kind:'over',score:this.score,wave:this.wave,kills:this.kills});this.scene.pause();});}
 update(time){
   if(this.finished)return;const c=this.controls.poll(time);if(c.boss){this.scene.restart({bossWave:(Math.floor(this.wave/5)+1)*5});return;}if(c.pause){this.pause();return;}
  const h=this.hero,grounded=h.body.blocked.down||h.body.touching.down;
    if(c.x&&!this.facingLocked(time))this.facing=Math.sign(c.x);h.setFlipX(this.facing<0);
   this.updateCombat(c,time,grounded);
    if(c.roll&&time>this.rollUntil+850&&grounded&&!this.defenseState&&!this.meditatingUntil){this.cancelAction();this.charge=null;this.hurtUntil=0;this.rollUntil=time+350;this.invincible=time+430;play(h,this.id,'roll');tone(this,300);}
     const rooted=!!this.defenseState||!!this.meditatingUntil||!!this.activeAction||!!this.charge;
     h.setVelocityX(time<this.rollUntil?this.facing*500:rooted?0:c.x*220);
    if(c.jump&&grounded&&!rooted&&time>=this.rollUntil){h.setVelocityY(-700);tone(this,480);}
    if(!this.busy(time)&&time>=this.hurtUntil)play(h,this.id,!grounded?(h.body.velocity.y<0?'up':'down'):Math.abs(c.x)>0.1?'move':'idle');
   this.updateEnemies(time);
   for(const p of this.projectiles){
    if(!p.s.active)continue;if(time>p.expires||p.s.x<0||p.s.x>W){p.s.destroy();continue;}
    for(const e of this.enemies){if(!e.dead&&e.sprite.active&&Phaser.Geom.Intersects.RectangleToRectangle(p.s.body,e.sprite.body)){this.impact(p,e);break;}}
    if(p.s.active&&p.air){const floor=this.surfaceBelow(p.s.x,p.previousY+20);if(p.s.y+20>=floor){p.s.y=floor;this.impact(p,null);}p.previousY=p.s.y;}
   }
  this.projectiles=this.projectiles.filter(p=>p.s.active);
   for(const s of this.heals)if(s.active&&Math.abs(s.x-h.x)<45&&Math.abs(s.y-h.y)<80){this.hp=Math.min(this.maxHp,this.hp+25);tone(this,850);s.destroy();}
  this.heals=this.heals.filter(s=>s.active);this.enemies=this.enemies.filter(e=>e.sprite.active);
   const alive=this.enemies.filter(e=>!e.dead);if(this.wave>0&&this.pending===0&&alive.length===0&&!this.between){this.between=true;this.score+=this.wave*50;this.hp=Math.min(100,this.hp+10);save.record=Math.max(save.record,this.score);persist();this.banner.setText('OLEADA SUPERADA · +10 VIDA');this.time.delayedCall(2800,()=>this.startWave());}
   const boss=alive.find(e=>e.boss);this.bossHud.setText(boss?`${bosses[boss.id].name}   ${Math.ceil(boss.hp)} / ${boss.max}`:'');
   this.bossBack.setVisible(!!boss);this.bossFill.setVisible(!!boss);if(boss)this.bossFill.width=794*Math.max(0,boss.hp)/boss.max;
  this.hpFill.width=294*this.hp/this.maxHp;this.hpText.setText(`${Math.ceil(this.hp)} / ${this.maxHp}`);this.scoreHud.setText(`PUNTOS ${this.score}`);this.waveHud.setText(`OLEADA ${this.wave} · ENEMIGOS ${alive.length+this.pending}`);
 }
}
Object.assign(Game.prototype,combatMethods);
Object.assign(Game.prototype,enemyMethods);
class FieldArena extends Phaser.Scene {
 constructor(key){super(key);}
 createFloor(){
  this.ground=650;this.add.rectangle(640,this.ground+12,W,24,0x24343e).setDepth(5);this.add.rectangle(640,this.ground+35,W,70,0x07101d,0.35);
  this.floor=this.add.rectangle(640,this.ground+40,W,80,0x000000,0);this.physics.add.existing(this.floor,true);
  this.platformGroup=this.physics.add.staticGroup();
 }
 createPlatforms(platforms){
  this.platformGroup.clear(true,true);
  for(const p of platforms){
   const key=`field-platform-${p.w}`;
   if(!this.textures.exists(key)){const g=this.make.graphics({x:0,y:0,add:false});g.fillStyle(0x24343e);g.fillRect(0,0,p.w,20);g.fillStyle(0x62bd91);g.fillRect(0,0,p.w,4);g.generateTexture(key,p.w,20);g.destroy();}
   const sprite=this.platformGroup.create(p.x,p.y+10,key).setDepth(8).refreshBody();
   sprite.body.setSize(p.w,12,false).setOffset(0,0);sprite.body.checkCollision.down=false;sprite.body.checkCollision.left=false;sprite.body.checkCollision.right=false;
  }
 }
 createHero(){
  this.id=characters[session.character];const actor=manifest.actors[this.id];
  this.hero=this.physics.add.sprite(350,this.ground,first(this.id)).setOrigin(0.5,actor.foot).setScale(1.65).setDepth(20);
  this.hero.body.setSize(25,48).setOffset((this.hero.width-25)/2,this.hero.height*actor.foot-48);
  this.hero.setCollideWorldBounds(true);this.physics.add.collider(this.hero,this.floor);this.physics.add.collider(this.hero,this.platformGroup);
  this.skillHud=text(this,20,690,'',16,'#82f5c8').setDepth(100);
  this.initCombat();this.hp=100;this.maxHp=100;this.invincible=0;this.rollUntil=0;this.finished=false;
 }
 actor(x,y,id,scale=1.8){
  const actor=manifest.actors[id],sprite=this.physics.add.sprite(x,y,first(id)).setOrigin(0.5,actor.foot).setScale(scale).setDepth(20);
  const height=id==='FrostGuardian'?72:id==='DemonSlime'||id==='Minotaur'?90:48,width=id==='DemonSlime'||id==='Minotaur'?60:25;
  sprite.body.setSize(width,height).setOffset((sprite.width-width)/2,sprite.height*actor.foot-height);
  sprite.setCollideWorldBounds(true);this.physics.add.collider(sprite,this.floor);this.physics.add.collider(sprite,this.platformGroup);
  play(sprite,id,'idle');return sprite;
 }
 surfaceBelow(x,y){return Math.min(this.ground,...this.platformGroup.getChildren().filter(p=>x>=p.body.x&&x<=p.body.right&&p.body.y>=y-2).map(p=>p.body.y));}
 movePlayer(c,time,grounded,allowJump=true){
  if(c.x&&!this.facingLocked(time))this.facing=Math.sign(c.x);
  this.hero.setFlipX(this.facing<0);this.updateCombat(c,time,grounded);
  if(c.roll&&time>this.rollUntil+850&&grounded&&!this.defenseState&&!this.meditatingUntil){
   this.cancelAction();this.charge=null;this.rollUntil=time+350;this.invincible=time+430;play(this.hero,this.id,'roll');tone(this,300);
  }
  const rooted=!!this.defenseState||!!this.meditatingUntil||!!this.activeAction||!!this.charge;
  this.hero.setVelocityX(time<this.rollUntil?this.facing*500:rooted?0:c.x*220);
  if(allowJump&&c.jump&&grounded&&!rooted&&time>=this.rollUntil){this.hero.setVelocityY(-700);tone(this,480);}
  if(!this.busy(time)&&time>=this.hurtUntil)play(this.hero,this.id,!grounded?(this.hero.body.velocity.y<0?'up':'down'):Math.abs(c.x)>0.1?'move':'idle');
 }
 updatePlayerProjectiles(time){
  for(const p of this.projectiles){
   if(!p.s.active)continue;
   if(time>p.expires||p.s.x<0||p.s.x>W){p.s.destroy();continue;}
   for(const e of this.enemies)if(!e.dead&&e.sprite.active&&Phaser.Geom.Intersects.RectangleToRectangle(p.s.body,e.sprite.body)){this.impact(p,e);break;}
   if(p.s.active&&p.air){const floor=this.surfaceBelow(p.s.x,p.previousY+20);if(p.s.y+20>=floor){p.s.y=floor;this.impact(p,null);}p.previousY=p.s.y;}
  }
  this.projectiles=this.projectiles.filter(p=>p.s.active);
 }
 damage(amount,time){
  if(time<this.invincible||this.finished)return;
  if(this.defending)return;
  this.hp=Math.max(1,this.hp-Math.max(1,Math.round(amount*(time<this.buffUntil?0.7:1))));this.invincible=time+850;
  this.hero.setTint(0xff7777);this.time.delayedCall(160,()=>{if(this.hero.active)this.hero.clearTint();});
 }
 returnToField(){this.scene.start('Menu',{page:'field'});}
}
Object.assign(FieldArena.prototype,combatMethods);
Object.assign(FieldArena.prototype,enemyMethods);

class Training extends FieldArena {
 constructor(){super('Training');}
 create(){
  this.controls=new Controls(this);this.enemies=[];this.projectiles=[];this.enemyProjectiles=[];this.heals=[];
  this.createFloor();this.createHero();
  const g=this.make.graphics({x:0,y:0,add:false});
  // Wooden training dummy: base, post, arms, straw torso with target, stitched sack head.
  g.fillStyle(0x000000,0.28);g.fillEllipse(60,168,100,16);
  g.fillStyle(0x5b3d2a);g.fillRect(14,154,92,14);g.fillStyle(0x7a5539);g.fillRect(14,154,92,5);
  g.fillStyle(0x6b4630);g.fillRect(52,70,16,86);g.fillStyle(0x8a6244);g.fillRect(52,70,6,86);
  g.fillStyle(0x6b4630);g.fillRect(14,76,92,12);g.fillStyle(0x8a6244);g.fillRect(14,76,92,4);
  g.fillStyle(0x4a2f20);g.fillRect(10,72,10,20);g.fillRect(100,72,10,20);
  g.fillStyle(0xcfa65a);g.fillRoundedRect(32,60,56,62,10);g.fillStyle(0xe5c377);g.fillRoundedRect(32,60,56,16,8);
  g.fillStyle(0x9c7a3c);g.fillRect(32,108,56,6);g.fillRect(32,92,56,4);
  g.fillStyle(0xf4efe4);g.fillCircle(60,92,19);g.fillStyle(0xd9473f);g.fillCircle(60,92,14);g.fillStyle(0xf4efe4);g.fillCircle(60,92,9);g.fillStyle(0xd9473f);g.fillCircle(60,92,4);
  g.fillStyle(0xc9a06a);g.fillCircle(60,36,26);g.fillStyle(0xdeb882);g.fillCircle(55,31,18);
  g.fillStyle(0x2a2320);g.fillRect(46,30,6,6);g.fillRect(66,30,6,6);g.fillRect(50,46,20,3);
  g.fillRect(52,44,2,7);g.fillRect(58,44,2,7);g.fillRect(64,44,2,7);
  g.fillStyle(0x9c3d3d);g.fillRect(36,56,48,7);
  g.generateTexture('training-dummy',120,172);g.destroy();
  const sprite=this.physics.add.sprite(900,this.ground+4,'training-dummy').setOrigin(0.5,1).setScale(0.8).setDepth(20);
  sprite.body.setAllowGravity(false);sprite.body.setImmovable(true);sprite.body.setSize(56,120).setOffset(32,46);
  this.dummy={sprite,id:'TrainingDummy',boss:false,hp:10000,max:10000,dead:false,frozen:false,shieldUntil:0};
  this.enemies=[this.dummy];this.hitCount=0;this.lastDamage=0;this.talkIndex=0;this.talkHeld=false;
  this.add.rectangle(640,45,1280,90,0x07101d,0.88).setDepth(90);
  text(this,30,20,`CAMPO LIBRE · ${names[session.character]}`,23,'#82f5c8').setDepth(100);
  text(this,30,55,'Piso de práctica · atacá al muñeco · A del mando o Enter: hablar con él · Esc: volver',17).setDepth(100);
  this.dummyStatus=text(this,900,450,'',18,'#ffd382').setOrigin(0.5).setDepth(100);
  this.dummyName=text(this,900,476,'MAESTRO MUÑECO',16,'#82f5c8').setOrigin(0.5).setDepth(100);
  this.prompt=text(this,900,498,'▼ Hablá con él (A / Enter)',15,'#edf5ff').setOrigin(0.5).setDepth(100);
  this.tweens.add({targets:this.prompt,alpha:0.35,yoyo:true,repeat:-1,duration:700});
  this.talkBox=this.add.rectangle(640,185,1180,150,0x07101d,0.96).setStrokeStyle(3,0x82f5c8).setDepth(100);
  const pg=this.make.graphics({x:0,y:0,add:false});
  pg.fillStyle(0x14263a);pg.fillRect(0,0,110,110);
  pg.fillStyle(0x6b4630);pg.fillRect(0,92,110,18);pg.fillStyle(0xcfa65a);pg.fillRoundedRect(12,84,86,40,10);
  pg.fillStyle(0x9c3d3d);pg.fillRect(26,80,58,9);
  pg.fillStyle(0xc9a06a);pg.fillCircle(55,46,34);pg.fillStyle(0xdeb882);pg.fillCircle(49,40,24);
  pg.fillStyle(0x2a2320);pg.fillRect(38,38,8,8);pg.fillRect(64,38,8,8);pg.fillRect(42,60,26,4);
  pg.fillRect(44,58,3,9);pg.fillRect(52,58,3,9);pg.fillRect(60,58,3,9);
  pg.generateTexture('dummy-portrait',110,110);pg.destroy();
  this.talkPortrait=this.add.image(110,185,'dummy-portrait').setScale(1.1).setDepth(101);
  this.talkName=text(this,190,125,'',20,'#ffd382').setDepth(101);
  this.talkText=text(this,190,157,'',21,'#edf5ff').setWordWrapWidth(1020).setLineSpacing(8).setDepth(101);
  this.talkItems=[this.talkBox,this.talkPortrait,this.talkName,this.talkText];this.talkItems.forEach(item=>item.setVisible(false));
  this.updateDummyStatus();
  this.playerStatus=text(this,1250,22,'100 / 100',18,'#ffffff').setOrigin(1,0).setDepth(100);
  const back=this.add.rectangle(1130,62,190,32,0x14263a).setStrokeStyle(2,0x82f5c8).setDepth(100).setInteractive({useHandCursor:true});
  text(this,1130,62,'Volver al campo',15).setOrigin(0.5).setDepth(101);back.on('pointerdown',()=>this.returnToField());
 }
 closeTalk(){
  this.talkHide?.remove();this.talkIndex=0;
  this.talkItems.forEach(item=>item.setVisible(false));this.prompt.setVisible(true);
 }
 updateDummyStatus(){
  this.dummyStatus.setText(this.hitCount?`Golpes: ${this.hitCount} · último daño: ${this.lastDamage}`:'Sin un rasguño (todavía)');
 }
 hitEnemy(e,damage){
  this.hitCount++;this.lastDamage=Math.round(damage);e.hp=e.max;
  e.sprite.setTint(0xffd49a);this.time.delayedCall(120,()=>{if(e.sprite.active)e.sprite.clearTint();});
  // Wobble away from the hero, like a real training post.
  const side=this.hero.x<e.sprite.x?1:-1;this.tweens.killTweensOf(e.sprite);e.sprite.setAngle(0);
  this.tweens.add({targets:e.sprite,angle:{from:side*9,to:0},duration:420,ease:'Elastic.easeOut'});
  this.updateDummyStatus();
  return true;
 }
 update(time){
  const c=this.controls.poll(time);if(c.pause){this.returnToField();return;}
  const talkPressed=!!(c.jump||c.ok),talkEdge=talkPressed&&!this.talkHeld;this.talkHeld=talkPressed;
  if(talkEdge){
   const lines={
    LeafRanger:['Tenés puntería de elfa: tu fuerte es pelear de lejos. Mantené la distancia y dejá que cada flecha haga el trabajo.','Cargá bien el disparo y vas a cubrir una zona entera. De cerca sos frágil, así que no me pegues desde acá, ¡alejate!','Dicen que una elfa no falla. Yo no me muevo: ¡demostralo!'],
    CrystalMauler:['Sos una muralla de cristal: lento, pero cada golpe tuyo pesa de verdad. Dejá que se acerquen y aplastalos.','Tu fuerza bruta rompe formaciones enteras. Hacé temblar el suelo y no des un paso atrás.','Pegame con todo lo que tengas, coloso. Yo aguanto.'],
    GroundMonk:['Sos puro ritmo y disciplina: combos veloces, siempre pegado al enemigo. Quien te toca, ya perdió.','Cuando medites te volvés más duro y más fuerte. Aprovechá cada respiro para ganar ventaja.','Esquivá, golpeá, esquivá. Así se entrena un monje.'],
    WaterPriestess:['Dominás el agua: congelás al enemigo y cuidás a los tuyos. Con calma, sos la más difícil de vencer.','Tu magia te cura y detiene a quien se acerque. Sobrevivir también es una forma de ganar.','El hielo te obedece. Practicá conmigo, que no me quejo.']
   }[this.id];
   if(this.talkIndex>=lines.length)this.closeTalk();
   else{
    const outro=this.talkIndex===0?'\nNo dudes en probar tus ataques conmigo; total, no siento nada.':'';
    this.talkName.setText('MAESTRO MUÑECO');this.talkText.setText(`${lines[this.talkIndex]}${outro}`);
    this.talkIndex++;
    this.talkItems.forEach(item=>item.setVisible(true));this.prompt.setVisible(false);
    // The dialogue ends by itself after the last line instead of looping.
    this.talkHide?.remove();this.talkHide=this.time.delayedCall(this.talkIndex>=lines.length?7000:12000,()=>this.closeTalk());
   }
  }
  const grounded=this.hero.body.blocked.down||this.hero.body.touching.down;
  this.movePlayer(c,time,grounded,false);this.updatePlayerProjectiles(time);
  for(const heal of this.heals)if(heal.active&&Math.abs(heal.x-this.hero.x)<45&&Math.abs(heal.y-this.hero.y)<80){this.hp=Math.min(this.maxHp,this.hp+25);heal.destroy();}
  this.heals=this.heals.filter(heal=>heal.active);this.playerStatus.setText(`${Math.ceil(this.hp)} / ${this.maxHp}`);
 }
}
class AILab extends FieldArena {
 constructor(){super('AILab');}
 create(){
  this.controls=new Controls(this);this.algorithm='bfs';this.navigation='short';this.seed=1;this.enemies=[];this.projectiles=[];this.enemyProjectiles=[];this.heals=[];
  this.createFloor();this.createHero();
  this.routeGraphics=this.add.graphics().setDepth(30);this.scenarioLabels=[];this.scenario=generateScenario(this.seed);this.installScenario();
  this.spawnLabEnemy('Mushroom',230,this.ground);this.spawnLabEnemy('Mushroom',1060,this.ground);
  this.spawnLabEnemy('Skeleton',420,this.ground);this.spawnLabEnemy('Flying eye',820,190);
  this.add.rectangle(640,48,1280,96,0x07101d,0.9).setDepth(90);
  text(this,25,14,'LABORATORIO DE IA · BFS / A* · RUTAS CORTAS Y SEGURAS',21,'#82f5c8').setDepth(100);
  this.labStatus=text(this,25,46,'',17,'#ffd382').setDepth(100);
  this.labHelp=text(this,25,71,'Q: BFS/A* · E: corta/segura · R: nueva variante · A: saltar · X/J: probar ataques · Esc: volver',15).setDepth(100);
  this.labButtons={
   algorithm:this.labButton(850,610,'Algoritmo: BFS',()=>{this.algorithm=this.algorithm==='bfs'?'astar':'bfs';for(const e of this.enemies)e.routeAt=0;this.refreshLabStatus();}),
   navigation:this.labButton(1030,610,'Ruta: corta',()=>{this.navigation=this.navigation==='short'?'safe':'short';for(const e of this.enemies)e.routeAt=0;this.refreshLabStatus();}),
   scenario:this.labButton(1200,610,'Nueva variante',()=>this.regenerateScenario())
  };
  this.playerStatus=text(this,1250,18,'100 / 100',17,'#ffffff').setOrigin(1,0).setDepth(100);this.refreshLabStatus();
 }
 labButton(x,y,label,callback){
  const box=this.add.rectangle(x,y,158,42,0x14263a).setStrokeStyle(2,0x82f5c8).setDepth(100).setInteractive({useHandCursor:true});
  const caption=text(this,x,y,label,15,'#edf5ff').setOrigin(0.5).setDepth(101);
  box.on('pointerdown',callback);return {box,caption};
 }
 installScenario(){
  this.platformGroup.clear(true,true);this.scenarioLabels.forEach(label=>label.destroy());this.scenarioLabels=[];
  this.scenario.platforms.forEach(platform=>{
   const key=`lab-platform-${platform.w}`;
   if(!this.textures.exists(key)){const g=this.make.graphics({x:0,y:0,add:false});g.fillStyle(0x24343e);g.fillRect(0,0,platform.w,20);g.fillStyle(platform.exposed?0xff735f:0x62bd91);g.fillRect(0,0,platform.w,4);g.generateTexture(key,platform.w,20);g.destroy();}
   const p=this.platformGroup.create(platform.x,platform.y+10,key).setDepth(8).refreshBody();
   p.body.setSize(platform.w,12,false).setOffset(0,0);p.body.checkCollision.down=false;p.body.checkCollision.left=false;p.body.checkCollision.right=false;
   if(platform.exposed)this.scenarioLabels.push(text(this,platform.x,platform.y-22,'EXPOSICIÓN',13,'#ff9b83').setOrigin(0.5).setDepth(15));
  });
  this.navigationGraph=createNavigationGraph(this.ground,this.scenario.platforms);
  for(const enemy of this.enemies){enemy.route=[];enemy.routeAt=0;enemy.routeStart=null;enemy.routeTarget=null;}
 }
 spawnLabEnemy(id,x,y){
  const sprite=this.actor(x,y,id);if(id==='Flying eye')sprite.body.setAllowGravity(false);
  const e={sprite,id,boss:false,hp:10000,max:10000,speed:id==='Mushroom'?105:75,next:id==='Flying eye'?this.time.now+5000:this.time.now+1000,busy:0,jumpAt:0,hurtUntil:0,shieldUntil:0,shieldReady:this.time.now+4000,recoverUntil:0,shots:0,dead:false,state:'patrol',route:[],routeAt:0,patrolDirection:x<640?1:-1};
  if(id==='Flying eye')e.patrol={x:100+Math.random()*1080,y:150+Math.random()*90};
  e.stateLabel=text(this,x,y-65,`${id} · PATRULLA`,15,'#edf5ff').setOrigin(0.5).setDepth(25);
  this.enemies.push(e);sprite.on('animationupdate',(anim,frame)=>this.advanceEnemyAttack(e,anim,frame));
  sprite.on('animationcomplete',anim=>{if(e.attack?.key===anim.key){this.advanceEnemyAttack(e,anim,anim.frames.at(-1));e.attack=null;e.busy=this.time.now;e.recoverUntil=this.time.now+e.recovery;}});
  return e;
 }
 hitEnemy(e,damage){
  e.hp=e.max;e.attack=null;e.hurtUntil=this.time.now+100;e.sprite.setTint(0xffb3a5);
  this.time.delayedCall(100,()=>{if(e.sprite.active&&!e.frozen)e.sprite.clearTint();});
  return true;
 }
 refreshLabStatus(){
  const algorithm=this.algorithm==='bfs'?'BFS · menor cantidad de saltos':'A* · menor distancia estimada';
  const navigation=this.navigation==='safe'?'Ruta segura · evita zonas expuestas':'Ruta corta · busca menos saltos/distancia';
  const limitation=this.algorithm==='bfs'?'BFS supone costos uniformes y no garantiza menor distancia.':'A* depende de una heurística adecuada y de las conexiones del escenario.';
  this.labStatus.setText(`Variante ${this.seed} · ${algorithm} · ${navigation}\\n${limitation}`);
  this.labButtons?.algorithm.caption.setText(`Algoritmo: ${this.algorithm.toUpperCase()}`);
  this.labButtons?.navigation.caption.setText(`Ruta: ${this.navigation==='safe'?'segura':'corta'}`);
 }
 regenerateScenario(){
  this.seed++;this.scenario=generateScenario(this.seed);this.installScenario();this.refreshLabStatus();
 }
 drawRoutes(){
  this.routeGraphics.clear();const color=this.navigation==='safe'?0x71edaa:0x6ad8ff;
  this.routeGraphics.lineStyle(4,color,0.82);
  for(const enemy of this.enemies.filter(item=>item.id==='Mushroom'&&item.route?.length>1)){
   const points=enemy.route.map(id=>this.navigationGraph.byId[id]).filter(Boolean);
   for(let i=1;i<points.length;i++)this.routeGraphics.lineBetween(points[i-1].x,points[i-1].y-10,points[i].x,points[i].y-10);
  }
 }
 update(time){
  const c=this.controls.poll(time);if(c.pause){this.returnToField();return;}
  if(c.algorithm)this.labButtons.algorithm.box.emit('pointerdown');
  if(c.route)this.labButtons.navigation.box.emit('pointerdown');
  if(c.regenerate)this.labButtons.scenario.box.emit('pointerdown');
  const grounded=this.hero.body.blocked.down||this.hero.body.touching.down;
  this.movePlayer(c,time,grounded);this.updateEnemies(time);this.updatePlayerProjectiles(time);this.drawRoutes();
  for(const enemy of this.enemies)enemy.stateLabel?.setPosition(enemy.sprite.x,enemy.sprite.y-65).setText(`${enemy.id} · ${enemy.state?.toUpperCase()||'PATRULLA'}`);
  this.playerStatus.setText(`${Math.ceil(this.hp)} / ${this.maxHp}`);
 }
}
Object.assign(Training.prototype,combatMethods);
Object.assign(AILab.prototype,combatMethods);
Object.assign(AILab.prototype,enemyMethods);
class Overlay extends Phaser.Scene {
 constructor(){super('Overlay');}
 init(data){this.info=data;this.page='main';}
 create(){this.controls=new Controls(this);this.selected=0;this.draw();}
 draw(){
  this.children.removeAll(true);this.buttons=[];this.add.rectangle(640,360,W,H,0x040c16,0.91);
  const over=this.info.kind==='over',options=!over&&this.page==='options';
  text(this,640,120,over?'LA EMBOSCADA TERMINÓ':options?'OPCIONES':'PAUSA',44,over?'#ffb5a4':options?'#ffd382':'#82f5c8').setOrigin(0.5);
  text(this,640,190,over?`Oleada ${this.info.wave} · ${this.info.kills} bajas · ${this.info.score} puntos\nRécord: ${save.record}`:options?'Ajustá el audio y la pantalla a tu gusto.':'Respirá. La siguiente oleada te espera.',23).setOrigin(0.5).setAlign('center');
  const items=over?[['Reintentar',()=>this.restart()],['Elegir escenario',()=>this.menu('maps')],['Menú principal',()=>this.menu('home')]]:options?[...optionItems(this,()=>this.draw()),['Volver',()=>{this.page='main';this.selected=0;this.draw();}]]:[['Continuar',()=>this.resume()],['Opciones',()=>{this.page='options';this.selected=0;this.draw();}],['Reiniciar partida',()=>this.restart()],['Menú principal',()=>this.menu('home')]];
  items.forEach(([label,fn],i)=>{const bg=this.add.rectangle(640,280+i*56,510,46,0x14263a).setInteractive({useHandCursor:true});text(this,640,280+i*56,label,23).setOrigin(0.5);bg.on('pointerover',()=>{this.selected=i;this.highlight();}).on('pointerdown',fn);this.buttons.push({bg,fn});});this.highlight();
 }
 highlight(){this.buttons.forEach((b,i)=>b.bg.setFillStyle(i===this.selected?0x276451:0x14263a));}
 resume(){this.scene.resume('Game');this.scene.stop();}
 restart(){this.scene.stop('Game');this.scene.start('Game');}
 menu(page){this.scene.stop('Game');this.scene.start('Menu',{page});}
 update(time){const c=this.controls.poll(time);if(c.nav){this.selected=Phaser.Math.Wrap(this.selected+c.nav,0,this.buttons.length);this.highlight();}if(c.ok)this.buttons[this.selected]?.fn();else if((c.back||c.pause)&&this.info.kind==='pause'){if(this.page==='options'){this.page='main';this.selected=0;this.draw();}else this.resume();}}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#07101d',pixelArt:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:1500},debug:false}},input:{gamepad:true},scene:[Boot,Load,Menu,Game,Training,AILab,Overlay]});
window.__emboscada=game;
