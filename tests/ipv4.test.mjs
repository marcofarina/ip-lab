import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIPv4, addressClass, splitAddress, sameNetwork, toBinary, fromBinary, isPrivate, smallestClass, exerciseRandom, randomAddress } from '../src/ipv4.mjs';
import { TOPICS } from '../src/topics.mjs';

test('formato IPv4 distinto dall’assegnabilità', () => {
  for (const value of ['256.10.4.5', '10.0.0', '172.16.300.1', '192.168.1.1.5', '192.168.1,20', '192.168.A.1', '-1.20.30.40']) assert.equal(parseIPv4(value), null);
  assert.deepEqual(parseIPv4('255.255.255.255'), [255, 255, 255, 255]);
});
test('classi e limiti', () => {
  for (const [first, expected] of [[1,'A'],[126,'A'],[127,'A'],[128,'B'],[191,'B'],[192,'C'],[223,'C'],[224,'D'],[239,'D'],[240,'E'],[255,'E']]) assert.equal(addressClass(`${first}.1.2.3`), expected);
  assert.equal(splitAddress('127.0.0.1'), null);
  assert.equal(splitAddress('0.1.2.3'), null);
  assert.equal(splitAddress('224.0.0.5'), null);
});
test('esempi del documento: parti, reti, broadcast e assegnabilità', () => {
  assert.deepEqual(splitAddress('172.20.5.9'), { className:'B', netId:'172.20', hostId:'5.9', network:'172.20.0.0', broadcast:'172.20.255.255', assignable:true });
  assert.equal(splitAddress('130.5.0.255').assignable, true);
  assert.equal(splitAddress('172.16.0.0').assignable, false);
  assert.equal(splitAddress('10.255.255.255').assignable, false);
  assert.equal(sameNetwork('191.10.20.30','191.10.99.1'), true);
  assert.equal(sameNetwork('172.16.0.1','172.17.0.1'), false);
});
test('conversioni reversibili su 1000 indirizzi generati', () => {
  const rng = exerciseRandom('TEST', 0, 'conversion');
  for (let i=0; i<1000; i++) {
    const ip = randomAddress(rng);
    assert.equal(fromBinary(toBinary(ip)), ip);
  }
  assert.equal(fromBinary('11000000.10101000.00000000.00001010'), '192.168.0.10');
  assert.equal(fromBinary('1.0.0.1'), null);
});
test('limiti RFC 1918 e capacità delle classi', () => {
  for (const ip of ['10.0.0.0','10.255.255.255','172.16.0.0','172.31.255.255','192.168.0.0','192.168.255.255']) assert.equal(isPrivate(ip), true);
  for (const ip of ['11.0.0.1','172.15.255.255','172.32.0.0','192.169.1.1']) assert.equal(isPrivate(ip), false);
  for (const [n,c] of [[1,'C'],[254,'C'],[255,'B'],[65534,'B'],[65535,'A'],[16777214,'A'],[16777215,null]]) assert.equal(smallestClass(n),c);
});
test('sequenze condivise riproducibili e separate per indice', () => {
  const sequence = code => Array.from({length:30}, (_, i) => randomAddress(exerciseRandom(code, i, 'classes')));
  assert.deepEqual(sequence('CLASSE-3A'), sequence('CLASSE-3A'));
  assert.notDeepEqual(sequence('CLASSE-3A'), sequence('CLASSE-3B'));
  assert.equal(new Set(sequence('CLASSE-3A')).size,30);
  assert.equal(TOPICS.length,24);
});
