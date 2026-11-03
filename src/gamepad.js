export const standardButtons={jump:0,ability:1,attack:2,secondary:3,roll:4,defend:5,pause:9};
export const calibrationSteps=[['attack','X / Cuadrado'],['secondary','Y / Triángulo'],['ability','B / Círculo'],['roll','LB / L1'],['defend','RB / R1'],['jump','A / Cruz'],['pause','Start / Options']];
const key='emboscada-gamepads-v1';
export function buttonMap(pad,storage){
 try{
  const saved=JSON.parse(storage.getItem(key)||'{}')[pad?.id];
  if(saved&&Object.keys(standardButtons).every(k=>Number.isInteger(saved[k])&&saved[k]>=0&&saved[k]<pad.buttons.length)&&new Set(Object.values(saved)).size===7)return saved;
 }catch{}
 return standardButtons;
}
export function saveButtonMap(id,map,storage){
 let profiles={};try{profiles=JSON.parse(storage.getItem(key)||'{}');}catch{}
 storage.setItem(key,JSON.stringify({...profiles,[id]:map}));
}
