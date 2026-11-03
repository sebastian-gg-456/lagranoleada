import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wavePlan,readSave,characters,descriptions} from '../src/rules.js';
test('jefes cada cinco oleadas, rotando los tres packs',()=>{
 assert.equal(wavePlan(4).boss,null);
 assert.equal(wavePlan(5).boss,'DemonSlime');
 assert.equal(wavePlan(10).boss,'FrostGuardian');
 assert.equal(wavePlan(15).boss,'Minotaur');
 assert.equal(wavePlan(20).boss,'DemonSlime');
});
test('oleadas infinitas aumentan resistencia sin saturar enemigos o velocidad',()=>{
 assert.ok(wavePlan(1000).hp>wavePlan(10).hp);
 assert.equal(wavePlan(1000).count,36);
 assert.equal(wavePlan(1000).speed,185);
});
test('guardado corrupto recupera valores seguros',()=>{
 assert.equal(readSave({getItem:()=>'{bad'}).record,0);
 assert.deepEqual(readSave({getItem:()=>'{"record":-20,"music":5,"sfx":-2}'}),{record:0,music:1,sfx:0});
});
test('cada personaje tiene una descripción individual',()=>{
 assert.equal(descriptions.length,characters.length);
 assert.equal(new Set(descriptions).size,characters.length);
 assert.ok(descriptions.every(d=>d.includes('Básico')&&d.includes('Secundario')));
});
