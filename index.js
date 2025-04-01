import { open } from './src/utils/open.js';
import { getPeers } from './src/tracker.js';

const torrent = open('HL2.torrent');

getPeers(torrent, peers => {
  console.log(peers);
});
