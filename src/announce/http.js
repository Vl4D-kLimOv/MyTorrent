import { Buffer } from 'buffer';
import { infoHash, size } from '../parser.js';
import { genId } from '../utils/genId.js';
import { retrySend } from '../utils/retrySend.js';
import { parsePeers } from '../utils/parsePeers.js';
import http from 'http';
import https from 'https';
import bencode from 'bencode';

export function announceHTTP(torrent, torrentUrlObj, resolve) {
  const client = torrentUrlObj.protocol === 'https:' ? https : http;
  const options = buildAnnounceReq(torrent, torrentUrlObj);
  const timeout = retrySend(() => {
    const req = client.request(options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        const announceResp = parseAnnounceResp(body);
        clearTimeout(timeout);
        resolve(announceResp.peers);
      });
    });
    req.end();
  });
}

function buildAnnounceReq(torrent, torrentUrlObj, port = 6881) {
  const qs =
    `info_hash=${percentEncode(infoHash(torrent))}` +
    `&peer_id=${percentEncode(genId())}` +
    `&port=${port}` +
    `&uploaded=0` +
    `&downloaded=0` +
    `&left=${size(torrent).readBigUInt64BE(0).toString()}` +
    `&event=started`;
  const options = {
    hostname: torrentUrlObj.hostname,
    port:
      torrentUrlObj.port || (torrentUrlObj.protocol === 'https:' ? 443 : 80),
    path: torrentUrlObj.pathname + '?' + qs,
    method: 'GET',
    headers: {
      'User-Agent': 'BitTorrent/7.10.5',
    },
  };
  return options;
}

function parseAnnounceResp(resp) {
  try {
    const decoded = bencode.decode(resp);

    if (!decoded || !decoded.peers) {
      console.error('No peers found', decoded);
      return { peers: [] };
    }

    let peers = [];
    if (decoded.peers instanceof Uint8Array || Buffer.isBuffer(decoded.peers)) {
      peers = parsePeers(Buffer.from(decoded.peers));
    }
    return { peers };
  } catch (e) {
    console.error('Failed to decode response', e);
    return { peers: [] };
  }
}

function percentEncode(buffer) {
  let encoded = '';
  for (let i = 0; i < buffer.length; i++) {
    encoded += '%' + buffer[i].toString(16).padStart(2, '0');
  }
  return encoded;
}
