// Frame numbers in the art packs are one-based.
export const defenseFrames={LeafRanger:13,WaterPriestess:7,GroundMonk:10,CrystalMauler:5};
export const abilityCooldowns={LeafRanger:9000,WaterPriestess:15000,GroundMonk:18000,CrystalMauler:10000};
// Contact/release frames selected from the original PNG sequences (one-based).
export const hitFrames={
 LeafRanger:{attack:[5],attack2:[9],airAttack:[6],attack3:[9]},
 CrystalMauler:{attack:[4],attack2:[4],attack3:[11],airAttack:[4],special:[9]},
 GroundMonk:{attack:[2],attack2:[2,6,9],attack3:[2,6,9,18],special:[9,18]},
 WaterPriestess:{attack:[3],attack2:[3,15],attack3:[3,15,22],airAttack:[4],special:[23],heal:[8]}
};
export function frontRect(x,y,facing,width,height=72){return {x:facing>0?x+8:x-8-width,y:y-height-12,width,height};}
export function overlaps(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
export function basicAction(id,step,air){
 if(air&&id!=='GroundMonk')return id==='LeafRanger'?'attack':'airAttack';
 if(id==='LeafRanger')return 'attack';
 return ['attack','attack2','attack3'][step%(id==='CrystalMauler'?2:3)];
}
export function chargedKind(random=Math.random){return random()<0.5?'area':'poison';}

export const combatMethods={
 initCombat(){
  this.comboStep=0;this.charge=null;this.defenseState=null;this.abilityReady=0;this.meditatingUntil=0;this.buffUntil=0;this.activeAction=null;
  this.hero.on('animationupdate',(anim,frame)=>this.advanceAction(anim.key,frame.index));
  this.hero.on('animationcomplete',anim=>{
   this.advanceAction(anim.key,anim.frames.length);
   if(this.activeAction?.key===anim.key){this.activeAction=null;this.attackUntil=this.time.now;this.nextAttack=this.time.now;}
   if(anim.key===`${this.id}:defendStart`&&this.defenseState==='start')this.defenseState='hold';
   if(anim.key===`${this.id}:defendEnd`&&this.defenseState==='end')this.defenseState=null;
  });
 },
 busy(time){return this.finished||!!this.activeAction||time<this.rollUntil||!!this.defenseState||!!this.meditatingUntil;},
 facingLocked(time){return this.busy(time);},
 cancelAction(){this.activeAction=null;this.attackUntil=0;this.nextAttack=0;},
 advanceAction(key,frame){
  const active=this.activeAction;
  if(this.finished||!active||active.key!==key)return;
  for(const event of active.events)if(!event.done&&frame>=event.frame){event.done=true;event.run();}
  if(active.freeze&&frame>=23)this.freezeFront(active);
 },
 animateAction(action,time,events=[]){
  this.hurtUntil=0;
  this.activeAction={key:`${this.id}:${action}`,events,freeze:false,frozen:new Set()};
  this.hero.play(`${this.id}:${action}`);
  const duration=this.hero.anims.currentAnim.duration;
  this.attackUntil=time+duration;this.nextAttack=this.attackUntil;
  return duration;
 },
 onHitFrames(action,callback){return hitFrames[this.id][action].map((frame,i,frames)=>({frame,run:()=>callback(i,frames.length)}));},
 effect(action,x,y,scale=1.65,autoDestroy=true){
  const key=`LeafRanger:${action}`,anim=this.anims.get(key);
  const s=this.add.sprite(x,y,anim.frames[0].textureKey).setScale(scale).setDepth(24).play(key);
  if(autoDestroy)s.once('animationcomplete',()=>s.destroy());return s;
 },
 deal(e,amount){this.hitEnemy(e,amount*(this.time.now<this.buffUntil?1.5:1));},
 area(x,y,radius,damage){
   const box={x:x-radius,y:y-90,width:radius*2,height:90};
   for(const e of this.enemies)if(!e.dead&&e.sprite.active&&overlaps(box,e.sprite.body))this.deal(e,damage);
 },
 melee(damage,width=110,height=72,color=0xffce91){
   const box=frontRect(this.hero.x,this.hero.y,this.facing,width,height);
   const flash=this.add.rectangle(box.x,box.y,box.width,box.height,color,0.16).setOrigin(0).setDepth(22);
   this.tweens.add({targets:flash,alpha:0,duration:300,onComplete:()=>flash.destroy()});
   for(const e of this.enemies)if(!e.dead&&e.sprite.active&&overlaps(box,e.sprite.body))this.deal(e,damage);
 },
 freezeFront(active){
  const box=frontRect(this.hero.x,this.hero.y,this.facing,230,90);
  for(const e of this.enemies)if(!e.dead&&e.sprite.active&&!active.frozen.has(e)&&overlaps(box,e.sprite.body)){
   active.frozen.add(e);e.frozenUntil=this.time.now+3000;e.frozen=true;e.attack=null;e.busy=0;
   e.sprite.setVelocity(0);e.sprite.body.moves=false;e.sprite.anims.pause();e.sprite.setTint(0x80e6ff);
  }
 },
 startEnemyAttack(e,time){
  const s=e.sprite;
  s.setVelocityX(0);s.play(`${e.id}:attack`);
  const animation=s.anims.currentAnim;
  e.attack={frame:Math.max(2,Math.ceil(animation.frames.length*0.55)),facing:s.flipX?-1:1,done:false};
  e.busy=time+animation.duration;e.next=e.busy+(e.boss?500:400);
 },
 advanceEnemyAttack(e,anim,frame){
  const attack=e.attack;
  if(!attack||attack.done||e.dead||e.frozen||this.finished||anim.key!==`${e.id}:attack`||frame.index<attack.frame)return;
  attack.done=true;
  const box=frontRect(e.sprite.x,e.sprite.y,attack.facing,e.boss?155:85,e.boss?105:72);
  if(overlaps(box,this.hero.body))this.damage(e.boss?25:10,this.time.now);
  if(e.boss&&this.wave>=10){
   const target=this.hero.x,marker=this.add.rectangle(target,this.ground-5,150,10,0xff5555,0.7).setDepth(24);
   this.time.delayedCall(700,()=>{marker.destroy();if(!e.dead&&!e.frozen&&!this.finished&&overlaps({x:target-75,y:this.ground-80,width:150,height:80},this.hero.body))this.damage(20,this.time.now);});
  }
 },
 shoot(kind='normal',air=false){
  const leaf=this.id==='LeafRanger',action=air?'diagonalArrow':'arrow';
  const texture=leaf?this.anims.get(`LeafRanger:${action}`).frames[0].textureKey:'bolt';
  const s=this.physics.add.sprite(this.hero.x+this.facing*30,this.hero.y-48,texture).setDepth(23);
  if(leaf){s.setScale(1.65).setFlipX(this.facing<0).play(`LeafRanger:${action}`);s.body.setSize(28,12).setOffset((s.width-28)/2,(s.height-12)/2);}
  else s.setTint(0x62d8ff).setScale(1.5);
  s.body.setAllowGravity(false);s.setVelocity(this.facing*650,air?440:0);
  this.projectiles.push({s,kind,air,leaf,damage:kind==='normal'?38:65,expires:this.time.now+2200});
 },
 impact(p,e){
  const x=p.s.x,y=e?e.sprite.y:p.s.y;
  if(p.leaf)this.effect(p.air?(p.kind==='normal'?'airHit':'airChargedHit'):p.kind==='poison'?'poisonHit':p.kind==='area'?'areaHit':'arrowHit',x,y-35);
  if(p.kind==='area')this.area(x,y,155,p.damage);
  else if(e){this.deal(e,p.damage);if(p.kind==='poison'&&!e.dead){e.poisonUntil=this.time.now+5000;e.poisonTick=this.time.now+1000;}}
  p.s.destroy();
 },
 attack(time,secondary=false,air=false,kind='normal'){
  if(this.busy(time)||time<this.nextAttack)return false;
  if(time>this.comboUntil)this.comboStep=0;
  let action;
  if(secondary)action=this.id==='LeafRanger'?(air?'airAttack':'attack2'):this.id==='CrystalMauler'?'attack3':'special';
  else action=basicAction(this.id,this.comboStep,air);
   const events=this.onHitFrames(action,(i,count)=>{
    if(this.id==='LeafRanger'){
     if(secondary)this.shoot(kind,air);else this.melee(45,110);
    }else if(this.id==='WaterPriestess'){
     if(secondary)this.melee(100,230,90,0x62d8ff);
     else this.shoot();
    }else{
     const total=this.id==='CrystalMauler'?(secondary?140:action==='attack2'?115:90):(secondary?100:action==='attack3'?85:50);
     this.melee(total/count,secondary?190:115,secondary?90:72);
    }
   });
   const duration=this.animateAction(action,time,events);
   if(this.id==='WaterPriestess'&&secondary)this.activeAction.freeze=true;
  if(!secondary&&!air&&this.id!=='LeafRanger'){
   this.comboStep=(this.comboStep+1)%(this.id==='CrystalMauler'?2:3);this.comboUntil=time+duration+1000;
  }else{this.comboStep=0;this.comboUntil=0;}
  this.lastAttack=secondary?(air?'special':'secondary'):air?'air':'basic';
   return true;
 },
 ability(time,grounded){
  if(this.busy(time)||this.charge||time<this.abilityReady||!grounded)return;
  if(this.id==='WaterPriestess'){
   if(this.hp>=this.maxHp)return;
    this.animateAction('heal',time,this.onHitFrames('heal',()=>{this.hp=Math.min(this.maxHp,this.hp+25);}));
  }else if(this.id==='GroundMonk'){
   this.hero.play(`${this.id}:meditate`);this.meditatingUntil=time+3000;this.hero.setVelocityX(0);
  }else if(this.id==='CrystalMauler'){
    this.animateAction('special',time,this.onHitFrames('special',()=>this.melee(190,240,100)));
   }else{
    this.animateAction('attack3',time,this.onHitFrames('attack3',()=>{
     const target=PhaserClamp(this.hero.x+this.facing*180,100,1180),y=this.hero.y;
     // Release on the upward-shot frame; damage only when arrows land.
    for(let i=0;i<7;i++)this.time.delayedCall(i*100,()=>{
     if(this.finished)return;
     const x=target+(i-3)*38,arrow=this.effect('diagonalArrow',x-80,y-330,1.65,false);
     this.tweens.add({targets:arrow,x,y:y-40,duration:330,onComplete:()=>{
      arrow.destroy();if(this.finished)return;this.effect('shower',x,y-40);this.area(x,y,60,35);
     }});
     });
    }));
  }
  this.abilityReady=time+abilityCooldowns[this.id];
 },
 updateCombat(c,time,grounded){
  if(this.meditatingUntil&&time>=this.meditatingUntil){this.meditatingUntil=0;this.buffUntil=time+8000;}
  if(this.defenseState){
   if(!c.defendHeld&&this.defenseState!=='end'){
    this.defenseState='end';this.hero.play(`${this.id}:defendEnd`);
   }
  }else if(c.defendHeld&&grounded&&!this.busy(time)&&!this.charge){
   this.defenseState='start';this.hero.play(`${this.id}:defendStart`);
  }
  this.defending=this.defenseState==='start'||this.defenseState==='hold';
  if(this.id==='LeafRanger'){
   if(c.secondary&&!this.busy(time)&&time>=this.nextAttack)this.charge={start:time,air:!grounded};
   if(this.charge){
     const chargeTime=this.charge.air?500:1500;
    if(this.busy(time)){this.charge=null;}
    else if(!c.secondaryHeld||time-this.charge.start>=chargeTime){
     const charged=time-this.charge.start>=chargeTime,air=this.charge.air;
     this.charge=null;this.attack(time,true,air,charged?(air?'area':chargedKind()):'normal');
    }
   }
  }else if(c.secondary)this.attack(time,true,!grounded);
  if(c.attack&&!this.charge)this.attack(time,false,!grounded);
  if(c.ability)this.ability(time,grounded);
  const cooldown=Math.max(0,Math.ceil((this.abilityReady-time)/1000));
  if(this.activeAction?.freeze&&this.hero.anims.currentFrame?.index>=23)this.freezeFront(this.activeAction);
  this.skillHud.setText(this.meditatingUntil?`MEDITANDO ${Math.ceil((this.meditatingUntil-time)/1000)}s`:time<this.buffUntil?`DAÑO +50% · RESISTENCIA 30% · ${Math.ceil((this.buffUntil-time)/1000)}s`:this.charge?`CARGA Y: ${Math.min(100,Math.floor((time-this.charge.start)/(this.charge.air?5:15)))}%`:`B / L: ${cooldown?cooldown+'s':'LISTO'} · RB / S: DEFENSA`);
 }
};
function PhaserClamp(value,min,max){return Math.max(min,Math.min(max,value));}
