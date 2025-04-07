import { URL } from 'url';
import { announceUDP } from './announce/udp.js';
import { announceHTTP } from './announce/http.js';

export function getPeers(torrent) {
  return new Promise(resolve => {
    const torrentUrlObj = new URL(new TextDecoder().decode(torrent.announce));
    console.log('Announce URL:', { torrentUrlObj });

    if (torrentUrlObj.protocol === 'udp:') {
      announceUDP(torrent, torrentUrlObj, resolve);
    } else if (
      torrentUrlObj.protocol === 'http:' ||
      torrentUrlObj.protocol === 'https:'
    ) {
      announceHTTP(torrent, torrentUrlObj, resolve);
    }
  });
}
