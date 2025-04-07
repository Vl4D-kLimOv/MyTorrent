import net from 'net';
import { Buffer } from 'buffer';
import { getPeers } from './tracker';
import { buildHandshake } from './messages';

export function download(torrent) {
  getPeers(torrent).then(peers => {
    peers.forEach(downloadFromPeer);
  });
}

function downloadFromPeer(peer) {
  const socket = new net.Socket();
  socket.connect(peer.port, peer.ip, () => {
    socket.write(buildHandshake(torrent));
  });
  socket.on('error', console.log);
  onWholeMsg(socket, () => {
    msgHandler(msg, socket);
  });
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

function msgHandler(msg, socket) {
  if (isHandshake(msg)) socket.write(message.buildInterested());
}

function isHandshake(msg) {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.toString('utf8', 1) === 'BitTorrent protocol'
  );
}
