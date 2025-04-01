import dgram from 'dgram';
import { Buffer } from 'buffer';
import { URL } from 'url';
import { udpSend } from './utils/udpSend.js';
import crypto from 'crypto';
import { group } from './utils/group.js';
import { infoHash, size } from './parser.js';
import { genId } from './utils/genId.js';

export function getPeers(torrent) {
  return new Promise(resolve => {
    const socket = dgram.createSocket('udp4');
    const torrentUrlObj = new URL(new TextDecoder().decode(torrent.announce));

    udpSend(socket, buildConnectReq(), torrentUrlObj);

    socket.on('message', response => {
      if (respType(response) === 'connect') {
        const connResp = parseConnectResp(response);
        const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
        udpSend(socket, announceReq, torrentUrlObj);
      } else if (respType(response) === 'announce') {
        const announceResp = parseAnnounceResp(response);
        resolve(announceResp.peers);
      }
    });
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
  // event
  buf.writeUInt32BE(0, 80); // 0: none; 1: completed; 2: started; 3: stopped
  // ip address
  buf.writeUInt32BE(0, 84); // 0 default
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want
  buf.writeInt32BE(-1, 92); // -1 default
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
    peers: group(resp.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4),
      };
    }),
  };
}
