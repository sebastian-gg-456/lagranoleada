export const characters = ['LeafRanger','CrystalMauler','GroundMonk','WaterPriestess'];
export const names = ['Leaf Ranger','Crystal Mauler','Ground Monk','Water Priestess'];
export const descriptions = [
 'Arquera ágil de largo alcance.\nBásico: flecha rápida. Secundario: flecha perforante.',
 'Coloso de cristal, lento pero demoledor.\nBásico: golpe aplastante. Secundario: impacto sísmico.',
 'Luchador veloz de golpes precisos.\nBásico: combinación de puños. Secundario: patada giratoria.',
 'Magia a distancia y control del campo.\nBásico: orbe de agua. Secundario: torrente purificador.'
];
export function wavePlan(wave) {
 const boss = wave % 5 === 0 ? ['DemonSlime','FrostGuardian','Minotaur'][(wave / 5 - 1) % 3] : null;
 return {count: Math.min(5 + wave * 2, 36), boss, hp: Math.round(35 + wave * 9), speed: Math.min(80 + wave * 5, 185)};
}
export function scoreFor(boss) { return boss ? 1000 : 100; }
export function readSave(storage) {
 try { const s=JSON.parse(storage.getItem('emboscada-v1')||'{}'); return {record:Math.max(0,Number(s.record)||0),music:typeof s.music==='number'?Math.max(0,Math.min(1,s.music)):0.45,sfx:typeof s.sfx==='number'?Math.max(0,Math.min(1,s.sfx)):0.6}; }
 catch { return {record:0,music:0.45,sfx:0.6}; }
}
