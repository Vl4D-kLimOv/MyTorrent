import { open } from './src/utils/open.js';
import { getPeers } from './src/tracker.js';

const torrent = open('torrents/RDR2-S.torrent');

getPeers(torrent).then(peers => console.log(peers));
