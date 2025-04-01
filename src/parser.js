import bencode from 'bencode';
import crypto from 'crypto';
import { toBufferBE } from 'bigint-buffer';

export function infoHash(torrent) {
  return crypto
    .createHash('sha1')
    .update(bencode.encode(torrent.info))
    .digest();
}

export function size(torrent) {
  const size = torrent.info.files
    ? torrent.info.files
        .map(file => file.length)
        .reduce((acc, curr) => acc + curr, 0)
    : torrent.info.length;
  return toBufferBE(BigInt(size), 8);
}
