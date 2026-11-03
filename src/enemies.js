import {bosses} from './rules.js';
import {frontRect,overlaps} from './combat.js';
import {findPath,nearestSurfaceNode} from './navigation.js';

export const enemyMethods={
 setEnemyState(e,state,time){
  if(e.state!==state){e.state=state;e.stateEnteredAt=time;}
 },
 startEnemyAttack(e,time,action='attack'){
  const s=e.sprite;s.setVelocity(0);s.play(`${e.id}:${action}`);
  this.setEnemyState(e,'attack',time);
  const animation=s.anims.currentAnim;
  const heavy=e.id==='Skeleton'&&action==='attack2';
  const frames=e.id==='Flying eye'?{attack:5,attack2:4,attack3:4}:e.id==='Skeleton'?{attack:6,attack2:7}:{attack:6,attack2:6};
   e.attack={key:animation.key,action,frame:e.boss?Math.ceil(animation.frames.length*0.55):frames[action],facing:(s.flipX?-1:1)*(bosses[e.id]?.nativeFacing||1),done:false,
    damage:e.boss?bosses[e.id].damage:heavy?18:10,width:e.boss?180:heavy?110:85};
   e.busy=time+animation.duration;e.recovery=heavy?1050:e.boss?700:300;e.next=e.busy+e.recovery;
   if(e.id==='Flying eye')e.next=e.busy+6500+Math.random()*1500;
 },
 advanceEnemyAttack(e,anim,frame){
  const a=e.attack;
  if(!a||a.done||e.dead||e.frozen||this.finished||anim.key!==a.key||frame.index<a.frame)return;
  a.done=true;
  if(e.id==='Flying eye'&&a.action==='attack3'){this.enemyShot(e);return;}
  if(e.id==='Flying eye'&&a.action==='attack2'){
   const dx=this.hero.x-e.sprite.x,dy=this.hero.y-45-e.sprite.y,length=Math.hypot(dx,dy)||1;
   e.dash={until:this.time.now+430,vx:dx/length*520,vy:dy/length*520,hit:false};return;
  }
  if(overlaps(frontRect(e.sprite.x,e.sprite.y,a.facing,a.width,e.boss?150:72),this.hero.body))this.damage(a.damage,this.time.now);
 },
 enemyShot(e){
  const s=this.physics.add.sprite(e.sprite.x,e.sprite.y-25,'Flying eye:projectile:sheet',0).setScale(2).setDepth(23);
  s.body.setAllowGravity(false);s.body.setSize(12,12,true);
  const dx=this.hero.x-s.x,dy=this.hero.y-40-s.y,length=Math.hypot(dx,dy)||1;
  s.setVelocity(dx/length*265,dy/length*265);s.setRotation(Math.atan2(dy,dx));
  // The first frames are the travelling projectile; the remainder are its impact.
  s.play('eye:projectileFlight');this.enemyProjectiles.push({s,expires:this.time.now+5000});
 },
 startShield(e,time){
  e.shieldUntil=time+850;e.shieldReady=time+4200;e.sprite.setVelocityX(0);e.sprite.play('Skeleton:shield');this.setEnemyState(e,'defend',time);
 },
 updateEnemies(time){
  const h=this.hero,heroGrounded=h.body.blocked.down||h.body.touching.down;
  const heroElevated=heroGrounded&&h.body.bottom<this.ground-45;
  for(const e of this.enemies){
   const s=e.sprite;if(!s.active)continue;
   if(e.dead){
    this.setEnemyState(e,'dead',time);
    if(e.fallingDeath&&!s.anims.isPlaying&&(s.body.blocked.down||s.body.touching.down)){
     // Arcade resolves the body before syncing the sprite in postUpdate.
     // Align its feet now, before disabling that final synchronization.
     e.fallingDeath=false;s.y=s.body.bottom;s.body.stop();s.body.enable=false;s.play('eye:deathLanding');
    }continue;
   }
   if(e.poisonTick<=e.poisonUntil&&time>=e.poisonTick){e.poisonTick+=1000;this.hitEnemy(e,10,true);if(e.dead)continue;}
   if(e.frozen){this.setEnemyState(e,'frozen',time);if(time<e.frozenUntil)continue;e.frozen=false;s.body.moves=true;s.anims.resume();s.clearTint();}
   if(time<e.hurtUntil){this.setEnemyState(e,'hurt',time);s.setVelocity(0);continue;}
   if(e.dash){
    if(time<e.dash.until){this.setEnemyState(e,'dash',time);s.setVelocity(e.dash.vx,e.dash.vy);if(!e.dash.hit&&overlaps(s.body,h.body)){e.dash.hit=true;this.damage(16,time);}continue;}
    e.dash=null;s.setVelocity(0);
   }
   if(time<e.shieldUntil){this.setEnemyState(e,'defend',time);s.setVelocityX(0);continue;}
   if(time<e.busy){this.setEnemyState(e,'attack',time);s.setVelocityX(0);continue;}
   if(time<e.recoverUntil){this.setEnemyState(e,'recover',time);s.setVelocityX(0);continue;}
    const dx=h.x-s.x,dist=Math.abs(dx);s.setFlipX((dx<0?-1:1)!==(bosses[e.id]?.nativeFacing||1));
   if(e.id==='Flying eye'){
    if(!heroElevated){
     this.setEnemyState(e,'patrol',time);
     if(!e.patrol||Math.hypot(s.x-e.patrol.x,s.y-e.patrol.y)<25)e.patrol={x:100+Math.random()*1080,y:145+Math.random()*90};
     const px=e.patrol.x-s.x,py=e.patrol.y-s.y,len=Math.hypot(px,py)||1;
     s.setVelocity(px/len*80,py/len*80);s.setFlipX(px<0);s.play('Flying eye:move',true);continue;
    }
    const distance=Math.hypot(dx,h.y-35-s.y);
    if(time>=e.next&&distance<150){
     const action=dist<100?'attack':(++e.shots%4===0?'attack2':'attack3');
     this.startEnemyAttack(e,time,action);continue;
    }
    this.setEnemyState(e,'pursue',time);
    const length=Math.hypot(dx,h.y-45-s.y)||1;
    s.setVelocity(dx/length*125,(h.y-45-s.y)/length*125);s.setFlipX(dx<0);s.play('Flying eye:move',true);continue;
   }
   const grounded=s.body.blocked.down||s.body.touching.down;
   if(e.id==='Skeleton'){
    const sameFloor=heroGrounded&&!heroElevated&&Math.abs(h.body.bottom-s.body.bottom)<100;
    if(sameFloor&&dist<190&&time>=e.shieldReady&&(this.activeAction||Math.random()<0.004)){
     this.startShield(e,time);continue;
    }
    if(sameFloor&&dist<75&&Math.abs(h.y-s.y)<120&&time>=e.next){
     this.startEnemyAttack(e,time,Math.random()<0.5?'attack2':'attack');continue;
    }
    this.setEnemyState(e,'patrol',time);
    if(!e.patrolDirection)e.patrolDirection=s.x<640?1:-1;
    if(s.x<100)e.patrolDirection=1;
    if(s.x>1180)e.patrolDirection=-1;
    s.setVelocityX(e.patrolDirection*e.speed*0.55);
    s.setFlipX(e.patrolDirection<0);
    s.play('Skeleton:move',true);
    continue;
   }
   if(e.id==='Mushroom'&&!grounded){
    this.setEnemyState(e,'jump',time);s.setVelocityX(Math.sign(dx)*e.speed);s.play('Mushroom:move',true);continue;
   }
   const sameSurface=grounded&&heroGrounded&&Math.abs(h.body.bottom-s.body.bottom)<100;
   if(this.navigationGraph&&e.id==='Mushroom'&&grounded){
    const from=nearestSurfaceNode(this.navigationGraph,s.x,s.body.bottom,this.ground);
    const target=nearestSurfaceNode(this.navigationGraph,h.x,h.body.bottom,this.ground);
    if(target&&from&&(time>=e.routeAt||e.routeTarget!==target.id||e.routeStart!==from.id)){
     e.routeAlgorithm=this.algorithm||this.aiAlgorithm||'astar';e.routeNavigation=this.navigation||this.aiNavigation||'short';
     e.route=findPath(this.navigationGraph,from.id,target.id,e.routeAlgorithm,e.routeNavigation)||[];
     e.routeAt=time+500;e.routeStart=from.id;e.routeTarget=target.id;
    }
    const routeIndex=e.route?.indexOf(from?.id)??-1;
    const next=routeIndex>=0?this.navigationGraph.byId[e.route[routeIndex+1]]:null;
    const waypoint=next||target;
    const direction=waypoint?Math.sign(waypoint.x-s.x):Math.sign(dx);
    let jumped=false;
    if(next?.type==='platform'&&next.y<s.body.bottom-35&&Math.abs(next.x-s.x)<190&&time>=e.jumpAt){
     s.setVelocityY(-680);e.jumpAt=time+1200;jumped=true;
    }
    if(sameSurface&&dist<75&&Math.abs(h.y-s.y)<120&&time>=e.next){
     this.startEnemyAttack(e,time,Math.random()<0.5?'attack2':'attack');continue;
    }
    this.setEnemyState(e,jumped?'jump':'chase',time);
    s.setVelocityX(waypoint&&Math.abs(waypoint.x-s.x)>24?direction*e.speed:Math.sign(dx)*Math.min(e.speed,Math.abs(dx)));
    s.setFlipX(direction<0);s.play(`Mushroom:${Math.abs(dx)>45?'move':'idle'}`,true);continue;
   }
   if(grounded&&heroElevated&&dist<480&&time>=e.jumpAt){s.setVelocityY(e.boss?-720:-680);e.jumpAt=time+(e.boss?1800:1200);}
   this.setEnemyState(e,'pursue',time);
    if(grounded&&dist<(e.boss?150:75)&&Math.abs(h.y-s.y)<120&&time>=e.next){
    const action=!e.boss&&Math.random()<0.5?'attack2':'attack';this.startEnemyAttack(e,time,action);
   }else{s.setVelocityX(dist>45?Math.sign(dx)*e.speed:0);s.play(`${e.id}:${dist>45?'move':'idle'}`,true);}
  }
  for(const p of this.enemyProjectiles){
   if(!p.s.active)continue;
   if(time>p.expires||p.s.x<-50||p.s.x>1330||p.s.y>760){p.s.destroy();continue;}
   if(!p.hit&&overlaps(p.s.body,h.body)){
    p.hit=true;this.damage(12,time);p.s.body.stop();p.s.body.enable=false;p.s.play('eye:projectileImpact');p.s.once('animationcomplete',()=>p.s.destroy());
   }
  }
  this.enemyProjectiles=this.enemyProjectiles.filter(p=>p.s.active);
 }
};
