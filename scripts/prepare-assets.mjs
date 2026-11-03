import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.dirname(project);
const out = path.join(project, 'public/assets');
const packs = {
 'personajes/LeafRanger':'Elementals_Leaf_ranger_Free_v1.0 (1)/Elementals_Leaf_ranger_Free_v1.0',
 'personajes/CrystalMauler':'Elementals_Crystal_Mauler_Free_v1.0/Elementals_Crystal_Mauler_Free_v1.0',
 'personajes/GroundMonk':'Elementals_ground_monk_FREE_v1.3.1/Elementals_ground_monk_FREE_v1.3',
 'personajes/WaterPriestess':'Elementals_water_priestess_FREE_v1.1/Elementals_water_priestess_FREE_v1.1',
 'enemigos/Fantasy':'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy',
 'enemigos/Version1.2':'Monster_Creatures_Fantasy(Version 1.2)/Monster_Creatures_Fantasy(Version 1.2)',
 'enemigos/Version1.3':'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)',
 'enemigos/Forest':'Forest_Monsters_FREE/Forest_Monsters_FREE',
 'jefes/DemonSlime':'boss_demon_slime_FREE_v1.0/boss_demon_slime_FREE_v1.0',
 'jefes/FrostGuardian':'Frost_Guardian_FREE_v1.0/Frost_Guardian_FREE_v1.0',
 'jefes/Minotaur':'mino_v1.1_free/mino_v1.1_free',
 'fondos/ParallaxCave':'Parallax Cave',
 'fondos/CrystalCave':'free-crystal-cave-pixel-art-backgrounds',
 'audio':'Japanese Music Pack', 'controles':'Controllers and Keyboard/Controllers and Keyboard',
 'extras/Shadow':'SHADOW Series - The Free Assets'
};
for (const [dest, src] of Object.entries(packs)) {
 fs.cpSync(path.join(source, src), path.join(out, dest), {recursive:true, filter:p=>!p.includes('__MACOSX') && !p.endsWith('.meta')});
}
const manifest = {actors:{},maps:[],music:'audio/Shamisen Samurai Rock_Loop.ogg'};
function frames(id, base, actions, foot=1, portrait=null) {
 const actor={id,foot,actions:{}};
 if(portrait) actor.portrait=portrait;
 for(const [action, folder] of Object.entries(actions)) {
  const dir=`${base}/${folder}`;
  const files=fs.readdirSync(path.join(out,dir)).filter(f=>f.endsWith('.png')).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  if(!files.length) throw Error(`Sin frames: ${dir}`);
  actor.actions[action]={files:files.map(f=>`${dir}/${f}`)};
 }
 manifest.actors[id]=actor;
}
const common={idle:'idle',move:'run',attack:'1_atk',attack2:'2_atk',attack3:'3_atk',airAttack:'air_atk',special:'sp_atk',hurt:'take_hit',death:'death',roll:'roll',defend:'defend',up:'jump_up',down:'jump_down'};
frames('LeafRanger','personajes/LeafRanger/animations/PNG',{...common,jump:'jump_full',slide:'slide'},1,'personajes/LeafRanger/leaf_ranger.png');
frames('CrystalMauler','personajes/CrystalMauler/animations/PNG',{...common,up:'j_up',down:'j_down',jump:'jump_full'},1,'personajes/CrystalMauler/crystal_mauler.png');
frames('GroundMonk','personajes/GroundMonk/png',{...common,up:'j_up',down:'j_down',meditate:'meditate'},1,'personajes/GroundMonk/ground_monk.png');
frames('WaterPriestess','personajes/WaterPriestess/png',{idle:'01_idle',move:'02_walk',attack:'07_1_atk',attack2:'08_2_atk',attack3:'09_3_atk',airAttack:'air_atk',special:'10_sp_atk',hurt:'13_take_hit',death:'14_death',roll:'06_tumble',defend:'12_defend',heal:'11_heal',surf:'03_surf',up:'04_j_up',down:'05_j_down'},1,'personajes/WaterPriestess/water_priestess.png');
frames('DemonSlime','jefes/DemonSlime/individual sprites',{idle:'01_demon_idle',move:'02_demon_walk',attack:'03_demon_cleave',hurt:'04_demon_take_hit',death:'05_demon_death'});
frames('FrostGuardian','jefes/FrostGuardian/PNG files',{idle:'idle',move:'walk',attack:'1_atk',hurt:'take_hit',death:'death'},0.86);
frames('Minotaur','jefes/Minotaur/animations',{idle:'idle',move:'walk',attack:'atk_1'});
for(const id of ['Mushroom','Goblin','Skeleton','Flying eye']) {
 const actor={id,foot:0.67,actions:{}};
 for(const [action,file] of Object.entries({idle:id==='Flying eye'?'Flight':'Idle',move:id==='Skeleton'?'Walk':id==='Flying eye'?'Flight':'Run',attack:'Attack',hurt:'Take Hit',death:'Death'})) {
  actor.actions[action]={sheet:`enemigos/Fantasy/${id}/${file}.png`,width:150,height:150};
 }
 manifest.actors[id]=actor;
}
manifest.actors.ForestMushroom={id:'ForestMushroom',foot:0.8,actions:Object.fromEntries(Object.entries({idle:'Idle',move:'Run',attack:'Attack',hurt:'Hit',death:'Die'}).map(([a,f])=>[a,{sheet:`enemigos/Forest/Mushroom/Mushroom without VFX/Mushroom-${f}.png`,width:80,height:64}]))};
manifest.maps.push({name:'Caverna ancestral',layers:['1','2','3fx','4','5','6fx','7','8fx','9'].map(f=>`fondos/ParallaxCave/${f}.png`),ground:650,platforms:[
 {x:170,y:510,w:210},{x:450,y:390,w:210},{x:760,y:510,w:210},{x:1040,y:390,w:210},{x:620,y:300,w:160}
]});
const crystalPlatforms=[
 [{x:180,y:480,w:220},{x:470,y:360,w:220},{x:780,y:480,w:220},{x:1060,y:360,w:200},{x:620,y:300,w:160}],
 [{x:150,y:480,w:190},{x:420,y:370,w:210},{x:700,y:480,w:210},{x:990,y:370,w:210},{x:1170,y:300,w:140}],
 [{x:200,y:480,w:210},{x:510,y:360,w:200},{x:810,y:480,w:210},{x:1080,y:360,w:170},{x:650,y:300,w:150}],
 [{x:170,y:480,w:220},{x:480,y:360,w:200},{x:780,y:480,w:220},{x:1060,y:360,w:190}]
];
for(let i=1;i<=4;i++) manifest.maps.push({name:`Cristales ${['azules','verdes','violetas','rojos'][i-1]}`,layers:[`fondos/CrystalCave/PNG/background ${i}/background ${i}.png`],ground:620,platforms:crystalPlatforms[i-1]});
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Recursos preparados: ${Object.keys(manifest.actors).length} actores, ${manifest.maps.length} mapas.`);
