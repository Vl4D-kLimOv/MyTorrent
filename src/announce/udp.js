import dgram from 'dgram';
import { Buffer } from 'buffer';
import { udpSend } from '../utils/udpSend.js';
import crypto from 'crypto';
import { infoHash, size } from '../parser.js';
import { genId } from '../utils/genId.js';
import { retrySend } from '../utils/retrySend.js';
import { parsePeers } from '../utils/parsePeers.js';

export function announceUDP(torrent, torrentUrlObj, resolve) {
  const socket = dgram.createSocket('udp4');
  let timeout = retrySend(() =>
    udpSend(socket, buildConnectReq(), torrentUrlObj)
  );

  socket.on('message', response => {
    if (respType(response) === 'connect') {
      clearTimeout(timeout);
      const connResp = parseConnectResp(response);
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      timeout = retrySend(() => udpSend(socket, announceReq, torrentUrlObj));
    } else if (respType(response) === 'announce') {
      clearTimeout(timeout);
      const announceResp = parseAnnounceResp(response);
      socket.close();
      resolve(announceResp.peers);
    }
  });
}

function buildConnectReq() {
  const buf = Buffer.alloc(16);
  // connection id
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);
  // action
  buf.writeUInt32BE(0, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  return buf;
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return 'connect';
  if (action === 1) return 'announce';
}

function parseConnectResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8),
  };
}

function buildAnnounceReq(connId, torrent, port = 6881) {
  const buf = Buffer.allocUnsafe(98);
  // connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  infoHash(torrent).copy(buf, 16);
  // peer id
  genId().copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  size(torrent).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event (0: none; 1: completed; 2: started; 3: stopped)
  buf.writeUInt32BE(0, 80);
  // ip address (0 default)
  buf.writeUInt32BE(0, 84);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want (-1 default)
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);
  return buf;
}

function parseAnnounceResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leecher: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: parsePeers(resp.slice(20)),
  };
}
