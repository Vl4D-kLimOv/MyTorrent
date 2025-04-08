import net from 'net';
import { Buffer } from 'buffer';
import { getPeers } from './tracker';
import { buildHandshake } from './messages';
import { buildInterested } from './messages';
import { parseMessage } from './messages';
import { Pieces } from './pieces';

export function download(torrent) {
  const pieces = new Pieces(torrent.info.pieces.length / 20);
  getPeers(torrent).then(peers => {
    peers.forEach(peer => downloadFromPeer(peer, torrent, pieces));
  });
}

function downloadFromPeer(peer, torrent, pieces) {
  const socket = new net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(buildHandshake(torrent));
  });
  const queue = { choked: true, queue: [] };
  onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue));
}

function onWholeMsg(socket, callback) {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on('data', recvBuf => {
    const msgLen = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.subarray(0, msgLen()));
      savedBuf = savedBuf.subarray(msgLen());
      handshake = false;
    }
  });
}

function msgHandler(msg, socket, pieces, queue) {
  if (isHandshake(msg)) {
    socket.write(buildInterested());
  } else {
    const m = parseMessage(msg);

    if (m.id === 0) chokeHandler(socket);
    if (m.id === 1) unchokeHandler(socket, pieces, queue);
    if (m.id === 4) haveHandler(m.payload, socket, pieces, queue);
    if (m.id === 5) bitfieldHandler(m.payload);
    if (m.id === 7) pieceHandler(m.payload, socket, pieces, queue);
  }
}

function isHandshake(msg) {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.toString('utf8', 1) === 'BitTorrent protocol'
  );
}

function chokeHandler(socket) {
  socket.end();
}

function unchokeHandler(socket, pieces, queue) {
  queue.choked = false;
  requestPiece(socket, pieces, queue);
}

function haveHandler(payload, socket, pieces, queue) {
  // ...
  const pieceIndex = payload.readUInt32BE(0);
  queue.push(pieceIndex);
  if (queue.length === 1) {
    requestPiece(socket, pieces, queue);
  }
}

function bitfieldHandler(payload) {
  //...
}

function pieceHandler(payload, socket, pieces, queue) {
  // ...
  queue.shift();
  requestPiece(socket, pieces, queue);
}

function requestPiece(socket, pieces, queue) {
  if (queue.choked) return null;

  while (queue.queue.length) {
    const pieceIndex = queue.shift();
    if (pieces.needed(pieceIndex)) {
      socket.write(message.buildRequest(pieceIndex));
      pieces.addRequested(pieceIndex);
      break;
    }
  }
}
