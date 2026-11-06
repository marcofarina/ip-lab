import { TOPICS } from './topics.mjs';
import { seededRandom } from './ipv4.mjs';
import { generateExercise, topicAt, gradeExercise } from './exercises.mjs';

export const RULES_VERSION = 1;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newSeed() {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes,n=>alphabet[n % alphabet.length]).join('');
}
function checksum(text) {
  return Math.floor(seededRandom(text)() * 36**4).toString(36).padStart(4,'0').toUpperCase();
}
export function createRaceCode(topics, count, seed = newSeed()) {
  if (!Number.isInteger(count) || count < 5 || count > 100) throw new Error('Scegli da 5 a 100 esercizi.');
  const chosen = TOPICS.filter(t=>topics.includes(t.id));
  if (!chosen.length) throw new Error('Seleziona almeno un argomento.');
  if (!/^[A-Z2-9]{8}$/.test(seed)) throw new Error('Seme non valido.');
  const mask = chosen.reduce((n,t)=>n + 2**(t.number-1),0).toString(36).toUpperCase();
  const body = `IP${RULES_VERSION}-${mask}-${count.toString(36).toUpperCase()}-${seed}`;
  return `${body}-${checksum(body)}`;
}
export function parseRaceCode(input) {
  const code = String(input).trim().toUpperCase();
  const match = /^IP1-([0-9A-Z]{1,5})-([0-9A-Z]{1,2})-([A-Z2-9]{8})-([0-9A-Z]{4})$/.exec(code);
  if (!match || checksum(code.slice(0,code.lastIndexOf('-'))) !== match[4]) throw new Error('Codice non valido. Controlla di averlo copiato per intero.');
  const mask = parseInt(match[1],36), count = parseInt(match[2],36);
  if (mask < 1 || mask >= 2**TOPICS.length || count < 5 || count > 100) throw new Error('Le impostazioni del codice non sono valide.');
  const topics = TOPICS.filter(t=>(mask & 2**(t.number-1)) !== 0).map(t=>t.id);
  return { code, topics, count, seed:code, mode:'race' };
}

export function startSession({nickname = '', topics, mode = 'endless', seed = newSeed(), count = null, code = null}) {
  const validTopics = TOPICS.filter(t=>topics?.includes(t.id)).map(t=>t.id);
  if (!validTopics.length) throw new Error('Seleziona almeno un argomento.');
  if (!['endless','lives','race'].includes(mode)) throw new Error('Modalità non valida.');
  if (mode === 'race' && (!Number.isInteger(count) || count < 5 || count > 100)) throw new Error('Numero di esercizi non valido.');
  return { nickname:String(nickname).trim().slice(0,40) || 'Esploratore', topics:validTopics, mode, seed, code, count:mode === 'race' ? count : null, lives:mode === 'lives' ? 3 : null, index:0, score:0, streak:0, bestStreak:0, results:[], startedAt:Date.now(), endedAt:null };
}
export function currentExercise(session) {
  if (isFinished(session)) return null;
  return generateExercise(topicAt(session.seed,session.index,session.topics),session.seed,session.index);
}
export function isFinished(session) {
  return Boolean(session.endedAt || (session.mode === 'lives' && session.lives <= 0) || (session.count !== null && session.index >= session.count));
}
export function finishExercise(session, exercise, firstAnswers = {}, secondAnswers = null) {
  if (isFinished(session)) throw new Error('Sessione già conclusa.');
  const expected = currentExercise(session);
  if (exercise.id !== expected.id) throw new Error('Esercizio fuori sequenza.');
  const first = gradeExercise(exercise,firstAnswers);
  const final = secondAnswers === null ? first : gradeExercise(exercise,secondAnswers);
  const firstCount = first.correctFields;
  // Previously correct answers remain credited, including on a second attempt.
  const recovered = final.details.filter((d,i)=>d.correct && !first.details[i].correct).length;
  const allCorrect = final.correct || first.correct;
  const streak = first.correct ? session.streak + 1 : 0;
  const bonus = first.correct ? Math.min(50,Math.floor(streak/3)*10) : 0;
  const points = Math.round(100 * firstCount / first.totalFields + 60 * recovered / first.totalFields) + bonus;
  const result = { topicId:exercise.topicId, index:session.index, display:exercise.display, firstCorrect:first.correct, correct:allCorrect, fraction:(firstCount+recovered)/first.totalFields, points, bonus, attempts:secondAnswers === null ? 1 : 2, explanation:exercise.explanation, details:final.details };
  const next = {...session, index:session.index+1, score:session.score+points, streak, bestStreak:Math.max(session.bestStreak,streak), lives:session.lives === null ? null : session.lives-(allCorrect ? 0 : 1), results:[...session.results,result]};
  if (isFinished(next)) next.endedAt = Date.now();
  return { session:next, result };
}
export function sessionSummary(session) {
  const completed = session.results.length;
  const correct = session.results.filter(r=>r.correct).length;
  const accuracy = completed ? Math.round(session.results.reduce((n,r)=>n+r.fraction,0)/completed*100) : 0;
  const badges = [];
  if (correct >= 1) badges.push('Primo pacchetto');
  if (session.bestStreak >= 5) badges.push('Cinque di fila');
  if (completed >= 10) badges.push('Dieci tappe');
  if (completed >= 5 && accuracy >= 90) badges.push('Precisione da esperto');
  if (new Set(session.results.map(r=>r.topicId)).size >= 5) badges.push('Esploratore di reti');
  return { completed, correct, accuracy, badges, level:1+Math.floor(session.score/500), seconds:Math.floor(((session.endedAt??Date.now())-session.startedAt)/1000) };
}
