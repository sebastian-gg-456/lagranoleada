import Phaser from 'phaser';
import {characters,names,descriptions,wavePlan,scoreFor,readSave} from './rules.js';

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
 constructor(scene){this.keys=scene.input.keyboard.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE,J,K,SHIFT,ESC,ENTER');this.prev=null;this.prevNav=false;this.lastNav=0;}
 poll(time){
  const p=Array.from(navigator.getGamepads?.()||[]).find(Boolean),b=i=>!!p?.buttons[i]?.pressed,k=this.keys;
  let axis=p?.axes[0]||0;if(Math.abs(axis)<0.25)axis=0;
  const held={jump:k.SPACE.isDown||b(0),attack:k.J.isDown||b(2),secondary:k.K.isDown||b(3),roll:k.SHIFT.isDown||b(1),defend:k.S.isDown||k.DOWN.isDown||b(13),pause:k.ESC.isDown||b(9),ok:k.ENTER.isDown||k.SPACE.isDown||b(0),back:k.ESC.isDown||b(1)};
  const result={x:Phaser.Math.Clamp((k.D.isDown||k.RIGHT.isDown||b(15)?1:0)-(k.A.isDown||k.LEFT.isDown||b(14)?1:0)+axis,-1,1),nav:0};
   for(const key of Object.keys(held))result[key]=!!this.prev&&held[key]&&!this.prev[key];result.defendHeld=!!held.defend;this.prev=held;
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
 }
 create(){
  for(const [id,actor] of Object.entries(manifest.actors))for(const [action,a] of Object.entries(actor.actions)){
   const frames=a.sheet?this.anims.generateFrameNumbers(`${id}:${action}:sheet`):a.files.map((_,i)=>({key:`${id}:${action}:${i}`}));
   const rates={idle:6,move:8,attack:10,attack2:9,attack3:9,airAttack:10,special:8,hurt:7,death:6,roll:8,defend:6,heal:8,meditate:5,up:8,down:8};
   this.anims.create({key:`${id}:${action}`,frames,frameRate:rates[action]||8,repeat:['idle','move','defend'].includes(action)?-1:0});
  }
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
   title='Supervivencia sin fin';items=[['Jugar',()=>this.show('maps')],['Opciones',()=>this.show('options')],['Controles',()=>this.show('help')],['Créditos',()=>this.show('credits')]];
   text(this,80,250,'Una caverna. Ninguna salida.\nOleadas cada vez más difíciles.\nUn jefe cada cinco oleadas.',24).setLineSpacing(14);
   text(this,80,445,`RÉCORD  ${save.record.toLocaleString()}`,29,'#ffd382');
  } else if(page==='maps'){
   title='Elegí el escenario';items=manifest.maps.map((m,i)=>[`${i===session.map?'◆ ':''}${m.name}`,()=>{session.map=i;this.show('characters');}]);items.push(['Volver',()=>this.show('home')]);
   this.mapPreview(session.map);text(this,80,530,'Cinco escenarios para sobrevivir.',21);
  } else if(page==='characters'){
   title='Elegí tu personaje';items=characters.map((id,i)=>[names[i],()=>{session.character=i;music(this);this.scene.start('Game');}]);items.push(['Volver',()=>this.show('maps')]);
   this.preview=this.add.sprite(250,650,first(characters[session.character])).setOrigin(0.5,1).setScale(4);play(this.preview,characters[session.character],'idle');this.charDesc=text(this,70,660,descriptions[session.character],19,'#d5e5ee').setWordWrapWidth(560).setLineSpacing(8);
  } else if(page==='options'){
   title='Opciones';items=[...optionItems(this,()=>this.show('options')),['Volver',()=>this.show('home')]];text(this,80,295,'Los ajustes se guardan\nautomáticamente en este navegador.',23).setLineSpacing(12);
  } else if(page==='help'){
   title='Controles';items=[['Volver',()=>this.show('home')]];
   text(this,80,225,'ACCIÓN              TECLADO          MANDO\n\nMover              A/D o flechas     Stick / D-pad\nSaltar             Espacio           A\nAtacar             J                 X\nAtaque secundario  K                 Y\nDefender           S / Abajo         D-pad abajo\nRodar              Shift             B\nPausa              Esc               Start\n\nMenús: ↑/↓ + Enter o D-pad + A. Volver: Esc/B.\nConectá el mando y pulsá un botón para activarlo.',21).setLineSpacing(8);
  } else {
   title='Créditos';items=[['Volver',()=>this.show('home')]];
   text(this,80,235,'Juego desarrollado con Phaser 3.\n\nArte: packs Elementals, Monsters Creatures Fantasy,\nForest Monsters, Demon Slime, Frost Guardian,\nMinotaur, Crystal Cave y Parallax Cave.\nMúsica: Japanese Music Pack.\n\nDocumentos originales conservados con los recursos.',21).setLineSpacing(10);
  }
  text(this,760,198,title,26,'#ffd382');
  items.forEach(([label,fn],i)=>this.button(760,250+i*55,label,fn));
  this.highlight();
 }
  button(x,y,label,fn){const i=this.buttons.length;const bg=this.add.rectangle(x,y,440,45,0x14263a).setOrigin(0,0);const labelObj=text(this,x+16,y+9,label,22);bg.setInteractive({useHandCursor:true}).on('pointerover',()=>{this.selected=i;this.highlight();}).on('pointerdown',()=>{tone(this);fn();});this.buttons.push({bg,label:labelObj,fn});}
  mapPreview(index){this.preview?.destroy();this.preview=this.add.container(300,370);this.preview.add(manifest.maps[index].layers.map((_,layer)=>this.add.image(0,0,`map${index}:${layer}`).setDisplaySize(460,259)));}
  highlight(){this.buttons.forEach((b,i)=>{b.bg.setFillStyle(i===this.selected?0x276451:0x14263a);b.label.setColor(i===this.selected?'#ffffff':'#bfcedc');});if(this.preview&&this.page==='maps'&&this.selected<manifest.maps.length)this.mapPreview(this.selected);if(this.preview&&this.page==='characters'&&this.selected<characters.length){play(this.preview,characters[this.selected],'idle');this.charDesc?.setText(descriptions[this.selected]);}}
 update(time){const c=this.controls.poll(time);if(c.nav){this.selected=Phaser.Math.Wrap(this.selected+c.nav,0,this.buttons.length);this.highlight();}if(c.ok){tone(this);this.buttons[this.selected]?.fn();}else if(c.back&&this.page!=='home')this.show('home');}
}
function optionItems(scene,refresh){return [
 [`Música: ${Math.round(save.music*100)}%`,()=>{save.music=+(save.music>=1?0:Math.min(1,save.music+0.25)).toFixed(2);scene.sound.get('music')?.setVolume(save.music);persist();refresh();}],
 [`Efectos: ${Math.round(save.sfx*100)}%`,()=>{save.sfx=+(save.sfx>=1?0:Math.min(1,save.sfx+0.25)).toFixed(2);persist();tone(scene);refresh();}],
 ['Pantalla completa',()=>{if(scene.scale.isFullscreen)scene.scale.stopFullscreen();else scene.scale.startFullscreen();}]
];}

class Game extends Phaser.Scene {
 constructor(){super('Game');}
 create(){
   this.controls=new Controls(this);this.wave=0;this.score=0;this.kills=0;this.hp=100;this.maxHp=100;this.finished=false;this.between=false;this.pending=0;this.nextAttack=0;this.invincible=0;this.rollUntil=0;this.attackUntil=0;this.hurtUntil=0;this.comboUntil=0;this.lastAttack='';this.facing=1;this.defending=false;this.enemies=[];this.projectiles=[];this.heals=[];
  background(this,session.map);this.ground=manifest.maps[session.map].ground;
  this.add.rectangle(640,this.ground+35,1280,70,0x07101d,0.32);
  this.platform=this.add.rectangle(640,this.ground+40,1280,80,0x000000,0);this.physics.add.existing(this.platform,true);
  this.platformGroup=this.physics.add.staticGroup();
   for(const p of manifest.maps[session.map].platforms||[]){const img=this.platformGroup.create(p.x,p.y+24,`cave:${p.w}`);img.setDepth(8).refreshBody();img.body.setSize(p.w,16,false).setOffset(0,0);img.body.checkCollision.down=false;img.body.checkCollision.left=false;img.body.checkCollision.right=false;}
  this.id=characters[session.character];this.hero=this.actor(640,this.ground,this.id,1.65);this.hero.setCollideWorldBounds(true);this.physics.add.collider(this.hero,this.platform);this.physics.add.collider(this.hero,this.platformGroup);
  this.add.rectangle(640,40,1280,80,0x07101d,0.85).setDepth(90);
  this.add.rectangle(48,40,74,74,0x0b1722,0.96).setStrokeStyle(3,0x82f5c8,0.9).setDepth(99);
  this.add.image(48,40,`${this.id}:portrait`).setScale(0.95).setDepth(100);
  this.add.rectangle(94,31,300,24,0x1b2733,1).setOrigin(0,0).setStrokeStyle(2,0x000000,0.65).setDepth(99);
  this.hpFill=this.add.rectangle(97,34,294,18,0xd94b4b,1).setOrigin(0,0).setDepth(100);
  this.hpText=text(this,244,27,'100 / 100',14,'#ffffff').setOrigin(0.5,0).setDepth(101);
  this.scoreHud=text(this,1252,14,'',25,'#ffd382').setOrigin(1,0).setDepth(100);this.waveHud=text(this,1252,48,'',16,'#c7dbe7').setOrigin(1,0).setDepth(100);
  this.banner=text(this,640,185,'',42,'#ffd382').setOrigin(0.5).setDepth(100);this.bossHud=text(this,640,98,'',23,'#ff9b9b').setOrigin(0.5).setDepth(100);
  this.waveEvent=this.time.delayedCall(900,()=>this.startWave());
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
  const types=['Mushroom','Goblin','Skeleton','Flying eye','ForestMushroom'];const id=boss?this.plan.boss:types[(i+this.wave)%types.length];const left=Math.random()<0.5;
  const sprite=this.actor(left?45:1235,this.ground,id,boss?2: id==='ForestMushroom'?2.5:1.8);
  this.physics.add.collider(sprite,this.platform);this.physics.add.collider(sprite,this.platformGroup);sprite.setCollideWorldBounds(true);
  const e={sprite,id,boss,hp:boss?500+this.wave*65:this.plan.hp,max:boss?500+this.wave*65:this.plan.hp,speed:boss?75:this.plan.speed,next:0,busy:0,jumpAt:0,hurtUntil:0,dead:false};this.enemies.push(e);
 }
 attack(time,secondary=false,air=false){
  if(time<this.nextAttack||time<this.rollUntil)return;
  const ranged=this.id==='LeafRanger'||this.id==='WaterPriestess',heavy=this.id==='CrystalMauler',combo=!secondary&&!air&&time<this.comboUntil;
  const action=secondary?(air?'special':'attack2'):air?'airAttack':combo?'attack3':'attack';
  const damage=ranged?(secondary?34:combo?55:38)+this.wave*1.5:secondary?(heavy?140:95):combo?(heavy?120:78):heavy?90:50;
  const base=secondary?(heavy?900:this.id==='GroundMonk'?440:620):heavy?600:this.id==='GroundMonk'?280:400;
  play(this.hero,this.id,action);
  const duration=this.hero.anims.currentAnim?.duration||500;
  this.nextAttack=time+Math.min(1200,Math.max(base,duration*0.8));
  this.attackUntil=time+Math.min(1500,Math.max(260,duration*0.9));
  this.comboUntil=secondary||air?0:combo?0:time+900;this.lastAttack=secondary?(air?'special':'secondary'):air?'air':combo?'combo':'basic';
  tone(this,ranged?(secondary?820:650):secondary?150:220);
  const x=this.hero.x,y=this.hero.y-48;
  if(ranged){
   const shots=secondary?3:1;
   for(let i=0;i<shots;i++){
    const s=this.physics.add.image(x+this.facing*30,y+(i-1)*10,'bolt').setTint(this.id==='WaterPriestess'?0x62d8ff:0xd9f591).setScale(secondary?1.35:1).setDepth(21);s.body.setAllowGravity(false);s.setVelocity(this.facing*750,secondary?(i-1)*70:0);this.projectiles.push({s,damage,expires:time+1800});
   }
  }else{
   const radius=secondary?105:combo?88:70,slash=this.add.arc(x+this.facing*60,y,radius,230,490,false,secondary?0xff9b6e:0xffdf9a,0.3).setDepth(22);this.tweens.add({targets:slash,alpha:0,duration:secondary?260:180,onComplete:()=>slash.destroy()});
   for(const e of this.enemies)if(!e.dead&&Math.abs(e.sprite.x-x)<radius+70&&Math.abs(e.sprite.y-this.hero.y)<100&&(e.sprite.x-x)*this.facing>-25)this.hitEnemy(e,damage);
  }
 }
 hitEnemy(e,damage){
  if(e.dead)return;e.hp-=damage;e.sprite.setTint(0xffb3a5);this.time.delayedCall(100,()=>{if(e.sprite.active)e.sprite.clearTint();});
  if(e.hp<=0){e.dead=true;e.sprite.body.stop();e.sprite.body.enable=false;play(e.sprite,e.id,'death');this.kills++;this.score+=scoreFor(e.boss);if(Math.random()<0.15||e.boss)this.dropHeal(e.sprite.x);this.tweens.add({targets:e.sprite,alpha:0,delay:450,duration:400,onComplete:()=>e.sprite.destroy()});}else{e.hurtUntil=this.time.now+450;play(e.sprite,e.id,'hurt');}
 }
 dropHeal(x){const s=this.physics.add.image(x,this.ground-18,'heal').setDepth(25);s.body.setAllowGravity(false);this.heals.push(s);this.tweens.add({targets:s,y:s.y-9,yoyo:true,repeat:-1,duration:650});}
 damage(amount,time){
  if(time<this.invincible||this.finished)return;const blocked=this.defending?0.35:1;this.hp=Math.max(0,this.hp-Math.max(1,Math.round(amount*blocked)));this.invincible=time+850;this.hero.setTint(0xff7777);tone(this,this.defending?260:120);this.cameras.main.shake(this.defending?70:100,this.defending?0.002:0.004);
  if(this.defending)play(this.hero,this.id,'defend');else{this.hurtUntil=time+500;play(this.hero,this.id,'hurt');}
  this.time.delayedCall(160,()=>{if(this.hero.active)this.hero.clearTint();});if(this.hp===0)this.end();
 }
 pause(){if(this.finished||!this.scene.isActive())return;this.scene.launch('Overlay',{kind:'pause'});this.scene.pause();}
 end(){this.finished=true;this.hero.setVelocity(0);play(this.hero,this.id,'death');save.record=Math.max(save.record,this.score);persist();this.time.delayedCall(800,()=>{this.scene.launch('Overlay',{kind:'over',score:this.score,wave:this.wave,kills:this.kills});this.scene.pause();});}
 update(time){
  if(this.finished)return;const c=this.controls.poll(time);if(c.pause){this.pause();return;}
  const h=this.hero,grounded=h.body.blocked.down||h.body.touching.down;
  const defending=!!c.defendHeld&&grounded&&Math.abs(c.x)<0.1&&time>=this.rollUntil&&time>=this.attackUntil&&time>=this.hurtUntil;this.defending=defending;
  if(c.x)this.facing=Math.sign(c.x);h.setFlipX(this.facing<0);
  if(c.roll&&time>this.rollUntil+850&&grounded){this.rollUntil=time+350;this.invincible=time+430;play(h,this.id,'roll');tone(this,300);}
  h.setVelocityX(time<this.rollUntil?this.facing*500:defending?0:c.x*220);
  if(c.jump&&grounded&&time>=this.rollUntil&&!defending){h.setVelocityY(-700);tone(this,480);}
  if(c.attack)this.attack(time,false,!grounded);
  if(c.secondary)this.attack(time,true,!grounded);
  if(time>=this.rollUntil&&time>=this.attackUntil&&time>=this.hurtUntil){if(defending)play(h,this.id,'defend');else play(h,this.id,!grounded?(h.body.velocity.y<0?'up':'down'):Math.abs(c.x)>0.1?'move':'idle');}
  for(const e of this.enemies){
   if(e.dead||!e.sprite.active)continue;const s=e.sprite,dx=h.x-s.x,dist=Math.abs(dx);s.setFlipX(dx<0);
   if(time<e.hurtUntil){s.setVelocityX(0);play(s,e.id,'hurt');continue;}
   if(time<e.busy){s.setVelocityX(0);continue;}
   const enemyGrounded=s.body.blocked.down||s.body.touching.down;
   if(enemyGrounded&&h.y<s.y-45&&dist<480&&time>=e.jumpAt){s.setVelocityY(e.boss?-720:-680);e.jumpAt=time+(e.boss?1800:1200);}
   if(enemyGrounded&&dist<(e.boss?125:65)&&Math.abs(h.y-s.y)<120&&time>=e.next){
    s.setVelocityX(0);play(s,e.id,'attack');e.next=time+(e.boss?1450:1100);e.busy=time+550;
    this.time.delayedCall(300,()=>{if(!e.dead&&!this.finished&&Math.abs(h.x-s.x)<(e.boss?155:85)&&Math.abs(h.y-s.y)<110)this.damage(e.boss?25:10,this.time.now);});
    if(e.boss&&this.wave>=10){const marker=this.add.rectangle(h.x,this.ground-5,150,10,0xff5555,0.7).setDepth(24);const target=h.x;this.time.delayedCall(700,()=>{marker.destroy();if(!e.dead&&!this.finished&&Math.abs(h.x-target)<75&&h.y>this.ground-80)this.damage(20,this.time.now);});}
   }else{ s.setVelocityX(dist>45?Math.sign(dx)*e.speed:0);play(s,e.id,dist>45?'move':'idle'); }
  }
  for(const p of this.projectiles){if(!p.s.active)continue;if(time>p.expires||p.s.x<0||p.s.x>W){p.s.destroy();continue;}for(const e of this.enemies){if(!e.dead&&e.sprite.active&&Phaser.Geom.Intersects.RectangleToRectangle(p.s.getBounds(),e.sprite.body)){this.hitEnemy(e,p.damage);p.s.destroy();break;}}}
  this.projectiles=this.projectiles.filter(p=>p.s.active);
  for(const s of this.heals)if(s.active&&Math.abs(s.x-h.x)<45&&Math.abs(s.y-h.y)<80){this.hp=Math.min(this.maxHp,this.hp+25);if(manifest.actors[this.id].actions.heal){this.hurtUntil=time+450;play(h,this.id,'heal');}tone(this,850);s.destroy();}
  this.heals=this.heals.filter(s=>s.active);this.enemies=this.enemies.filter(e=>e.sprite.active);
  const alive=this.enemies.filter(e=>!e.dead);if(this.wave>0&&this.pending===0&&alive.length===0&&!this.between){this.between=true;this.score+=this.wave*50;this.hp=Math.min(100,this.hp+10);save.record=Math.max(save.record,this.score);persist();this.banner.setText('OLEADA SUPERADA · +10 VIDA');if(this.id==='GroundMonk'&&manifest.actors[this.id].actions.meditate){this.hurtUntil=time+2200;play(h,this.id,'meditate');}this.time.delayedCall(2800,()=>this.startWave());}
  const boss=alive.find(e=>e.boss);this.bossHud.setText(boss?`${boss.id}   ${Math.ceil(boss.hp)} / ${boss.max}`:'');
  this.hpFill.width=294*this.hp/this.maxHp;this.hpText.setText(`${Math.ceil(this.hp)} / ${this.maxHp}`);this.scoreHud.setText(`PUNTOS ${this.score}`);this.waveHud.setText(`OLEADA ${this.wave} · ENEMIGOS ${alive.length+this.pending}`);
 }
}
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
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#07101d',pixelArt:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:1500},debug:false}},input:{gamepad:true},scene:[Boot,Load,Menu,Game,Overlay]});
window.__emboscada=game;
