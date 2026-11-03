export const characters = ['LeafRanger','CrystalMauler','GroundMonk','WaterPriestess'];
export const names = ['Leaf Ranger','Crystal Mauler','Ground Monk','Water Priestess'];
export const bosses={DemonSlime:{name:'MORGATH · DEVORADOR DEL ABISMO',scale:2.8,damage:38,nativeFacing:-1},FrostGuardian:{name:'HRÍMGAR · TITÁN DEL INVIERNO',scale:3.1,damage:42,nativeFacing:-1},Minotaur:{name:'ASTERIÓN · AZOTE DEL LABERINTO',scale:2.8,damage:45,nativeFacing:-1}};
export const descriptions = [
 'Arquera ágil. Básico X: golpe. Secundario Y: flecha; cargá 1,5 s para área o veneno. B: lluvia de flechas.',
 'Coloso de cristal. Básico X: combo de 2 golpes. Secundario Y: área. B: ataque especial.',
 'Luchador veloz. Básico X: combo de 3 golpes. Secundario Y: especial. B: meditación de 3 s.',
 'Magia de agua. Básico X: combo de 3 ataques. Secundario Y: área frontal y congelación. B: cura de 25 (15 s).'
];
export function wavePlan(wave) {
 const boss = wave % 5 === 0 ? ['DemonSlime','FrostGuardian','Minotaur'][(wave / 5 - 1) % 3] : null;
 return {count: boss?0:Math.min(5 + wave * 2, 36), boss, hp: Math.round(35 + wave * 9), speed: Math.min(80 + wave * 5, 185)};
}
export function scoreFor(boss) { return boss ? 1000 : 100; }
export function readSave(storage) {
 try { const s=JSON.parse(storage.getItem('emboscada-v1')||'{}'); return {record:Math.max(0,Number(s.record)||0),music:typeof s.music==='number'?Math.max(0,Math.min(1,s.music)):0.45,sfx:typeof s.sfx==='number'?Math.max(0,Math.min(1,s.sfx)):0.6}; }
 catch { return {record:0,music:0.45,sfx:0.6}; }
}
