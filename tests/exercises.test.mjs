import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS } from '../src/topics.mjs';
import { generateExercise, gradeExercise, normalizeAnswer, topicAt } from '../src/exercises.mjs';
import { prefixMask, maskPrefix, subnetInfo, prefixForHosts, allocateVlsm, ipNumber } from '../src/subnet.mjs';
import { createRaceCode, parseRaceCode, startSession, currentExercise, finishExercise } from '../src/game.mjs';
import { splitAddress } from '../src/ipv4.mjs';

test('maschere contigue e tutti i prefissi, inclusi /0 e /32',()=>{
  for(let p=0;p<=32;p++) assert.equal(maskPrefix(prefixMask(p)),p);
  assert.equal(maskPrefix('255.0.255.0'),null);
  assert.equal(prefixMask(23),'255.255.254.0');
  assert.deepEqual(subnetInfo('192.168.5.77',26), {prefix:26,mask:'255.255.255.192',size:64,network:'192.168.5.64',broadcast:'192.168.5.127',firstHost:'192.168.5.65',lastHost:'192.168.5.126',hosts:62,special:null});
  assert.equal(subnetInfo('200.150.100.50',0).network,'0.0.0.0');
  assert.equal(subnetInfo('200.150.100.50',0).broadcast,'255.255.255.255');
  assert.equal(subnetInfo('192.168.1.5',31).hosts,2);
  assert.equal(subnetInfo('192.168.1.5',31).broadcast,null);
  assert.equal(subnetInfo('192.168.1.5',32).firstHost,'192.168.1.5');
  assert.equal(prefixForHosts(254),24);
  assert.equal(prefixForHosts(255),23);
});
test('VLSM: ordine, allineamento e assenza di sovrapposizioni',()=>{
  const plan=allocateVlsm('192.168.10.0',24,[12,100,50]);
  assert.deepEqual(plan.map(p=>`${p.network}/${p.prefix}`),['192.168.10.0/25','192.168.10.128/26','192.168.10.192/28']);
  assert.deepEqual(plan.map(p=>p.index),[1,2,0]);
  for(let i=0;i<plan.length;i++) {
    assert.equal(ipNumber(plan[i].network)%plan[i].size,0);
    if(i) assert.ok(ipNumber(plan[i].network)>ipNumber(plan[i-1].broadcast));
  }
  assert.throws(()=>allocateVlsm('10.0.0.0',24,[200,100]),/insufficiente/);
});
test('tutte le 24 tipologie: 200 varianti ciascuna, risposte complete e opzioni coerenti',()=>{
  for(const topic of TOPICS) for(let i=0;i<200;i++) {
    const q=generateExercise(topic.id,'AUDIT',i);
    assert.ok(q.prompt && q.explanation && q.hint && q.fields.length,topic.id);
    assert.equal(new Set(q.fields.map(f=>f.key)).size,q.fields.length);
    for(const f of q.fields) {
      assert.ok(f.answer && f.answer !== 'undefined' && f.answer !== 'null',`${topic.id}: ${f.key}`);
      if(f.options) { assert.ok(f.options.includes(f.answer)); assert.equal(new Set(f.options).size,f.options.length); }
    }
    const answers=Object.fromEntries(q.fields.map(f=>[f.key,f.answer]));
    assert.equal(gradeExercise(q,answers).correct,true);
    assert.equal(gradeExercise(q,{}).correct,false);
    assert.deepEqual(q,generateExercise(topic.id,'AUDIT',i));
  }
});
test('tutti gli argomenti selezionati prima di una ripetizione',()=>{
  const ids=TOPICS.map(t=>t.id);
  for(let cycle=0;cycle<10;cycle++) assert.equal(new Set(Array.from({length:ids.length},(_,i)=>topicAt('CLASSE',cycle*ids.length+i,ids))).size,ids.length);
});
test('raggruppamento: dodici indirizzi distinti in sei reti, due per classe',()=>{
  for(let i=0;i<3000;i++) {
    const q=generateExercise('grouping','GROUPING-AUDIT',i);
    assert.equal(new Set(q.rows).size,12);
    const groups=new Map();
    for(const ip of q.rows) {
      const d=splitAddress(ip), key=`${d.className}:${d.netId}`;
      groups.set(key,(groups.get(key)??0)+1);
    }
    assert.equal(groups.size,6);
    assert.ok([...groups.values()].every(n=>n===2));
  }
});
test('codice gara: contiene argomenti e lunghezza, rileva errori di copia',()=>{
  const topics=['validity','vlsm','cidr-mask'];
  const code=createRaceCode(topics,20,'ABCDEFGH');
  const parsed=parseRaceCode(code.toLowerCase());
  assert.equal(parsed.count,20);
  assert.deepEqual(new Set(parsed.topics),new Set(topics));
  assert.throws(()=>parseRaceCode(code.slice(0,-1)+(code.endsWith('A')?'B':'A')),/non valido/);
  assert.throws(()=>createRaceCode([],20,'ABCDEFGH'));
  const a=startSession({...parsed,nickname:'Ada'}), b=startSession({...parsed,nickname:'Luca'});
  assert.deepEqual(currentExercise(a),currentExercise(b));
});
test('secondo tentativo, punti parziali, vite ed esercizi invarianti rispetto alle risposte',()=>{
  let s=startSession({topics:['classes'],mode:'lives',seed:'LIVES'});
  const q=currentExercise(s), correct=Object.fromEntries(q.fields.map(f=>[f.key,f.answer]));
  const recovered=finishExercise(s,q,{},correct);
  assert.equal(recovered.session.score,60);
  assert.equal(recovered.session.lives,3);
  const failed=finishExercise(s,q,{},{});
  assert.equal(failed.session.lives,2);
  assert.deepEqual(currentExercise(recovered.session),currentExercise(failed.session));
  s=failed.session;
  for(let i=0;i<2;i++) s=finishExercise(s,currentExercise(s),{},{}).session;
  assert.equal(s.lives,0);
  assert.equal(currentExercise(s),null);
  const race=parseRaceCode(createRaceCode(['classes'],5,'ABCDEFGH'));
  s=startSession(race);
  for(let i=0;i<5;i++) s=finishExercise(s,currentExercise(s),{},{}).session;
  assert.equal(s.results.length,5);
  assert.ok(s.endedAt);
  assert.equal(s.lives,null);
});
test('normalizzazione dei numeri italiani senza accettare numeri decimali come interi',()=>{
  assert.equal(normalizeAnswer('16.777.214','integer'),'16777214');
  assert.equal(normalizeAnswer('2.54','integer'),'2.54');
  assert.equal(normalizeAnswer(' /24 ','prefix'),'24');
});
