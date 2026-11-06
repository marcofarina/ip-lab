import { parseIPv4 } from './ipv4.mjs';

export function ipNumber(ip) {
  const bytes = parseIPv4(ip);
  if (!bytes) throw new Error('IPv4 non valido');
  return bytes.reduce((n, byte) => n * 256 + byte, 0);
}

export function numberIp(value) {
  if (!Number.isInteger(value) || value < 0 || value > 4294967295) throw new Error('IPv4 fuori intervallo');
  return [24,16,8,0].map(shift => Math.floor(value / 2 ** shift) % 256).join('.');
}

export function prefixMask(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('Prefisso non valido');
  return numberIp(4294967296 - 2 ** (32 - prefix));
}

export function maskPrefix(mask) {
  const bytes = parseIPv4(mask);
  if (!bytes) return null;
  const bits = bytes.map(n => n.toString(2).padStart(8,'0')).join('');
  return /^1*0*$/.test(bits) ? bits.replace(/0/g,'').length : null;
}

export function subnetInfo(ip, prefix) {
  prefixMask(prefix);
  const value = ipNumber(ip), size = 2 ** (32 - prefix);
  const network = Math.floor(value / size) * size, last = network + size - 1;
  return {
    prefix, mask:prefixMask(prefix), size,
    network:numberIp(network), broadcast:prefix <= 30 ? numberIp(last) : null,
    firstHost:numberIp(prefix <= 30 ? network + 1 : network),
    lastHost:numberIp(prefix <= 30 ? last - 1 : last),
    hosts:prefix <= 30 ? size - 2 : size,
    // /31 assumes a point-to-point link (RFC 3021); /32 is one host route.
    special:prefix === 31 ? 'point-to-point' : prefix === 32 ? 'host-route' : null
  };
}

export function prefixForHosts(hosts) {
  if (!Number.isInteger(hosts) || hosts < 1 || hosts > 4294967294) return null;
  return 32 - Math.ceil(Math.log2(hosts + 2));
}

export function allocateVlsm(parentIp, parentPrefix, requirements) {
  const parent = subnetInfo(parentIp, parentPrefix);
  let cursor = ipNumber(parent.network);
  const end = cursor + parent.size;
  const ordered = requirements.map((hosts,index) => ({hosts,index,prefix:prefixForHosts(hosts)})).sort((a,b) => b.hosts - a.hosts || a.index - b.index);
  return ordered.map(item => {
    if (item.prefix === null) throw new Error('Richiesta host non valida');
    const size = 2 ** (32 - item.prefix);
    cursor = Math.ceil(cursor / size) * size;
    if (cursor + size > end) throw new Error('Spazio della rete insufficiente');
    const result = {...item, ...subnetInfo(numberIp(cursor),item.prefix)};
    cursor += size;
    return result;
  });
}
