// The exercises use historical classful addressing, as in the source workbook.
export const CLASS_INFO = Object.freeze({
  A: { min: 1, max: 126, octets: 1, prefix: '0', networkBits: 8, hostBits: 24, networks: 126, theoreticalNetworks: 128, hosts: 16777214 },
  B: { min: 128, max: 191, octets: 2, prefix: '10', networkBits: 16, hostBits: 16, networks: 16384, theoreticalNetworks: 16384, hosts: 65534 },
  C: { min: 192, max: 223, octets: 3, prefix: '110', networkBits: 24, hostBits: 8, networks: 2097152, theoreticalNetworks: 2097152, hosts: 254 }
});

export function parseIPv4(value) {
  const parts = String(value).trim().split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
  return parts.map(Number);
}

export function addressClass(address) {
  const bytes = Array.isArray(address) ? address : parseIPv4(address);
  if (!bytes || bytes.length !== 4 || bytes.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  const first = bytes[0];
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  return first < 240 ? 'D' : 'E';
}

export function splitAddress(address) {
  const bytes = Array.isArray(address) ? address : parseIPv4(address);
  const className = addressClass(bytes);
  const info = CLASS_INFO[className];
  if (!info || bytes[0] === 0 || bytes[0] === 127) return null;
  const head = bytes.slice(0, info.octets);
  const tail = bytes.slice(info.octets);
  return {
    className,
    netId: head.join('.'),
    hostId: tail.join('.'),
    network: [...head, ...tail.map(() => 0)].join('.'),
    broadcast: [...head, ...tail.map(() => 255)].join('.'),
    assignable: !tail.every(n => n === 0) && !tail.every(n => n === 255)
  };
}

export function sameNetwork(left, right) {
  const a = splitAddress(left), b = splitAddress(right);
  return Boolean(a && b && a.className === b.className && a.netId === b.netId);
}

export function toBinary(address) {
  const bytes = parseIPv4(address);
  return bytes ? bytes.map(n => n.toString(2).padStart(8, '0')).join('.') : null;
}

export function fromBinary(address) {
  const parts = String(address).trim().split('.');
  return parts.length === 4 && parts.every(p => /^[01]{8}$/.test(p))
    ? parts.map(p => parseInt(p, 2)).join('.') : null;
}

export function isPrivate(address) {
  const p = parseIPv4(address);
  return Boolean(p && (p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168)));
}

export function smallestClass(hosts) {
  if (!Number.isInteger(hosts) || hosts < 1) return null;
  return ['C', 'B', 'A'].find(c => CLASS_INFO[c].hosts >= hosts) ?? null;
}

// All state is local to an exercise. Feedback, score and timing cannot change
// later exercises in a shared sequence. Keep the version in shared codes.
export const GENERATOR_VERSION = 1;
export function seededRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) {
    state ^= char.codePointAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function exerciseRandom(code, index, topic) {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('Indice esercizio non valido');
  return seededRandom(`ipv4-v${GENERATOR_VERSION}|${code}|${index}|${topic}`);
}

export function randomInteger(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

export function randomAddress(random, className) {
  const c = className ?? ['A', 'B', 'C'][randomInteger(random, 0, 2)];
  const info = CLASS_INFO[c];
  if (!info) throw new Error('Classe non supportata');
  return [randomInteger(random, info.min, info.max), ...Array.from({ length: 3 }, () => randomInteger(random, 0, 255))].join('.');
}
