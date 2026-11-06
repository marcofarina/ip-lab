import { CLASS_INFO, addressClass, splitAddress, sameNetwork, toBinary, isPrivate, smallestClass, exerciseRandom, randomInteger, randomAddress } from './ipv4.mjs';
import { TOPICS } from './topics.mjs';
import { prefixMask, subnetInfo, prefixForHosts, allocateVlsm, ipNumber, numberIp } from './subnet.mjs';

const classes = ['A', 'B', 'C'];
const field = (key, label, answer, options, kind = 'text') => ({ key, label, answer: String(answer), options, kind });
const classField = answer => field('class', 'Classe', answer, classes);
const yesNo = (key, label, value) => field(key, label, value ? 'Sì' : 'No', ['Sì', 'No']);
const whyHosts = 'Due indirizzi sono riservati: host-id tutto a zero per la rete e tutto a uno per il broadcast.';

function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInteger(random, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateExercise(topicId, code, index) {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic) throw new Error('Argomento sconosciuto');
  const rng = exerciseRandom(code, index, topicId);
  const int = (a, b) => randomInteger(rng, a, b);
  const pick = values => values[int(0, values.length - 1)];
  const ip = randomAddress(rng);
  const data = splitAddress(ip);
  const c = data.className;
  const info = CLASS_INFO[c];
  let prompt = '', display = ip, fields = [], explanation = '', hint = '', rows;

  switch (topicId) {
    case 'validity': {
      const bytes = ip.split('.');
      const mode = rng() < 0.5 ? 0 : int(1, 6), pos = int(0, 3);
      const reasons = ['Quattro ottetti decimali compresi tra 0 e 255', 'Un ottetto supera 255', 'Numero di ottetti diverso da quattro', 'Separatore errato', 'Un ottetto contiene lettere', 'Un ottetto è negativo'];
      let reason = reasons[0];
      if (mode === 1) { bytes[pos] = String(int(256, 999)); reason = reasons[1]; }
      if (mode === 2) { bytes.pop(); reason = reasons[2]; }
      if (mode === 3) { bytes.push(String(int(0, 255))); reason = reasons[2]; }
      if (mode === 4) reason = reasons[3];
      if (mode === 5) { bytes[pos] = pick(['A', 'B', 'X']); reason = reasons[4]; }
      if (mode === 6) { bytes[pos] = String(-int(1, 99)); reason = reasons[5]; }
      display = mode === 4 ? `${bytes[0]}.${bytes[1]}.${bytes[2]},${bytes[3]}` : bytes.join('.');
      prompt = 'La stringa è scritta correttamente come indirizzo IPv4? Indica anche il motivo.';
      fields = [yesNo('valid', 'Formato valido?', mode === 0), field('reason', 'Motivazione', reason, reasons)];
      explanation = `${display}: ${reason.toLowerCase()}. La correttezza del formato è distinta dall’assegnabilità a un host.`;
      hint = 'Conta le parti separate da punti, poi controlla che ciascuna sia un numero da 0 a 255.';
      break;
    }
    case 'classes':
      prompt = 'Osserva il primo ottetto e indica la classe.';
      fields = [classField(c)];
      explanation = `Il primo ottetto è ${ip.split('.')[0]}: appartiene all’intervallo ${info.min}–${info.max}, classe ${c}.`;
      hint = 'A: 1–126. B: 128–191. C: 192–223.';
      break;
    case 'to-binary':
      prompt = 'Converti l’indirizzo in quattro ottetti binari da otto bit e indica la classe.';
      fields = [field('binary', 'Indirizzo binario', toBinary(ip), undefined, 'binary'), classField(c)];
      explanation = `${ip} = ${toBinary(ip)}. Ogni ottetto ha otto bit, compresi gli zeri iniziali. Classe ${c}.`;
      hint = 'Per ogni ottetto usa i pesi 128, 64, 32, 16, 8, 4, 2, 1.';
      break;
    case 'to-decimal':
      display = toBinary(ip);
      prompt = 'Converti l’indirizzo in notazione decimale puntata e indica la classe.';
      fields = [field('decimal', 'Indirizzo decimale', ip, undefined, 'ip'), classField(c)];
      explanation = `${display} = ${ip}. Somma i pesi dei bit a uno di ogni ottetto. Classe ${c}.`;
      hint = 'I pesi da sinistra a destra sono 128, 64, 32, 16, 8, 4, 2, 1.';
      break;
    case 'prefix-bits': {
      const first = Number(ip.split('.')[0]);
      display = first.toString(2).padStart(8, '0');
      prompt = 'Riconosci la classe dai bit iniziali, poi converti l’ottetto in decimale.';
      fields = [classField(c), field('value', 'Primo ottetto decimale', first, undefined, 'integer')];
      explanation = `I bit iniziali ${info.prefix} indicano la classe ${c}. L’ottetto ${display} vale ${first}.`;
      hint = 'La classe A inizia con 0, B con 10 e C con 110.';
      break;
    }
    case 'net-host':
      prompt = 'Indica la classe e separa net-id e host-id. Scrivi solo gli ottetti della rispettiva parte.';
      fields = [classField(c), field('net', 'Net-id', data.netId, undefined, 'part'), field('host', 'Host-id', data.hostId, undefined, 'part')];
      explanation = `Classe ${c}: ${info.octets} ottetti di net-id (${data.netId}) e ${4 - info.octets} di host-id (${data.hostId}).`;
      hint = 'A: N.H.H.H · B: N.N.H.H · C: N.N.N.H.';
      break;
    case 'same-network': {
      const mode = int(0, 2);
      let other = randomAddress(rng, mode === 2 ? pick(classes.filter(v => v !== c)) : c);
      if (mode === 0) other = [...ip.split('.').slice(0, info.octets), ...other.split('.').slice(info.octets)].join('.');
      if (mode === 1 && sameNetwork(ip, other)) {
        const bytes = other.split('.').map(Number);
        const pos = info.octets - 1;
        bytes[pos] = pos === 0 ? (bytes[pos] === info.max ? info.min : bytes[pos] + 1) : (bytes[pos] + 1) % 256;
        other = bytes.join('.');
      }
      display = `${ip}   ↔   ${other}`;
      prompt = 'I due indirizzi appartengono alla stessa classe? E alla stessa rete per classi?';
      fields = [yesNo('class-match', 'Stessa classe?', c === addressClass(other)), yesNo('network-match', 'Stessa rete?', sameNetwork(ip, other))];
      explanation = `Primo: classe ${c}, net-id ${data.netId}. Secondo: classe ${addressClass(other)}, net-id ${splitAddress(other).netId}. Stessa classe non significa necessariamente stessa rete.`;
      hint = 'Confronta il net-id completo, dopo aver identificato la classe di ciascun indirizzo.';
      break;
    }
    case 'grouping': {
      const networks = classes.flatMap(name => Array.from({length:2}, () => randomAddress(rng, name)));
      // Make each pair distinct in every class, even when a random net-id repeats.
      for (let i = 1; i < networks.length; i += 2) {
        if (splitAddress(networks[i-1]).netId !== splitAddress(networks[i]).netId) continue;
        const bytes = networks[i].split('.');
        const pos = CLASS_INFO[addressClass(networks[i])].octets - 1;
        bytes[pos] = pos === 0 ? (bytes[0] === '126' ? '1' : String(Number(bytes[0]) + 1)) : String((Number(bytes[pos]) + 1) % 256);
        networks[i] = bytes.join('.');
      }
      rows = shuffle(networks.flatMap(base => {
        const head = base.split('.').slice(0, CLASS_INFO[addressClass(base)].octets);
        const length = 4 - head.length;
        return Array.from({length:2}, (_, n) => [...head, ...Array.from({length}, (__, j) => j === length - 1 ? int(1, 120) + n * 128 : int(0, 255))].join('.'));
      }), rng);
      display = '12 indirizzi · 3 classi · 6 reti';
      prompt = 'Assegna a ogni indirizzo una classe e un net-id. Gli indirizzi con la stessa coppia classe/net-id formano un gruppo.';
      fields = rows.flatMap((value, n) => [field(`c${n}`, `${value} · classe`, addressClass(value), classes), field(`n${n}`, `${value} · net-id`, splitAddress(value).netId, undefined, 'part')]);
      explanation = networks.map(base => `${addressClass(base)}: net-id ${splitAddress(base).netId}`).join(' · ') + '. Per raggruppare, confronta soltanto gli ottetti del net-id.';
      hint = 'Trova prima la classe, poi conserva uno, due o tre ottetti del net-id.';
      break;
    }
    case 'capacity': {
      display = `Classe ${c} · esempio ${ip}`;
      prompt = 'Completa i dati della classe. Per A indica le reti utilizzabili, escludendo i primi ottetti 0 e 127.';
      const reasons = [whyHosts, 'Si sottraggono due indirizzi per il router e il server', 'Si sottraggono due indirizzi per il primo e l’ultimo computer'];
      fields = [field('net-bits', 'Bit del net-id (compresi i bit di classe)', info.networkBits, undefined, 'integer'), field('host-bits', 'Bit dell’host-id', info.hostBits, undefined, 'integer'), field('nets', 'Reti utilizzabili nel modello del documento', info.networks, undefined, 'integer'), field('hosts', 'Host assegnabili per rete', info.hosts, undefined, 'integer'), field('reason', 'Perché si sottrae 2 agli host?', whyHosts, reasons)];
      explanation = `Classe ${c}: net-id ${info.networkBits} bit, host-id ${info.hostBits} bit. Reti: ${info.networks}${c === 'A' ? ' (2^7 = 128 teoriche, meno 0 e 127)' : ` (2^${c === 'B' ? 14 : 21})`}. Host: 2^${info.hostBits} − 2 = ${info.hosts}. ${whyHosts}`;
      hint = 'Togli dai bit del net-id i bit iniziali fissi della classe per contare le reti. Per gli host usa 2 elevato ai bit host, meno 2.';
      break;
    }
    case 'network-broadcast':
      prompt = 'Trova classe, indirizzo di rete e indirizzo di broadcast usando il modello per classi.';
      fields = [classField(c), field('network', 'Indirizzo di rete', data.network, undefined, 'ip'), field('broadcast', 'Indirizzo di broadcast', data.broadcast, undefined, 'ip')];
      explanation = `Classe ${c}: conserva ${data.netId}. Per la rete porta gli ottetti host a 0 (${data.network}); per il broadcast a 255 (${data.broadcast}).`;
      hint = 'Mantieni il net-id. Metti tutti i bit host a zero per la rete, a uno per il broadcast.';
      break;
    case 'assignable': {
      const mode = int(0, 3);
      let value = mode === 0 ? data.network : mode === 1 ? data.broadcast : ip;
      if (mode === 3 && c !== 'C') {
        const bytes = ip.split('.'); bytes[3] = '255'; bytes[info.octets] = '1'; value = bytes.join('.');
      }
      const d = splitAddress(value);
      const reasons = ['Host-id né tutto a zero né tutto a uno', 'Host-id tutto a zero: indirizzo di rete', 'Host-id tutto a uno: broadcast'];
      const reason = value === d.network ? reasons[1] : value === d.broadcast ? reasons[2] : reasons[0];
      display = value;
      prompt = 'Nel modello per classi, questo è un indirizzo host assegnabile? Considera la parte host, senza altre restrizioni amministrative.';
      fields = [yesNo('assignable', 'Assegnabile secondo net-id/host-id?', d.assignable), field('reason', 'Motivazione', reason, reasons)];
      explanation = `Classe ${c}, host-id ${d.hostId}. ${reason}. Controlla tutta la parte host: un singolo ottetto a 255 non basta a indicare il broadcast.`;
      hint = 'Sono esclusi la parte host interamente a zero e quella interamente a uno.';
      break;
    }
    case 'choose-class': {
      const requested = pick([int(1,254), 254, 255, int(256,65534), 65534, 65535, int(65536,1000000)]);
      const count = int(1,6), answer = smallestClass(requested);
      display = `${count} ${count === 1 ? 'laboratorio' : 'laboratori'} · ${requested.toLocaleString('it-IT')} host ciascuno`;
      prompt = 'Ogni laboratorio deve essere una rete distinta. Quante reti servono? Qual è la classe più piccola sufficiente per ciascuna rete?';
      fields = [field('networks', 'Numero di reti distinte', count, undefined, 'integer'), classField(answer), field('capacity', 'Host disponibili in ciascuna rete della classe scelta', CLASS_INFO[answer].hosts, undefined, 'integer')];
      explanation = `Servono ${count} reti con net-id distinti. Per ${requested} host ciascuna, la classe minima è ${answer}: ${CLASS_INFO[answer].hosts} host per rete.`;
      hint = 'C ospita fino a 254 host; B fino a 65 534; A fino a 16 777 214. Conta i laboratori separatamente.';
      break;
    }
    case 'true-false': {
      const mode = int(0,3), truth = int(0,1) === 1;
      let statement, correct;
      if (mode === 0) {
        const stated = truth ? c : pick(classes.filter(v => v !== c));
        statement = `${ip} appartiene alla classe ${stated}.`;
        correct = `La classe corretta è ${c}: il primo ottetto è nell’intervallo ${info.min}–${info.max}.`;
      } else if (mode === 1) {
        const bits = truth ? info.networkBits : pick([8,16,24].filter(v => v !== info.networkBits));
        statement = `In classe ${c} il net-id occupa ${bits} bit.`;
        correct = `Il net-id di classe ${c} occupa ${info.networkBits} bit.`;
      } else if (mode === 2) {
        statement = `${truth ? data.broadcast : ip} è il broadcast della rete ${data.network}.`;
        // An accidentally generated all-ones host must not turn a false claim true.
        if (!truth) statement = `${data.network} è il broadcast della rete ${data.network}.`;
        correct = `Il broadcast della rete è ${data.broadcast}.`;
      } else {
        statement = `In classe ${c} gli host assegnabili per rete sono ${truth ? info.hosts : info.hosts + 2}.`;
        correct = `Gli host assegnabili sono ${info.hosts}: 2^${info.hostBits} − 2.`;
      }
      display = statement;
      prompt = 'Valuta l’affermazione. Scegli poi la spiegazione corretta, anche quando l’affermazione è vera.';
      fields = [field('truth', 'Vero o falso?', truth ? 'Vero' : 'Falso', ['Vero','Falso']), field('correction', 'Spiegazione corretta', correct, shuffle([correct, 'La classe si determina sempre dall’ultimo ottetto.', 'Gli indirizzi di rete e broadcast sono assegnabili agli host.'],rng))];
      explanation = `${truth ? 'Vero' : 'Falso'}. ${correct}`;
      hint = 'Verifica la regola applicabile: primo ottetto, lunghezza del net-id, bit host o capacità.';
      break;
    }
    case 'reconstruct':
      display = `Classe ${c} · net-id ${data.netId} · host-id ${data.hostId}`;
      prompt = 'Ricostruisci l’indirizzo IPv4 completo.';
      fields = [field('address', 'Indirizzo completo', ip, undefined, 'ip')];
      explanation = `Concatena gli ottetti del net-id e dell’host-id: ${data.netId} + ${data.hostId} → ${ip}.`;
      hint = 'L’indirizzo finale deve avere quattro ottetti, separati da punti.';
      break;
    case 'find-error': {
      const mode = int(0,2);
      let correct, options;
      if (mode === 0) {
        const wrong = pick(classes.filter(v => v !== c));
        display = `«${ip} è di classe ${wrong}.»`;
        correct = `La classe è ${c}, non ${wrong}.`;
        options = [correct, 'La classe dipende dal numero di computer collegati.', 'La classe dipende dall’ultimo ottetto.'];
      } else if (mode === 1) {
        const bytes = ip.split('.'); bytes[int(0,3)] = String(int(256,999));
        display = `«${bytes.join('.')} è un IPv4 valido di classe ${c}.»`;
        correct = 'Non è un IPv4 valido: un ottetto supera 255.';
        options = [correct, 'È valido perché ha quattro parti.', 'È un indirizzo speciale multicast.'];
      } else {
        display = `«${data.network} è assegnabile al primo computer della rete.»`;
        correct = `È l’indirizzo di rete; il primo host è ${data.network.slice(0,data.network.lastIndexOf('.')+1)}1.`;
        options = [correct, 'È il broadcast: tutti i bit host sono a uno.', 'È sempre un indirizzo di loopback.'];
      }
      prompt = 'Individua l’errore e scegli la correzione appropriata.';
      fields = [field('correction', 'Correzione', correct, shuffle(options,rng))];
      explanation = correct;
      hint = 'Verifica prima il formato, poi la classe e infine il significato della parte host.';
      break;
    }
    case 'special': {
      const mode = int(0,4);
      const value = mode === 0 ? `${int(224,239)}.${int(0,255)}.${int(0,255)}.${int(0,255)}` : mode === 1 ? `${int(240,254)}.${int(0,255)}.${int(0,255)}.${int(0,255)}` : mode === 2 ? '255.255.255.255' : mode === 3 ? `127.${int(0,255)}.${int(0,255)}.${int(1,254)}` : '0.0.0.0';
      const labels = ['Multicast', 'Intervallo riservato, storicamente sperimentale', 'Broadcast limitato', 'Loopback: il computer stesso', 'Indirizzo non specificato'];
      display = value;
      prompt = 'Indica la classe storica per intervallo e il significato particolare. 0 e 127 sono riservati all’interno dell’intervallo A.';
      fields = [field('class', 'Classe storica', addressClass(value), ['A','B','C','D','E']), field('purpose', 'Significato', labels[mode], labels)];
      explanation = `${value}: classe storica ${addressClass(value)}; ${labels[mode].toLowerCase()}. Le classi D ed E non hanno la separazione net-id/host-id delle classi A/B/C.`;
      hint = '224–239: D. 240–255: E. 127: loopback. Tutti i bit a uno: broadcast limitato.';
      break;
    }
    case 'cidr-mask': {
      const prefix = int(8,30), reverse = rng() < .5;
      display = reverse ? prefixMask(prefix) : `/${prefix}`;
      prompt = reverse ? 'Converti la subnet mask in un prefisso CIDR.' : 'Converti il prefisso CIDR nella subnet mask decimale puntata.';
      fields = reverse ? [field('prefix', 'Prefisso CIDR (esempio /24)', `/${prefix}`, undefined, 'prefix')] : [field('mask', 'Subnet mask', prefixMask(prefix), undefined, 'ip')];
      explanation = `/${prefix} corrisponde a ${prefixMask(prefix)}: ${prefix} bit a uno seguiti da ${32-prefix} bit a zero.`;
      hint = 'Ottetti pieni: 255. Per un ottetto parziale somma da sinistra 128, 64, 32, 16, 8, 4, 2, 1.';
      break;
    }
    case 'cidr-network':
    case 'cidr-range': {
      const prefix = int(12,30), d = subnetInfo(ip,prefix);
      display = `${ip}/${prefix}`;
      prompt = topicId === 'cidr-network' ? 'Calcola rete, broadcast e maschera applicando il prefisso indicato, indipendentemente dalla classe storica.' : 'Calcola il primo e l’ultimo host assegnabile e il numero totale di host. Considera una LAN ordinaria.';
      fields = topicId === 'cidr-network' ? [field('network','Indirizzo di rete',d.network,undefined,'ip'),field('broadcast','Broadcast',d.broadcast,undefined,'ip'),field('mask','Subnet mask',d.mask,undefined,'ip')] : [field('first','Primo host',d.firstHost,undefined,'ip'),field('last','Ultimo host',d.lastHost,undefined,'ip'),field('hosts','Host assegnabili',d.hosts,undefined,'integer')];
      explanation = `/${prefix}: blocco di ${d.size} indirizzi. Rete ${d.network}, broadcast ${d.broadcast}; host da ${d.firstHost} a ${d.lastHost}, per un totale di ${d.hosts}.`;
      hint = `Ci sono ${32-prefix} bit host. La dimensione del blocco è 2^${32-prefix}; i due estremi identificano rete e broadcast.`;
      break;
    }
    case 'cidr-compare': {
      const prefix = int(16,29), first = subnetInfo(ip,prefix), same = rng() < .5;
      const start = ipNumber(first.network);
      const second = numberIp(same ? start + int(1,first.size-2) : (start + first.size) % 4294967296);
      const d = subnetInfo(second,prefix);
      display = `${ip}/${prefix}   ↔   ${second}/${prefix}`;
      prompt = 'I due indirizzi appartengono alla stessa sottorete con il prefisso indicato? Trova entrambi gli indirizzi di rete.';
      fields = [yesNo('same','Stessa sottorete?',same),field('network1','Rete del primo indirizzo',first.network,undefined,'ip'),field('network2','Rete del secondo indirizzo',d.network,undefined,'ip')];
      explanation = `Con /${prefix}, il primo indirizzo appartiene a ${first.network}, il secondo a ${d.network}. Le reti ${same ? 'coincidono' : 'sono diverse'}.`;
      hint = 'Applica la maschera a ciascun indirizzo; confronta i due risultati.';
      break;
    }
    case 'cidr-size': {
      const hosts = int(2,4000), prefix = prefixForHosts(hosts);
      display = `${hosts} host richiesti`;
      prompt = 'Scegli il prefisso più lungo (blocco più piccolo) che ospita tutti gli host in una LAN ordinaria.';
      fields = [field('prefix','Prefisso CIDR',`/${prefix}`,undefined,'prefix'),field('mask','Subnet mask',prefixMask(prefix),undefined,'ip'),field('hosts','Host assegnabili nel blocco scelto',2**(32-prefix)-2,undefined,'integer')];
      explanation = `Servono almeno ${hosts+2} indirizzi contando rete e broadcast. La potenza di due minima sufficiente è ${2**(32-prefix)}: /${prefix}, maschera ${prefixMask(prefix)}, ${2**(32-prefix)-2} host.`;
      hint = 'Aggiungi due al numero di host, poi cerca la potenza di due minima sufficiente.';
      break;
    }
    case 'flsm': {
      const prefix = int(16,24), borrowed = int(1,Math.min(5,30-prefix)), childPrefix = prefix + borrowed;
      const parent = subnetInfo(ip,prefix), count = 2**borrowed, nth = int(1,count);
      const child = subnetInfo(numberIp(ipNumber(parent.network)+(nth-1)*2**(32-childPrefix)),childPrefix);
      display = `${parent.network}/${prefix} → ${count} sottoreti uguali`;
      prompt = `Dividi la rete in ${count} sottoreti uguali. Calcola il nuovo prefisso, la capacità di ciascuna e rete/broadcast della sottorete numero ${nth} (la prima è la numero 1).`;
      fields = [field('prefix','Nuovo prefisso CIDR',`/${childPrefix}`,undefined,'prefix'),field('hosts','Host per sottorete',child.hosts,undefined,'integer'),field('network',`Rete della sottorete ${nth}`,child.network,undefined,'ip'),field('broadcast',`Broadcast della sottorete ${nth}`,child.broadcast,undefined,'ip')];
      explanation = `Prendi ${borrowed} bit dalla parte host: 2^${borrowed} = ${count} sottoreti /${childPrefix}. Passo ${child.size} indirizzi; la sottorete ${nth} inizia a ${child.network} e termina a ${child.broadcast}. Host per sottorete: ${child.hosts}. Si utilizza anche la sottorete zero.`;
      hint = 'Per ottenere 2^k sottoreti, aumenta il prefisso di k. La prima sottorete parte dall’indirizzo della rete originale.';
      break;
    }
    case 'vlsm': {
      const base = `10.${int(0,255)}.${int(0,63)*4}.0`, requested = [int(100,200),int(30,60),int(5,25)];
      const allocations = allocateVlsm(base,22,requested);
      display = `${base}/22 · ${requested.map((n,i)=>`LAN ${i+1}: ${n} host`).join(' · ')}`;
      prompt = 'Assegna le LAN in ordine dalla richiesta maggiore alla minore. Parti dall’inizio del blocco e usa ogni volta il primo blocco libero allineato, della dimensione minima sufficiente.';
      fields = allocations.flatMap(a => [field(`p${a.index}`,`LAN ${a.index+1} · prefisso`,`/${a.prefix}`,undefined,'prefix'),field(`n${a.index}`,`LAN ${a.index+1} · rete`,a.network,undefined,'ip'),field(`b${a.index}`,`LAN ${a.index+1} · broadcast`,a.broadcast,undefined,'ip')]);
      explanation = allocations.map(a=>`LAN ${a.index+1}: ${a.network}/${a.prefix}, broadcast ${a.broadcast}, ${a.hosts} host disponibili per ${a.hosts >= requested[a.index] ? requested[a.index] : '?'} richiesti`).join('. ') + '. I blocchi non si sovrappongono e restano nella rete /22.';
      hint = 'Per ogni LAN calcola host + 2, arrotonda alla potenza di due superiore e assegna prima il blocco più grande.';
      break;
    }
    case 'private': {
      const first = pick([10,11,172,192]);
      const second = first === 172 ? pick([15,16,31,32,int(16,31)]) : first === 192 ? pick([168,169]) : int(0,255);
      const value = `${first}.${second}.${int(0,255)}.${int(1,254)}`;
      const privateValue = isPrivate(value);
      const reasons = ['Rientra nel blocco privato 10.0.0.0–10.255.255.255', 'Rientra nel blocco privato 172.16.0.0–172.31.255.255', 'Rientra nel blocco privato 192.168.0.0–192.168.255.255', 'È fuori dai tre blocchi privati RFC 1918'];
      const reason = !privateValue ? reasons[3] : first === 10 ? reasons[0] : first === 172 ? reasons[1] : reasons[2];
      display = value;
      prompt = 'Questo indirizzo è privato (RFC 1918) oppure pubblico? Gli esempi pubblici di questa sezione escludono gli indirizzi speciali.';
      fields = [field('scope', 'Privato o pubblico?', privateValue ? 'Privato' : 'Pubblico', ['Privato','Pubblico']), field('reason', 'Motivazione', reason, reasons)];
      explanation = `${value}: ${privateValue ? 'privato' : 'pubblico'}. ${reason}.`;
      hint = 'Memorizza 10.*, 172.16.*–172.31.* e 192.168.*.';
      break;
    }
  }
  return { id:`v1:${code}:${index}:${topicId}`, topicId, title:topic.title, prompt, display, fields, explanation, hint, rows };
}

export function normalizeAnswer(value, kind = 'text') {
  let result = String(value ?? '').normalize('NFC').trim();
  if (kind === 'integer') {
    result = result.replace(/[\s\u00a0]/g, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(result)) result = result.replace(/\./g, '');
  }
  if (kind === 'prefix') result = result.replace(/^\//,'').trim();
  if (['ip','part','binary'].includes(kind)) result = result.replace(/\s/g, '');
  return result.toLocaleLowerCase('it-IT');
}

export function gradeExercise(exercise, answers) {
  const details = exercise.fields.map(f => ({ key:f.key, label:f.label, expected:f.answer, actual:String(answers[f.key] ?? ''), correct:normalizeAnswer(answers[f.key],f.kind) === normalizeAnswer(f.answer,f.kind) }));
  const correct = details.filter(f => f.correct).length;
  return { correct:correct === details.length, correctFields:correct, totalFields:details.length, fraction:correct / details.length, details };
}

export function topicAt(code, index, selectedTopics) {
  const selected = TOPICS.filter(t => selectedTopics.includes(t.id)).map(t => t.id);
  if (!selected.length) throw new Error('Seleziona almeno un argomento');
  // A shuffled bag ensures all selected topics appear before any topic repeats.
  const cycle = Math.floor(index / selected.length);
  const order = shuffle(selected, exerciseRandom(code, cycle, 'topic-order'));
  return order[index % selected.length];
}
