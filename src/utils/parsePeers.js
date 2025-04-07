export function group(iterable, groupSize) {
  let groups = [];
  for (let i = 0; i < iterable.length; i += groupSize) {
    groups.push(iterable.slice(i, i + groupSize));
  }
  return groups;
}

export function parsePeers(buffer) {
  const groups = group(buffer, 6);
  return groups.map(address => ({
    ip: Array.from(address.slice(0, 4)).join('.'),
    port: address.readUInt16BE(4),
  }));
}
