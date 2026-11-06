import { TOPICS } from './topics.mjs';
import { gradeExercise } from './exercises.mjs';
import { newSeed, createRaceCode, parseRaceCode, startSession, currentExercise, finishExercise, sessionSummary } from './game.mjs';

const root = document.querySelector('#app');
const state = { view:'home', mode:'endless', selected:new Set(TOPICS.filter(t=>!t.subnet).map(t=>t.id)), filter:'all', nickname:'', joinCode:'', raceCount:20, raceOutput:null, error:'', session:null, exercise:null, firstAnswers:null, firstGrade:null, result:null, feedback:null, exerciseIndex:0 };
const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n).toLocaleString('it-IT');
const modeName = mode => ({endless:'Endless',lives:'Sfida a 3 vite',race:'Gara di classe'}[mode]);
const btn = (label, action, classes='secondary', extra='') => `<button class="btn ${classes}" data-action="${action}" ${extra}>${label}</button>`;
const topicTag = t => t.subnet ? 'CIDR & subnetting' : t.advanced ? 'Approfondimento' : 'Eserciziario';

function render({focus=false}={}) {
  const section = state.view === 'session' || state.view === 'summary' ? modeName(state.session.mode) : {home:'Allenamento',race:'Gara in classe',guide:'Come funziona'}[state.view];
  root.innerHTML = `<div class="shell">
    <aside class="sidebar"><a class="brand" href="#" data-action="home"><span class="brand-mark">ip</span><span>IP Lab<small>La palestra degli indirizzi</small></span></a>
      <div class="side-label">Il tuo spazio</div><nav class="side-nav" aria-label="Navigazione principale">
      ${[['home','⌘','Allenamento'],['race','⚑','Gara in classe'],['guide','▤','Come funziona']].map(([view,icon,title])=>`<button data-action="${view}" class="${state.view===view?'active':''}" ${state.view===view?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span>${title}</button>`).join('')}</nav>
      <div class="side-card"><span class="side-chip"><span class="dot"></span> Impara facendo</span><p>Ogni indirizzo è una nuova occasione per capire le reti.</p><small style="color:#87a7aa;font-size:.65rem">IPv4 · Classi · CIDR · Subnetting</small></div>
    </aside><div class="page"><header class="topbar"><div class="breadcrumb">La tua palestra <span aria-hidden="true">/</span> <strong>${section}</strong></div><span class="top-tag">24 percorsi · Quarta informatica</span></header>
    <main id="main" tabindex="-1">${state.error?`<div class="notice error" role="alert">${esc(state.error)}</div>`:''}${({home:homeView,race:raceView,guide:guideView,session:sessionView,summary:summaryView}[state.view])()}</main>
    <footer class="footer"><span>IP Lab · Allenamento per ragionare sulle reti.<br>Le prime 17 sezioni seguono l’eserciziario del docente.</span><span>Nessun account. Nessuno storico salvato.<br>I risultati restano solo nella sessione aperta.</span></footer></div></div>
    <dialog id="leave-dialog" aria-labelledby="leave-title"><h2 id="leave-title">Concludere l’allenamento?</h2><p>Vedrai il punteggio ottenuto finora. L’esercizio corrente non verrà conteggiato se non lo hai ancora concluso.</p><div class="dialog-actions">${btn('Continua','close-dialog')}${btn('Vedi il risultato','confirm-end','primary')}</div></dialog>`;
  if (focus) document.querySelector('#main').focus({preventScroll:true});
}

function homeView() {
  const topics = TOPICS.filter(t=>state.filter==='all' || (state.filter==='workbook'?!t.subnet:state.filter==='subnet'?t.subnet:t.advanced));
  return `<section class="hero"><div><div class="eyebrow">Connetti le idee. Trova la rete.</div><h1>Un indirizzo alla volta.<br><span class="hero-accent">Un passo più avanti.</span></h1><p>Metti alla prova quello che sai sugli indirizzi IP. Scegli il tuo percorso, risolvi esercizi sempre generati e impara da ogni tentativo.</p><div class="hero-tags"><span>Esercizi casuali</span><span>Indizi e spiegazioni</span><span>Gare di classe</span></div></div>
  <div class="network-art" aria-label="Esempio di classe C: nell’indirizzo 192.168.1.42, net-id 192.168.1 e host-id 42"><div class="art-top"><span>Dentro un indirizzo</span><span class="art-label">Classe C</span></div><div class="octets">${['192','168','1','42'].map((n,i)=>`<div class="octet ${i===3?'host':''}">${n}</div>`).join('')}</div><div class="octet-labels"><span>Net-id · la rete</span><span>Host-id</span></div><div class="art-bottom">11000000 . 10101000 . 00000001 . 00101010</div></div></section>
  <section class="setup-grid" aria-label="Configura l’allenamento"><div class="card" id="setup"><div class="card-heading"><h2>Come vuoi allenarti?</h2><span class="step-label">Scegli il tuo ritmo</span></div><div class="modes">
  <button class="mode" data-action="mode" data-mode="endless" aria-pressed="${state.mode==='endless'}"><span class="mode-icon" aria-hidden="true">∞</span><span><strong>Endless</strong><small>Nessun limite. Ogni errore insegna.</small></span></button>
  <button class="mode" data-action="mode" data-mode="lives" aria-pressed="${state.mode==='lives'}"><span class="mode-icon" aria-hidden="true">♡</span><span><strong>3 vite</strong><small>Quanto lontano riesci ad arrivare?</small></span></button></div>
  <div class="setup-bottom"><div class="nickname"><label class="field-label" for="nickname">Il tuo nickname <span class="muted">(facoltativo)</span></label><input class="input" id="nickname" data-bind="nickname" maxlength="40" autocomplete="off" value="${esc(state.nickname)}" placeholder="Come ti chiami oggi?"></div>${btn('Inizia ad allenarti <span aria-hidden="true">↗</span>','start','primary')}</div><p class="launch-note"><span class="selection-count">${state.selected.size}</span> argomenti selezionati sotto · 2 tentativi per esercizio · Nessun bonus di velocità</p></div>
  <aside class="card join-card"><div class="eyebrow">Si gioca anche insieme</div><h3>Stessa classe.<br>Stessa sfida.</h3><p>Hai un codice dal docente? Entra nella gara con gli stessi esercizi dei tuoi compagni.</p>${btn('Inserisci il codice <span aria-hidden="true">→</span>','race')}</aside></section>
  <section id="topics"><div class="section-heading"><div><h2>Costruisci il tuo percorso</h2><p>Seleziona gli argomenti da mescolare, oppure allenati su uno solo.</p></div><button class="text-action" data-action="select-all">${state.selected.size===TOPICS.length?'Deseleziona tutto':'Seleziona tutti'}</button></div><div class="filters" role="group" aria-label="Filtra gli argomenti">${[['all','Tutti i percorsi'],['workbook','Dal tuo eserciziario'],['subnet','CIDR & subnetting'],['advanced','Approfondimenti']].map(([id,label])=>`<button class="filter ${state.filter===id?'active':''}" data-action="filter" data-filter="${id}" aria-pressed="${state.filter===id}">${label}</button>`).join('')}</div><div class="topic-grid">${topics.map(t=>`<article class="topic-card"><div class="topic-head"><span class="topic-number">${String(t.number).padStart(2,'0')}</span><label><span class="visually-hidden">Includi ${esc(t.title)}</span><input type="checkbox" data-topic="${t.id}" ${state.selected.has(t.id)?'checked':''}></label></div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><div class="topic-footer"><span class="topic-tag">${topicTag(t)}</span><button data-action="single-topic" data-topic="${t.id}">Allenati qui <span aria-hidden="true">↗</span></button></div></article>`).join('')}</div></section>`;
}

function raceView() {
  let parsed=null;
  try { if(state.raceOutput) parsed=parseRaceCode(state.raceOutput); } catch {}
  const link = parsed ? `${location.origin}${location.pathname}#gara=${encodeURIComponent(parsed.code)}` : '';
  return `<div class="page-intro"><div class="eyebrow">Una sfida da condividere</div><h1>La rete si allena insieme.</h1><p>Il codice contiene gli argomenti e il numero di esercizi. Tutti ricevono la stessa sequenza e procedono al proprio ritmo.</p></div><div class="race-grid"><section class="card"><h2>Entra in gara</h2><p>Inserisci il codice del docente. Ogni gara ha un traguardo fisso: nessuno viene eliminato prima dell’ultimo esercizio.</p><form id="join-form" class="stack"><div><label class="field-label" for="race-nickname">Nickname (facoltativo)</label><input id="race-nickname" class="input" data-bind="nickname" maxlength="40" value="${esc(state.nickname)}" placeholder="Il tuo nome di gara" autocomplete="off"></div><div><label class="field-label" for="join-code">Codice della gara</label><input id="join-code" class="input code" data-bind="joinCode" value="${esc(state.joinCode)}" placeholder="IP1-…" required autocomplete="off" spellcheck="false"></div><button class="btn primary" type="submit">Entra e comincia <span aria-hidden="true">→</span></button></form><p class="launch-note">Il nickname compare solo nel tuo risultato. Il docente non riceve automaticamente i punteggi.</p></section>
  <section class="card"><div class="eyebrow">Spazio docente</div><h2>Crea una gara</h2><p>Usa gli argomenti selezionati nella pagina Allenamento. Il codice funziona anche senza che il docente tenga aperto il sito.</p><p><strong>${state.selected.size} argomenti selezionati</strong> · <button class="text-action" data-action="configure-topics">Modifica argomenti</button></p><form id="create-race-form" class="stack"><div><label class="field-label" for="race-count">Numero di esercizi (da 5 a 100)</label><input type="number" class="input" id="race-count" min="5" max="100" step="1" value="${state.raceCount}" required data-bind="raceCount"></div><button class="btn primary" type="submit">Genera il codice <span aria-hidden="true">↗</span></button></form>
  ${parsed?`<div class="race-output" aria-live="polite"><label class="field-label">Codice pronto · ${parsed.count} esercizi</label><output>${esc(parsed.code)}</output><div class="row wrap">${btn('Copia codice','copy-code')}${btn('Copia link','copy-link')}${btn('Prova la gara','try-race','ghost')}</div><label class="field-label" for="race-link" style="margin-top:16px">Link da condividere</label><textarea id="race-link" rows="3" readonly>${esc(link)}</textarea><p class="launch-note">Condividi lo stesso codice con tutta la classe. Per un’altra sequenza, genera un nuovo codice.</p></div>`:''}</section></div><div class="notice">Il codice sincronizza gli esercizi, non l’avanzamento in diretta. La gara resta un’attività di allenamento: il punteggio è calcolato nel browser e può essere mostrato al docente a fine sessione.</div>`;
}

function guideView() {
  return `<div class="content-narrow"><div class="page-intro"><div class="eyebrow">Le regole del gioco</div><h1>Capire prima. Calcolare meglio.</h1><p>Una palestra per sperimentare, sbagliare e riprovare.</p></div><section class="card guide-section"><h2>Tre modi per metterti alla prova</h2><ul class="rules-list"><li><strong>Endless:</strong> continui finché vuoi. Premi “Concludi” per vedere il risultato.</li><li><strong>Sfida a 3 vite:</strong> perdi una vita solo se l’esercizio resta incompleto o errato dopo il secondo tentativo, oppure se chiedi la soluzione. La sessione termina a zero vite.</li><li><strong>Gara di classe:</strong> il docente sceglie da 5 a 100 esercizi e gli argomenti. Lo stesso codice produce la stessa sequenza per tutti; le risposte non cambiano gli esercizi successivi. La gara termina al numero previsto, senza eliminazione.</li></ul></section>
  <section class="card guide-section"><h2>Due tentativi, un passo alla volta</h2><p>Al primo errore ricevi un indizio. I campi già corretti restano acquisiti; puoi correggere gli altri una seconda volta. Poi vedrai tutte le risposte e la spiegazione. Il pulsante “Mi serve un indizio” consente di passare al secondo tentativo anche senza completare tutti i campi.</p><h2>Come si calcola il punteggio</h2><ul class="rules-list"><li>Ogni esercizio vale <strong>100 punti base</strong>, divisi in parti uguali tra i campi da compilare.</li><li>Un campo corretto al primo tentativo vale la sua quota intera. Recuperarlo al secondo vale il <strong>60% della quota</strong>.</li><li>Una risposta interamente corretta al primo tentativo allunga la tua serie. Ogni 3 esercizi consecutivi guadagni 10 punti bonus per esercizio, fino a un massimo di 50.</li><li>Nessun bonus dipende dal tempo. Ogni 500 punti sali di livello; puoi sbloccare cinque traguardi nel corso della sessione.</li><li>Il risultato mostra punti, precisione dei campi, esercizi risolti, serie migliore e riepilogo per argomento. Non è un voto scolastico.</li></ul><p class="muted">Esempio: in un esercizio con due campi, uno corretto subito e l’altro al secondo tentativo valgono 50 + 30 = 80 punti.</p></section>
  <section class="card guide-section"><h2>Classi e CIDR: leggi la consegna</h2><p>Le sezioni 1–17 seguono il <strong>modello storico per classi</strong> del documento. Nei calcoli net-id/host-id si usano le separazioni A /8, B /16, C /24. Le sezioni 18–24 usano invece il <strong>prefisso CIDR esplicito</strong>: la rete dipende dalla maschera, non dalla classe storica.</p><div class="table-scroll"><table class="reference-table"><caption class="visually-hidden">Promemoria delle classi storiche</caption><thead><tr><th>Classe</th><th>Primo ottetto</th><th>Struttura</th><th>Host/rete</th></tr></thead><tbody><tr><td>A</td><td>1–126</td><td>N.H.H.H</td><td>16.777.214</td></tr><tr><td>B</td><td>128–191</td><td>N.N.H.H</td><td>65.534</td></tr><tr><td>C</td><td>192–223</td><td>N.N.N.H</td><td>254</td></tr></tbody></table></div><p style="margin-top:18px">In classe A ci sono 128 reti teoriche, ma il modello del documento ne conta 126 utilizzabili: 0 e 127 sono riservati. Nei conteggi FLSM si usano tutte le sottoreti, compresa la sottorete zero.</p><p>I problemi di capacità e subnetting riguardano LAN ordinarie con prefissi fino a /30. <strong>/31</strong> ha regole specifiche per collegamenti punto a punto; <strong>/32</strong> identifica un singolo host. Non applicare automaticamente la formula “meno due” a questi casi.</p><p>IPv4 valido nel formato non significa assegnabile. Inoltre, “fuori da RFC 1918” non significa sempre pubblico: esistono blocchi speciali. Gli esempi della sezione Privati escludono questi altri blocchi.</p></section>
  <section class="card guide-section"><h2>Come scrivere le risposte</h2><p>Usa punti tra gli ottetti, otto bit per ogni ottetto binario e solo gli ottetti richiesti per net-id e host-id. Per i prefissi sono accettati sia “24” sia “/24”. Nei numeri interi puoi usare spazi o punti come separatori delle migliaia.</p><h2>I tuoi dati</h2><p>Non ci sono registrazione, classifica online, cookie di tracciamento o storico locale. Nickname e risultati rimangono nella memoria della scheda aperta e si perdono ricaricandola o chiudendola. Il codice gara si può riutilizzare per ripartire dal primo esercizio.</p><h2>Riferimenti</h2><p><a href="https://www.rfc-editor.org/rfc/rfc791" target="_blank" rel="noreferrer">IPv4 e classi storiche · RFC 791</a><br><a href="https://www.rfc-editor.org/rfc/rfc1918" target="_blank" rel="noreferrer">Indirizzi privati · RFC 1918</a><br><a href="https://www.rfc-editor.org/rfc/rfc4632" target="_blank" rel="noreferrer">CIDR · RFC 4632</a><br><a href="https://www.rfc-editor.org/rfc/rfc3021" target="_blank" rel="noreferrer">Collegamenti /31 · RFC 3021</a><br><a href="https://www.iana.org/assignments/iana-ipv4-special-registry/" target="_blank" rel="noreferrer">Registro IANA degli indirizzi speciali</a></p></section></div>`;
}

function hud() {
  const s=state.session, summary=sessionSummary(s);
  return `<div class="hud"><div class="hud-item"><span class="hud-label">Punteggio</span><strong class="hud-value">${fmt(s.score)}</strong></div><div class="hud-item"><span class="hud-label">${s.mode==='lives'?'Vite rimaste':'Esercizi conclusi'}</span><strong class="hud-value ${s.mode==='lives'?'heart':''}" ${s.mode==='lives'?`aria-label="${s.lives} vite"`:''}>${s.mode==='lives'?'♥'.repeat(s.lives)+'♡'.repeat(3-s.lives):`${s.index}${s.count?` <small>/ ${s.count}</small>`:''}`}</strong></div><div class="hud-item"><span class="hud-label">Serie attuale</span><strong class="hud-value">${s.streak} <small>di fila</small></strong></div><div class="hud-item"><span class="hud-label">Livello</span><strong class="hud-value">${summary.level} <small>· ${fmt(s.score%500)}/500</small></strong></div></div>`;
}

function answerField(f) {
  const final = state.result?.details.find(d=>d.key===f.key), first = state.firstGrade?.details.find(d=>d.key===f.key);
  const status = final ? final.correct?'correct':'incorrect' : first ? first.correct?'correct':'incorrect' : '';
  const locked = Boolean(state.result || first?.correct);
  const value = state.firstAnswers?.[f.key] ?? '';
  const id=`answer-${f.key}`;
  const feedback = final ? (final.correct?'✓ Corretto':`Risposta: ${final.expected}`) : first?.correct?'✓ Già corretto':first?'Riprova con l’indizio':'';
  const control = f.options ? `<select id="${id}" name="${f.key}" required ${locked?'disabled':''} ${feedback?`aria-describedby="feedback-${f.key}"`:''}><option value="">Scegli una risposta…</option>${f.options.map(v=>`<option value="${esc(v)}" ${value===v?'selected':''}>${esc(v)}</option>`).join('')}</select>` : `<input class="input" id="${id}" name="${f.key}" value="${esc(value)}" ${f.kind==='integer'?'inputmode="numeric"':''} ${locked?'readonly':''} autocomplete="off" spellcheck="false" required ${feedback?`aria-describedby="feedback-${f.key}"`:''} placeholder="${f.kind==='binary'?'00000000.00000000.00000000.00000000':f.kind==='ip'?'0.0.0.0':f.kind==='prefix'?'/24':'La tua risposta'}">`;
  return `<div class="answer-field ${status} ${f.kind==='binary'||f.options?.some(v=>v.length>35)?'wide':''}"><label class="field-label" for="${id}">${esc(f.label)}</label>${control}${feedback?`<div id="feedback-${f.key}" class="field-feedback">${esc(feedback)}</div>`:''}</div>`;
}

function sessionView() {
  const s=state.session, q=state.exercise;
  const progress=s.count?s.index/s.count*100:(s.score%500)/500*100;
  const feedback=state.result ? `<div class="feedback ${state.result.correct?'':'fail'}" role="status" tabindex="-1" id="exercise-feedback"><strong>${state.result.correct?'Ben fatto. La rete è raggiunta!':'Un passaggio in più da allenare.'} <span>+${state.result.points} punti${state.result.bonus?` · bonus serie +${state.result.bonus}`:''}</span></strong><p>${esc(q.explanation)}</p>${s.mode==='lives'&&!state.result.correct?'<p>Hai perso una vita per questo esercizio.</p>':''}${btn(s.endedAt?'Vedi il risultato finale':'Prossimo esercizio →','next','primary')}</div>` : state.firstGrade ? `<div class="feedback retry" role="status" tabindex="-1" id="exercise-feedback"><strong>Ci sei quasi: ${state.firstGrade.correctFields} campi corretti su ${state.firstGrade.totalFields}.</strong><p>${esc(q.hint)}</p><p>Correggi i campi rimasti e invia il secondo tentativo.</p></div>` : '';
  const answerHtml = q.rows ? q.rows.map((ip,i)=>`<div class="group-row"><div class="group-ip">${esc(ip)}</div><div class="answer-grid">${q.fields.slice(i*2,i*2+2).map(answerField).join('')}</div></div>`).join('') : `<div class="answer-grid">${q.fields.map(answerField).join('')}</div>`;
  return `<div class="session-header"><div><h1>${modeName(s.mode)}</h1><div class="session-meta">${esc(s.nickname)}${s.code?` · <span class="code">${esc(s.code)}</span>`:''}</div></div>${btn('Concludi','end','secondary')}</div>${hud()}<div class="progress-track" role="progressbar" aria-label="${s.count?'Avanzamento della gara':'Avanzamento al prossimo livello'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><span style="width:${progress}%"></span></div>
  <article class="card exercise-card"><div class="exercise-top"><div class="eyebrow">Esercizio ${state.exerciseIndex+1}${s.count?` di ${s.count}`:''} · ${TOPICS.find(t=>t.id===q.topicId).subnet?'CIDR & subnetting':'Modello per classi'}</div><span class="attempt-tag">${state.result?'Correzione':state.firstGrade?'Tentativo 2 di 2':'Tentativo 1 di 2'}</span></div><h2>${esc(q.title)}</h2><p class="exercise-prompt">${esc(q.prompt)}</p><div class="address-display ${q.display.length>45?'long':''}">${esc(q.display)}</div><form id="answer-form">${answerHtml}${!state.result?`<div class="exercise-actions">${btn(state.firstGrade?'Mostra la soluzione':'Mi serve un indizio',state.firstGrade?'solution':'hint','ghost')}<button class="btn primary" type="submit">${state.firstGrade?'Verifica il secondo tentativo':'Verifica la risposta'} <span aria-hidden="true">→</span></button></div>`:''}</form>${feedback}</article>`;
}

function summaryView() {
  const s=state.session, stats=sessionSummary(s);
  const byTopic=TOPICS.map(t=>{const results=s.results.filter(r=>r.topicId===t.id);return {t,results,percentage:results.length?Math.round(results.reduce((n,r)=>n+r.fraction,0)/results.length*100):0};}).filter(v=>v.results.length);
  const endedEarly=s.mode==='race'&&s.index<s.count;
  return `<div class="content-narrow"><section class="summary-hero"><div class="eyebrow">${endedEarly?'Gara conclusa in anticipo':'Allenamento concluso'}</div><h1>${stats.completed?`Un altro passo avanti, ${esc(s.nickname)}.`:'Il tuo percorso ti aspetta.'}</h1><p class="muted">${modeName(s.mode)}${s.code?` · codice <span class="code">${esc(s.code)}</span>`:''}</p><div class="score-orbit"><strong>${fmt(s.score)}</strong><span>Punti totali</span></div><p class="muted">Livello ${stats.level} · ${Math.floor(stats.seconds/60)} min ${stats.seconds%60} s · Nessuno storico salvato</p>${endedEarly?`<div class="notice">Hai concluso ${s.index} esercizi su ${s.count}. Questo risultato è parziale.</div>`:''}<div class="hud"><div class="hud-item"><span class="hud-label">Esercizi</span><strong class="hud-value">${stats.completed}</strong></div><div class="hud-item"><span class="hud-label">Risolti</span><strong class="hud-value">${stats.correct}</strong></div><div class="hud-item"><span class="hud-label">Precisione</span><strong class="hud-value">${stats.accuracy}%</strong></div><div class="hud-item"><span class="hud-label">Serie migliore</span><strong class="hud-value">${s.bestStreak}</strong></div></div>${stats.badges.length?`<div class="badges" aria-label="Traguardi sbloccati">${stats.badges.map(b=>`<span class="badge">✧ ${b}</span>`).join('')}</div>`:''}<div class="row wrap" style="justify-content:center">${btn(s.mode==='race'?'Riprova la stessa gara':'Nuovo allenamento','restart','primary')}${btn('Scegli un altro percorso','home')}</div></section>
  ${byTopic.length?`<section class="card"><h2 style="font-size:1.2rem">Il tuo allenamento, argomento per argomento</h2><p class="muted" style="font-size:.78rem">La precisione indica la media dei campi corretti dopo i tentativi disponibili.</p><div class="summary-topics">${byTopic.map(({t,results,percentage})=>`<div class="summary-topic"><span>${esc(t.title)} <small>· ${results.length} esercizi</small></span><strong>${percentage}%</strong><progress max="100" value="${percentage}" aria-label="Precisione in ${esc(t.title)}"></progress></div>`).join('')}</div><details class="summary-review"><summary>Rivedi le spiegazioni degli esercizi</summary>${s.results.map(r=>`<div class="review-item"><strong>${r.index+1}. ${esc(TOPICS.find(t=>t.id===r.topicId).title)} · ${r.correct?'Risolto':'Da ripassare'} · ${r.points} punti</strong><p>${esc(r.display)}</p><p>${esc(r.explanation)}</p></div>`).join('')}</details></section>`:''}</div>`;
}

function changeView(view) {
  if(state.view==='session'&&!state.session.endedAt) {
    state.pendingView=view;
    document.querySelector('#leave-dialog').showModal();
    return;
  }
  state.view=view;state.error='';render({focus:true});window.scrollTo({top:0});
}
function launch(options) {
  state.session=startSession({...options,nickname:state.nickname});
  state.view='session';state.error='';loadExercise();
  render({focus:true});window.scrollTo({top:0});
}
function loadExercise() {
  state.exercise=currentExercise(state.session);state.exerciseIndex=state.session.index;
  state.firstAnswers=null;state.firstGrade=null;state.result=null;
}
function collectAnswers() {
  const form=document.querySelector('#answer-form');
  return {...state.firstAnswers,...Object.fromEntries(new FormData(form))};
}
function finish(answers, second) {
  const output=finishExercise(state.session,state.exercise,answers,second);
  state.session=output.session;state.result=output.result;
  state.firstAnswers=second??answers;
  render();document.querySelector('#exercise-feedback').focus();
}
function firstAttempt(answers) {
  const graded=gradeExercise(state.exercise,answers);
  if(graded.correct) return finish(answers,null);
  state.firstAnswers=answers;state.firstGrade=graded;render();document.querySelector('#exercise-feedback').focus();
}
function endSession() {
  state.session.endedAt??=Date.now();state.view='summary';state.error='';state.pendingView=null;render({focus:true});window.scrollTo({top:0});
}
function notify(message) {
  document.querySelector('.toast')?.remove();
  const toast=document.createElement('div');toast.className='toast';toast.setAttribute('role','status');toast.textContent=message;document.body.append(toast);setTimeout(()=>toast.remove(),3500);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text);notify('Copiato. Pronto da condividere.'); }
  catch { notify('Seleziona il testo e copialo con Ctrl+C o dal menu del dispositivo.'); }
}

root.addEventListener('input',event=>{
  const binding=event.target.dataset.bind;
  if(binding) state[binding]=binding==='raceCount'?Number(event.target.value):event.target.value;
});
root.addEventListener('change',event=>{
  const id=event.target.dataset.topic;
  if(!id) return;
  if(event.target.checked) state.selected.add(id);else state.selected.delete(id);
  document.querySelectorAll('.selection-count').forEach(el=>el.textContent=state.selected.size);
  const all=document.querySelector('[data-action="select-all"]');if(all)all.textContent=state.selected.size===TOPICS.length?'Deseleziona tutto':'Seleziona tutti';
});
root.addEventListener('submit',event=>{
  event.preventDefault();state.error='';
  try {
    if(event.target.id==='answer-form') {
      if(state.result)return;
      const answers=collectAnswers();
      if(!state.firstGrade) firstAttempt(answers);else finish(state.firstAnswers,answers);
    }
    if(event.target.id==='join-form') launch(parseRaceCode(state.joinCode));
    if(event.target.id==='create-race-form') {state.raceOutput=createRaceCode([...state.selected],state.raceCount);render();document.querySelector('.race-output').scrollIntoView({behavior:'smooth',block:'nearest'});}
  } catch(error) {state.error=error.message;render();document.querySelector('[role="alert"]')?.scrollIntoView({block:'center'});}
});
root.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target)return;
  event.preventDefault();const action=target.dataset.action;
  try {
    if(['home','race','guide'].includes(action))return changeView(action);
    if(action==='mode'){state.mode=target.dataset.mode;render();}
    if(action==='filter'){state.filter=target.dataset.filter;render();}
    if(action==='select-all'){state.selected=state.selected.size===TOPICS.length?new Set():new Set(TOPICS.map(t=>t.id));render();}
    if(action==='single-topic'){state.selected=new Set([target.dataset.topic]);launch({topics:[...state.selected],mode:state.mode});}
    if(action==='start')launch({topics:[...state.selected],mode:state.mode});
    if(action==='configure-topics'){changeView('home');document.querySelector('#topics').scrollIntoView({behavior:'smooth'});}
    if(action==='try-race')launch(parseRaceCode(state.raceOutput));
    if(action==='copy-code')await copy(state.raceOutput);
    if(action==='copy-link')await copy(`${location.origin}${location.pathname}#gara=${encodeURIComponent(state.raceOutput)}`);
    if(action==='hint'&&!state.result)firstAttempt(collectAnswers());
    if(action==='solution'&&!state.result)finish(state.firstAnswers,null);
    if(action==='next') {if(state.session.endedAt) endSession();else{loadExercise();render({focus:true});document.querySelector('.exercise-card').scrollIntoView({block:'start'});}}
    if(action==='end') {if(state.session.endedAt)endSession();else document.querySelector('#leave-dialog').showModal();}
    if(action==='close-dialog')document.querySelector('#leave-dialog').close();
    if(action==='confirm-end')endSession();
    if(action==='restart') {const old=state.session;launch(old.mode==='race'?parseRaceCode(old.code):{topics:old.topics,mode:old.mode,seed:newSeed()});}
  }catch(error){state.error=error.message;render();document.querySelector('[role="alert"]')?.scrollIntoView({block:'center'});}
});

function readHash() {
  const params=new URLSearchParams(location.hash.slice(1));
  if(params.has('gara')) {state.joinCode=params.get('gara');state.view='race';}
}
window.addEventListener('hashchange',()=>{if(state.view!=='session'){readHash();render();}});
window.addEventListener('beforeunload',event=>{if(state.view==='session'&&!state.session.endedAt){event.preventDefault();event.returnValue='';}});
readHash();render();
